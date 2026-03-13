import { Consumer, Producer, RtpParameters } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import usePlayersStore from "@/common/store/playerStore";
import { AvailabilityStatus } from "@/game/player/_enums";
import useAudioStore from "@/common/store/audioStore";
import type { AudioQualityMode } from "@/common/store/audioStore";
import { logger } from "@/common/utils/logger";

interface ConsumerServerResponse {
    id: string;
    producerId: string;
    kind: "audio" | "video";
    rtpParameters: RtpParameters;
}

interface ZonePlayer {
    socketId: string;
    playerId: number;
    name: string;
    producerIds: string[];
}

interface PlayerJoinedZoneData {
    socketId: string;
    playerId: string;
    zone: string;
    producerIds: string[];
    name: string;
}

export class AudioChat {
    public static instance: AudioChat | null = null;
    public isMuted: boolean = true;

    private sfuService: MediaTransportService;
    private audioProducer?: Producer;
    private audioElementsSetter!: (audioElement: HTMLAudioElement) => void;
    private audioContext: AudioContext | null = null;
    private audioDestination?: MediaStreamAudioDestinationNode;
    private consumers: Map<string, Consumer> = new Map();
    private isInFocusMode: boolean = false;
    private currentStream: MediaStream | null = null;
    private currentDeviceId: string | null = null;
    private currentZone: string | null = null;

    public audioElements: Map<string, HTMLAudioElement> = new Map();
    public audioOwnerMap: Record<string, string> = {};
    private audioElementUpdateCallback: (() => void) | null = null;

    private outputAudioContext: AudioContext | null = null;
    private gainNodes: Map<string, GainNode> = new Map();
    private mediaStreamSources: Map<string, MediaStreamAudioSourceNode> =
        new Map();

    private producerToConsumerMap: Map<string, string> = new Map();
    private consumingInFlight = new Set<string>();
    private socketToProducersMap: Map<string, string[]> = new Map();
    private watchingNewProducers = false;
    /** Track music-bot producer IDs for separate gain/processing */
    private musicBotProducerIds = new Set<string>();

    /** Maps producerId → userId for reliable active-speaker lookup */
    private audioProducerUserIdMap: Map<string, number> = new Map();

    /** AnalyserNodes for active-speaker detection (keyed by consumerId) */
    private analyserNodes: Map<string, AnalyserNode> = new Map();
    /** AnalyserNode tapped into local mic processing chain */
    private localAnalyser: AnalyserNode | null = null;

    constructor() {
        logger.log("initializeAudioChat");
        this.sfuService = MediaTransportService.getInstance();
        logger.log("AudioChat initialized");
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new AudioChat();
        }
        return this.instance;
    }

    public initializeAudioChat(
        setter: (audioElement: HTMLAudioElement) => void,
        updateCallback?: () => void,
    ) {
        this.audioElementsSetter = setter;
        if (updateCallback) {
            this.audioElementUpdateCallback = updateCallback;
        }
        this.watchFocusModeChanges();
        this.watchZoneEvents();
    }

    private watchZoneEvents(): void {
        this.sfuService.socket.on(
            "zone-players",
            async (data: { zone: string | null; players: ZonePlayer[] }) => {
                logger.log(
                    `Entered zone ${data.zone} with ${data.players.length} players`,
                );

                if (data.zone === null) {
                    this.closeAllAudioConsumers();
                    this.currentZone = null;
                    return;
                }

                this.currentZone = data.zone;

                for (const player of data.players) {
                    this.socketToProducersMap.set(
                        player.socketId,
                        player.producerIds,
                    );
                    for (const producerId of player.producerIds) {
                        this.audioOwnerMap[producerId] = player.name;
                        await this.consumeProducer(producerId);
                    }
                }
            },
        );

        this.sfuService.socket.on(
            "player-left-zone",
            (data: { socketId: string; playerId: string; zone: string }) => {
                logger.log(`Player ${data.playerId} left zone ${data.zone}`);
                this.closeConsumersForSocket(data.socketId);
            },
        );

        this.sfuService.socket.on(
            "player-joined-zone",
            async (data: PlayerJoinedZoneData) => {
                logger.log(`Player ${data.playerId} joined zone ${data.zone}`);

                if (data.producerIds && data.producerIds.length > 0) {
                    this.socketToProducersMap.set(
                        data.socketId,
                        data.producerIds,
                    );
                    for (const producerId of data.producerIds) {
                        this.audioOwnerMap[producerId] = data.name;
                        await this.consumeProducer(producerId);
                    }
                }
            },
        );
    }

    private closeAllAudioConsumers(): void {
        for (const [producerId] of this.producerToConsumerMap) {
            this.closeConsumerByProducerId(producerId);
        }
        this.socketToProducersMap.clear();
    }

    private closeConsumersForSocket(socketId: string): void {
        const producerIds = this.socketToProducersMap.get(socketId) || [];

        for (const producerId of producerIds) {
            this.closeConsumerByProducerId(producerId);
        }

        this.socketToProducersMap.delete(socketId);
    }

    private closeConsumerByProducerId(producerId: string): void {
        const consumerId = this.producerToConsumerMap.get(producerId);
        if (!consumerId) return;

        const consumer = this.consumers.get(consumerId);
        if (consumer && !consumer.closed) {
            consumer.close();
        }
        this.consumers.delete(consumerId);

        const source = this.mediaStreamSources.get(consumerId);
        if (source) {
            source.disconnect();
            this.mediaStreamSources.delete(consumerId);
        }

        const gainNode = this.gainNodes.get(consumerId);
        if (gainNode) {
            gainNode.disconnect();
            this.gainNodes.delete(consumerId);
        }

        const analyser = this.analyserNodes.get(consumerId);
        if (analyser) {
            analyser.disconnect();
            this.analyserNodes.delete(consumerId);
        }

        const audioEl = this.audioElements.get(consumerId);
        if (audioEl) {
            audioEl.srcObject = null;
            audioEl.remove();
            this.audioElements.delete(consumerId);
        }

        delete this.audioOwnerMap[producerId];
        this.audioProducerUserIdMap.delete(producerId);
        this.producerToConsumerMap.delete(producerId);

        if (this.audioElementUpdateCallback) {
            this.audioElementUpdateCallback();
        }

        logger.log(`Closed consumer for producer ${producerId}`);
    }

    /**
     * Resume all AudioContexts (required for Firefox autoplay policy)
     * Call this on user interaction (click, key press, etc.)
     */
    public async resumeAudioContexts(): Promise<void> {
        const contexts = [this.audioContext, this.outputAudioContext].filter(
            (ctx): ctx is AudioContext => ctx !== null,
        );

        for (const ctx of contexts) {
            if (ctx.state === "suspended") {
                try {
                    await ctx.resume();
                    logger.log("AudioContext resumed successfully");
                } catch (error) {
                    console.error("Failed to resume AudioContext:", error);
                }
            }
        }
    }

    public async getAvailableMicrophones(): Promise<MediaDeviceInfo[]> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            stream.getTracks().forEach((track) => track.stop());
        } catch (error) {
            console.error("Failed to get microphone permission:", error);
            throw error;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter((device) => device.kind === "audioinput");
    }

    public async switchMicrophone(deviceId: string): Promise<void> {
        if (deviceId === this.currentDeviceId) {
            return;
        }

        const wasMuted = this.isMuted;

        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => track.stop());
            this.currentStream = null;
        }

        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        if (this.audioProducer && !this.audioProducer.closed) {
            this.audioProducer.close();
            this.audioProducer = undefined;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: this.getAudioConstraints(deviceId),
        });

        this.currentStream = stream;
        this.currentDeviceId = deviceId;

        const processedStream = await this.processAudioStream(stream);
        const [audioTrack] = processedStream.getAudioTracks();

        try {
            this.audioProducer = await this.sfuService.sendTransport!.produce({
                track: audioTrack,
                codecOptions: this.getCodecOptions(),
                appData: { source: 'microphone' },
            });
        } catch (err) {
            stream.getTracks().forEach((t) => t.stop());
            this.currentStream = null;
            throw err;
        }

        if (wasMuted) {
            this.muteMic();
        } else {
            this.unMuteMic();
        }
    }

    private getAudioConstraints(deviceId?: string): MediaTrackConstraints {
        const mode = useAudioStore.getState().audioQualityMode;
        const isStudio = mode === 'studio';

        const constraints: MediaTrackConstraints = {
            channelCount: isStudio ? 2 : 1,
            sampleRate: 48000,
            sampleSize: 16,
            echoCancellation: !isStudio,
            noiseSuppression: !isStudio,
            autoGainControl: !isStudio,
        };

        if (deviceId) {
            constraints.deviceId = { exact: deviceId };
        }

        return constraints;
    }

    private getCodecOptions() {
        const mode = useAudioStore.getState().audioQualityMode;
        const isStudio = mode === 'studio';

        return {
            opusStereo: isStudio,
            opusDtx: !isStudio,
            opusFec: true,
            opusMaxAverageBitrate: isStudio ? 128_000 : 96_000,
            ...(isStudio && { opusMaxPlaybackRate: 48000 }),
        };
    }

    public async joinVoiceChat(deviceId?: string) {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: this.getAudioConstraints(deviceId),
        });

        this.currentStream = stream;
        if (deviceId) {
            this.currentDeviceId = deviceId;
        }

        const processedStream = await this.processAudioStream(stream);
        const [audioTrack] = processedStream.getAudioTracks();

        try {
            this.audioProducer = await this.sfuService.sendTransport!.produce({
                track: audioTrack,
                codecOptions: this.getCodecOptions(),
                appData: { source: 'microphone' },
            });
        } catch (err) {
            stream.getTracks().forEach((t) => t.stop());
            this.currentStream = null;
            throw err;
        }

        // Resume AudioContexts after joining (Firefox autoplay policy)
        await this.resumeAudioContexts();

        this.muteMic();
    }

    public async watchNewProducers() {
        if (this.watchingNewProducers) return;
        this.watchingNewProducers = true;
        this.sfuService.socket.on(
            "newProducer",
            async (data: {
                producerId: string;
                socketId?: string;
                userName?: string;
                userId?: number;
                source?: string;
            }) => {
                // Accept microphone and music-bot sources
                if (
                    data.source &&
                    data.source !== "microphone" &&
                    data.source !== "music-bot"
                ) {
                    return;
                }
                if (data.userName) {
                    this.audioOwnerMap[data.producerId] = data.userName;
                }
                if (data.userId != null) {
                    this.audioProducerUserIdMap.set(data.producerId, data.userId);
                }
                if (data.source === "music-bot") {
                    this.musicBotProducerIds.add(data.producerId);
                }
                if (data.socketId) {
                    const existing =
                        this.socketToProducersMap.get(data.socketId) || [];
                    existing.push(data.producerId);
                    this.socketToProducersMap.set(data.socketId, existing);
                }

                await this.consumeProducer(data.producerId);
            },
        );

        this.sfuService.socket.on(
            "endScreenShare",
            (data: {
                producerId: string;
                kind: string;
                source?: string;
            }) => {
                if (data.source === "music-bot") {
                    this.closeConsumerByProducerId(data.producerId);
                    this.musicBotProducerIds.delete(data.producerId);
                }
            },
        );
    }

    private async consumeProducer(producerId: string) {
        if (this.producerToConsumerMap.has(producerId) || this.consumingInFlight.has(producerId)) {
            logger.log(`Already consuming producer ${producerId}`);
            return;
        }
        this.consumingInFlight.add(producerId);

        if (!this.sfuService.device || !this.sfuService.recvTransport) {
            this.consumingInFlight.delete(producerId);
            console.error("Cannot consume audio — SFU not initialized");
            return;
        }

        try {
            const consumerData: ConsumerServerResponse = await new Promise(
                (resolve) => {
                    this.sfuService.socket.emit(
                        "consume",
                        {
                            producerId: producerId,
                            rtpCapabilities:
                                this.sfuService.device!.rtpCapabilities,
                            transportId: this.sfuService.recvTransport!.id,
                        },
                        resolve,
                    );
                },
            );

            if ((consumerData as unknown as { error: string }).error) {
                console.error("Server rejected consume:", consumerData);
                return;
            }

            const consumer: Consumer =
                await this.sfuService.recvTransport!.consume({
                    id: consumerData.id,
                    producerId: consumerData.producerId,
                    kind: consumerData.kind,
                    rtpParameters: consumerData.rtpParameters,
                });

            this.consumers.set(consumer.id, consumer);
            this.producerToConsumerMap.set(producerId, consumer.id);

            if (this.isInFocusMode) {
                consumer.pause();
                // Don't tell server to resume — avoid wasting bandwidth
                // Server will resume when focus mode is lifted
            } else {
                await new Promise((resolve) => {
                    this.sfuService.socket.emit(
                        "resumeConsumer",
                        { consumerId: consumer.id },
                        resolve,
                    );
                });
            }

            logger.log("Consumer resumed, creating Web Audio pipeline...");

            const remoteStream = new MediaStream([consumer.track]);

            if (!this.outputAudioContext) {
                this.outputAudioContext = new AudioContext();
            }

            // Firefox requires AudioContext to be resumed after user gesture
            if (this.outputAudioContext.state === "suspended") {
                await this.outputAudioContext.resume();
            }

            const source =
                this.outputAudioContext.createMediaStreamSource(remoteStream);
            const gainNode = this.outputAudioContext.createGain();

            const isMusicBot = this.musicBotProducerIds.has(
                consumerData.producerId,
            );

            if (isMusicBot) {
                // Music bot: 50% default volume, no voice processing association
                const musicVol = useAudioStore
                    .getState()
                    .getMusicVolume?.() ?? 0.5;
                gainNode.gain.value = musicVol;
            } else {
                const userId = this.audioProducerUserIdMap.get(consumerData.producerId);
                if (userId != null) {
                    const volumeState = useAudioStore
                        .getState()
                        .getUserVolume(userId);
                    const isMuted = useAudioStore
                        .getState()
                        .isUserMuted(userId);
                    gainNode.gain.value = isMuted ? 0 : volumeState;
                } else {
                    gainNode.gain.value = 1.0;
                }
            }

            source.connect(gainNode);
            gainNode.connect(this.outputAudioContext.destination);

            this.mediaStreamSources.set(consumer.id, source);
            this.gainNodes.set(consumer.id, gainNode);

            // Store a lightweight reference for the audioElements map (used by AudioElement.tsx).
            // The actual playback is through the Web Audio pipeline above.
            const audioEl = document.createElement("audio");
            audioEl.srcObject = remoteStream;
            this.audioElements.set(consumer.id, audioEl);
            this.audioElementsSetter(audioEl);

            logger.log(
                "Web Audio pipeline created for",
                isMusicBot ? "Music Bot" : this.audioOwnerMap[consumerData.producerId],
                "with gain",
                gainNode.gain.value,
            );
            logger.log(
                "Track:",
                consumer.track.readyState,
                "Enabled:",
                consumer.track.enabled,
            );
        } catch (error) {
            console.error("Error consuming producer:", error);
        } finally {
            this.consumingInFlight.delete(producerId);
        }
    }

    private async processAudioStream(
        stream: MediaStream,
    ): Promise<MediaStream> {
        const mode = useAudioStore.getState().audioQualityMode;
        const isStudio = mode === 'studio';

        this.audioContext = new AudioContext({ sampleRate: 48000 });

        // Firefox requires AudioContext to be resumed after user gesture
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        const source = this.audioContext.createMediaStreamSource(stream);

        const compressor = this.audioContext.createDynamicsCompressor();
        if (isStudio) {
            // Gentle compression for studio mode (preserve dynamics)
            compressor.threshold.value = -18;
            compressor.knee.value = 12;
            compressor.ratio.value = 1.5;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
        } else {
            // Tighter compression for standard voice mode
            compressor.threshold.value = -24;
            compressor.knee.value = 6;
            compressor.ratio.value = 3;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.15;
        }

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.0;

        const highPassFilter = this.audioContext.createBiquadFilter();
        highPassFilter.type = "highpass";
        highPassFilter.frequency.value = 80;

        this.audioDestination =
            this.audioContext.createMediaStreamDestination();

        if (isStudio) {
            // Studio: skip noise gate for cleaner passthrough
            source
                .connect(highPassFilter)
                .connect(compressor)
                .connect(gainNode)
                .connect(this.audioDestination);
        } else {
            // Standard: add noise gate (DynamicsCompressor as gate) between highpass and compressor
            const noiseGate = this.audioContext.createDynamicsCompressor();
            noiseGate.threshold.value = -50;
            noiseGate.knee.value = 0;
            noiseGate.ratio.value = 20;
            noiseGate.attack.value = 0.001;
            noiseGate.release.value = 0.05;

            source
                .connect(highPassFilter)
                .connect(noiseGate)
                .connect(compressor)
                .connect(gainNode)
                .connect(this.audioDestination);
        }

        // Tap an AnalyserNode for local active-speaker detection
        this.localAnalyser = this.audioContext.createAnalyser();
        this.localAnalyser.fftSize = 256;
        gainNode.connect(this.localAnalyser);

        return this.audioDestination.stream;
    }

    public muteMic() {
        if (this.audioProducer) {
            this.audioProducer?.pause();
            this.isMuted = true;
        }
    }

    /** Close the audio producer and stop the mic track (for leaving calls) */
    public stopMic() {
        if (this.audioProducer && !this.audioProducer.closed) {
            this.audioProducer.close();
            this.audioProducer = undefined;
        }
        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => track.stop());
            this.currentStream = null;
        }
        this.isMuted = true;
    }

    public async unMuteMic() {
        if (this.audioProducer) {
            // Resume AudioContexts on unmute (Firefox autoplay policy)
            await this.resumeAudioContexts();

            this.audioProducer?.resume();
            this.isMuted = false;
        }
    }

    public enableFocusMode() {
        if (!this.consumers) return;
        this.consumers.forEach((consumer) => consumer.pause());
        this.isInFocusMode = true;
    }

    public disableFocusMode() {
        if (!this.consumers) return;
        this.consumers.forEach((consumer) => {
            consumer.resume();
            // Resume on server for consumers that were created while in focus mode
            this.sfuService.socket.emit(
                "resumeConsumer",
                { consumerId: consumer.id },
                () => {},
            );
        });
        this.isInFocusMode = false;
    }

    public emitFocusModeChange() {
        const localPlayerId = usePlayersStore.getState().localPlayerId;
        this.sfuService.socket.emit("focusModeChange", {
            playerId: localPlayerId,
            isInFocusMode: this.isInFocusMode,
        });
    }

    public watchFocusModeChanges() {
        this.sfuService.socket.on(
            "playerFocusModeChanged",
            (data: {
                playerId: string;
                isInFocusMode: boolean;
                socketId: string;
            }) => {
                const playerMap = usePlayersStore.getState().playerMap;
                const player = playerMap[data.playerId];
                if (!player) return;
                player.changePlayerAvailabilityStatus(
                    data.isInFocusMode
                        ? AvailabilityStatus.FOCUS
                        : AvailabilityStatus.ONLINE,
                );
            },
        );
    }

    public getAudioProducer(): Producer | undefined {
        return this.audioProducer;
    }

    public getConsumers(): Map<string, Consumer> {
        return this.consumers;
    }

    /**
     * Re-create the audio producer with current quality mode settings.
     * Called when the user toggles between standard and studio mode.
     */
    public async applyQualityMode(mode: AudioQualityMode): Promise<void> {
        useAudioStore.getState().setAudioQualityMode(mode);

        if (!this.audioProducer || this.audioProducer.closed) return;
        if (!this.currentStream) return;

        const wasMuted = this.isMuted;
        const deviceId = this.currentDeviceId ?? undefined;

        // Stop existing producer and stream
        this.audioProducer.close();
        this.audioProducer = undefined;
        this.currentStream.getTracks().forEach((t) => t.stop());
        this.currentStream = null;

        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        // Re-acquire with new constraints
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: this.getAudioConstraints(deviceId),
        });

        this.currentStream = stream;
        const processedStream = await this.processAudioStream(stream);
        const [audioTrack] = processedStream.getAudioTracks();

        this.audioProducer = await this.sfuService.sendTransport!.produce({
            track: audioTrack,
            codecOptions: this.getCodecOptions(),
            appData: { source: 'microphone' },
        });

        if (wasMuted) {
            this.muteMic();
        } else {
            this.unMuteMic();
        }

        logger.log(`Audio quality mode applied: ${mode}`);
    }

    public getCurrentDeviceId(): string | null {
        return this.currentDeviceId;
    }

    public getCurrentZone(): string | null {
        return this.currentZone;
    }

    public async cleanup() {
        // Remove socket listeners to prevent duplicates on re-init
        this.sfuService.socket.off("zone-players");
        this.sfuService.socket.off("player-left-zone");
        this.sfuService.socket.off("player-joined-zone");
        this.sfuService.socket.off("newProducer");
        this.sfuService.socket.off("endScreenShare");
        this.sfuService.socket.off("playerFocusModeChanged");

        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => track.stop());
            this.currentStream = null;
        }

        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        if (this.audioProducer && !this.audioProducer.closed) {
            this.audioProducer.close();
            this.audioProducer = undefined;
        }

        this.mediaStreamSources.forEach((source) => {
            source.disconnect();
        });
        this.mediaStreamSources.clear();

        this.gainNodes.forEach((gainNode) => {
            gainNode.disconnect();
        });
        this.gainNodes.clear();

        this.analyserNodes.forEach((analyser) => {
            analyser.disconnect();
        });
        this.analyserNodes.clear();
        this.localAnalyser = null;

        if (this.outputAudioContext) {
            await this.outputAudioContext.close();
            this.outputAudioContext = null;
        }

        this.audioElements.forEach((audioEl) => {
            audioEl.srcObject = null;
            audioEl.remove();
        });
        this.audioElements.clear();

        this.consumers.forEach((consumer) => {
            if (!consumer.closed) {
                consumer.close();
            }
        });
        this.consumers.clear();

        this.producerToConsumerMap.clear();
        this.socketToProducersMap.clear();
        this.audioProducerUserIdMap.clear();
    }

    /**
     * Returns the local mic AnalyserNode for active-speaker detection.
     * Created in processAudioStream; null when mic is not active.
     */
    public getLocalAnalyser(): AnalyserNode | null {
        return this.localAnalyser;
    }

    /**
     * Returns (or lazily creates) an AnalyserNode for a remote user's audio
     * pipeline, looked up by userId instead of display name (more reliable).
     */
    private findProducerIdForUserId(userId: number): string | undefined {
        for (const [pid, uid] of this.audioProducerUserIdMap) {
            if (uid === userId) return pid;
        }
        return undefined;
    }

    public getOrCreateAnalyserForUserId(userId: number): AnalyserNode | null {
        return this.createAnalyserForProducer(this.findProducerIdForUserId(userId));
    }

    private createAnalyserForProducer(producerId: string | undefined): AnalyserNode | null {
        if (!producerId || !this.outputAudioContext) return null;

        const consumerId = this.producerToConsumerMap.get(producerId);
        if (!consumerId) return null;

        // Return cached analyser if it already exists
        const existing = this.analyserNodes.get(consumerId);
        if (existing) return existing;

        const source = this.mediaStreamSources.get(consumerId);
        if (!source) return null;

        const analyser = this.outputAudioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        this.analyserNodes.set(consumerId, analyser);
        return analyser;
    }

    public getAudioElementByUserName(
        userName: string,
    ): HTMLAudioElement | null {
        const producerId = Object.keys(this.audioOwnerMap).find(
            (key) => this.audioOwnerMap[key] === userName,
        );
        if (!producerId) return null;

        const consumer = Array.from(this.consumers.values()).find(
            (c) => c.producerId === producerId,
        );

        return consumer ? this.audioElements.get(consumer.id) || null : null;
    }

    public getGainNodeByUserName(userName: string): GainNode | null {
        const producerId = Object.keys(this.audioOwnerMap).find(
            (key) => this.audioOwnerMap[key] === userName,
        );
        if (!producerId) return null;

        const consumer = Array.from(this.consumers.values()).find(
            (c) => c.producerId === producerId,
        );

        return consumer ? this.gainNodes.get(consumer.id) || null : null;
    }

    public getGainNodeByUserId(userId: number): GainNode | null {
        const producerId = this.findProducerIdForUserId(userId);
        if (!producerId) return null;

        const consumerId = this.producerToConsumerMap.get(producerId);
        if (!consumerId) return null;

        return this.gainNodes.get(consumerId) || null;
    }

    public setUserVolume(userId: number, volume: number): void {
        const gainNode = this.getGainNodeByUserId(userId);
        if (gainNode) {
            gainNode.gain.value = Math.max(0, Math.min(2.0, volume));
        }
    }

    public getUserIdByName(userName: string): number | null {
        for (const [producerId, name] of Object.entries(this.audioOwnerMap)) {
            if (name === userName) {
                return this.audioProducerUserIdMap.get(producerId) ?? null;
            }
        }
        return null;
    }

    public async loadExistingProducers(): Promise<void> {
        const producers = await new Promise<
            {
                producerId: string;
                socketId: string;
                source?: string;
                userName?: string;
                userId?: number;
            }[]
        >((resolve) => {
            this.sfuService.socket.emit("getProducers", {}, resolve);
        });

        const audioProducers = producers.filter(
            (p) =>
                !p.source ||
                p.source === "microphone" ||
                p.source === "music-bot",
        );

        for (const producer of audioProducers) {
            if (producer.source === "music-bot") {
                this.musicBotProducerIds.add(producer.producerId);
            }
            if (producer.userName) {
                this.audioOwnerMap[producer.producerId] = producer.userName;
            } else {
                const playerMap = usePlayersStore.getState().playerMap;
                const player = playerMap[producer.socketId];
                this.audioOwnerMap[producer.producerId] =
                    player?.name || "Unknown User";
            }
            if (producer.userId != null) {
                this.audioProducerUserIdMap.set(producer.producerId, producer.userId);
            }

            if (producer.socketId) {
                const existing =
                    this.socketToProducersMap.get(producer.socketId) || [];
                existing.push(producer.producerId);
                this.socketToProducersMap.set(producer.socketId, existing);
            }

            await this.consumeProducer(producer.producerId);
        }
    }
}
