import { Consumer, Producer, RtpParameters } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportService";
import usePlayersStore from "@/common/store/playerStore";
import { AvailabilityStatus } from "@/game/player/_enums";
import useAudioStore from "@/common/store/audioStore";
import type { AudioQualityMode } from "@/common/store/audioStore";
import { logger } from "@/common/utils/logger";
import useCallStore from "@/common/store/callStore";
import useFocusStore from "@/common/store/focusStore";
import useUiStore from "@/common/store/uiStore";
import useUserStore from "@/common/store/useStore";
import { RNNoiseService } from "./rnnoiseService";
import { toast } from "sonner";

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
    private wasMutedBeforeFocus: boolean = false;
    private _focusModeListenerAttached: boolean = false;
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
    /** Receive-side high-pass filters (keyed by consumerId) for cleanup */
    private receiveFilters: Map<string, BiquadFilterNode> = new Map();
    /** Shared output limiter to prevent clipping from loud remote speakers */
    private outputLimiter: DynamicsCompressorNode | null = null;
    /** Noise gate polling interval for send-side audio */
    private noiseGateInterval: ReturnType<typeof setInterval> | null = null;
    /** Noise gate hold timer (setTimeout) cleared on teardown */
    private noiseGateHoldTimer: ReturnType<typeof setTimeout> | null = null;
    /** RNNoise AudioWorklet node (standard mode only) */
    private rnnoiseNode: AudioWorkletNode | null = null;
    /** Cached RNNoise support check */
    private rnnoiseSupported: boolean | null = null;

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
                    if (useCallStore.getState().currentCall) {
                        this.currentZone = null;
                        return;
                    }
                    this.closeAllAudioConsumers();
                    this.currentZone = null;
                    return;
                }

                this.currentZone = data.zone;

                if (useCallStore.getState().currentCall) return;

                for (const player of data.players) {
                    this.socketToProducersMap.set(
                        player.socketId,
                        player.producerIds,
                    );
                    for (const producerId of player.producerIds) {
                        this.audioOwnerMap[producerId] = player.name;
                    }
                }
                await Promise.all(
                    data.players.flatMap((player) =>
                        player.producerIds.map((id) => this.consumeProducer(id)),
                    ),
                );
            },
        );

        this.sfuService.socket.on(
            "player-left-zone",
            (data: { socketId: string; playerId: string; zone: string }) => {
                logger.log(`Player ${data.playerId} left zone ${data.zone}`);
                if (useCallStore.getState().currentCall) return;
                this.closeConsumersForSocket(data.socketId);
            },
        );

        this.sfuService.socket.on(
            "player-joined-zone",
            async (data: PlayerJoinedZoneData) => {
                logger.log(`Player ${data.playerId} joined zone ${data.zone}`);
                if (useCallStore.getState().currentCall) return;

                if (data.producerIds && data.producerIds.length > 0) {
                    this.socketToProducersMap.set(
                        data.socketId,
                        data.producerIds,
                    );
                    for (const producerId of data.producerIds) {
                        this.audioOwnerMap[producerId] = data.name;
                    }
                    await Promise.all(
                        data.producerIds.map((id) => this.consumeProducer(id)),
                    );
                }
            },
        );
    }

    public closeAllAudioConsumers(): void {
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

        const rxFilter = this.receiveFilters.get(consumerId);
        if (rxFilter) {
            rxFilter.disconnect();
            this.receiveFilters.delete(consumerId);
        }

        const analyser = this.analyserNodes.get(consumerId);
        if (analyser) {
            analyser.disconnect();
            this.analyserNodes.delete(consumerId);
        }

        const audioEl = this.audioElements.get(consumerId);
        if (audioEl) {
            audioEl.remove();
            this.audioElements.delete(consumerId);
        }

        delete this.audioOwnerMap[producerId];
        this.audioProducerUserIdMap.delete(producerId);
        this.producerToConsumerMap.delete(producerId);

        // Clean up stale entry from socketToProducersMap
        for (const [socketId, producerIds] of this.socketToProducersMap) {
            const idx = producerIds.indexOf(producerId);
            if (idx !== -1) {
                producerIds.splice(idx, 1);
                if (producerIds.length === 0) {
                    this.socketToProducersMap.delete(socketId);
                }
                break;
            }
        }

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
                    logger.error("Failed to resume AudioContext:", error);
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
            logger.error("Failed to get microphone permission:", error);
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
        const savedWasMutedBeforeFocus = this.wasMutedBeforeFocus;

        this.clearNoiseGate();

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
        // Restore pre-focus intent so mic switch doesn't corrupt exit behavior
        if (this.isInFocusMode) {
            this.wasMutedBeforeFocus = savedWasMutedBeforeFocus;
        }
    }

    private isRNNoiseAvailable(): boolean {
        if (this.rnnoiseSupported === null) {
            this.rnnoiseSupported = RNNoiseService.isSupported();
        }
        return this.rnnoiseSupported;
    }

    private getAudioConstraints(deviceId?: string): MediaTrackConstraints {
        const mode = useAudioStore.getState().audioQualityMode;
        const isStudio = mode === 'studio';

        // Keep browser noiseSuppression ON in standard mode even when RNNoise is
        // active. Browser NS operates at the capture level and handles steady-state
        // noise (fans, hum) effectively. RNNoise adds ML-based denoising + VAD
        // gating on top for additional suppression.
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
            // 48kbps mono is broadcast-quality for voice; higher bitrates encode noise in detail
            opusMaxAverageBitrate: isStudio ? 128_000 : 48_000,
            ...(isStudio && { opusMaxPlaybackRate: 48000 }),
        };
    }

    public async joinVoiceChat(deviceId?: string) {
        if (this.audioProducer && !this.audioProducer.closed) {
            return;
        }

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
                soundName?: string;
            }) => {
                // Accept microphone, music-bot, and soundboard sources
                if (
                    data.source &&
                    data.source !== "microphone" &&
                    data.source !== "music-bot" &&
                    data.source !== "soundboard"
                ) {
                    return;
                }

                // Show toast for soundboard plays from other users
                if (data.source === "soundboard" && data.userName && data.soundName) {
                    const viewerUserId = useUserStore.getState().backendUser?.id;
                    if (data.userId !== viewerUserId) {
                        toast(`${data.userName} played ${data.soundName}`);
                    }
                }

                // Guard: don't consume call audio if we're not in that call
                if (data.source === "microphone" && data.userId != null) {
                    const { currentCall, activeCallsByChannel } =
                        useCallStore.getState();
                    const producerIsInCall = Object.values(
                        activeCallsByChannel,
                    ).some((call) =>
                        call.participants.some(
                            (p) => p.userId === data.userId,
                        ),
                    );
                    if (producerIsInCall) {
                        if (!currentCall) return;
                        const ourCall =
                            activeCallsByChannel[currentCall.channelId];
                        if (
                            !ourCall?.participants.some(
                                (p) => p.userId === data.userId,
                            )
                        )
                            return;
                    }
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
                if (this.producerToConsumerMap.has(data.producerId)) {
                    this.closeConsumerByProducerId(data.producerId);
                }
                if (data.source === "music-bot") {
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
            logger.error("Cannot consume audio — SFU not initialized");
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
                logger.error("Server rejected consume:", consumerData);
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
                const resumeResult = await new Promise<
                    void | { error: string }
                >((resolve) => {
                    this.sfuService.socket.emit(
                        "resumeConsumer",
                        { consumerId: consumer.id },
                        resolve,
                    );
                });
                if (
                    resumeResult &&
                    typeof resumeResult === "object" &&
                    "error" in resumeResult
                ) {
                    logger.error(
                        "Failed to resume consumer:",
                        resumeResult.error,
                    );
                    consumer.close();
                    this.consumers.delete(consumer.id);
                    this.producerToConsumerMap.delete(producerId);
                    return;
                }
            }

            logger.log("Consumer resumed, creating Web Audio pipeline...");

            const remoteStream = new MediaStream([consumer.track]);

            if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
                this.outputAudioContext = new AudioContext({
                    latencyHint: 'interactive',
                });

                // Shared limiter before destination to prevent clipping from loud speakers
                this.outputLimiter = this.outputAudioContext.createDynamicsCompressor();
                this.outputLimiter.threshold.value = -1;
                this.outputLimiter.knee.value = 0;
                this.outputLimiter.ratio.value = 20;
                this.outputLimiter.attack.value = 0.001;
                this.outputLimiter.release.value = 0.05;
                this.outputLimiter.connect(this.outputAudioContext.destination);
            }

            // Firefox requires AudioContext to be resumed after user gesture
            if (this.outputAudioContext.state === "suspended") {
                await this.outputAudioContext.resume();
            }

            const source =
                this.outputAudioContext.createMediaStreamSource(remoteStream);

            const isMusicBot = this.musicBotProducerIds.has(
                consumerData.producerId,
            );

            // Receive-side high-pass for voice (skip for music bot)
            // Only high-pass is needed — capture side already low-passes at 8kHz,
            // so a receive-side low-pass would add phase distortion with no benefit.
            let lastNode: AudioNode = source;
            if (!isMusicBot) {
                const rxHighPass = this.outputAudioContext.createBiquadFilter();
                rxHighPass.type = "highpass";
                rxHighPass.frequency.value = 80;

                source.connect(rxHighPass);
                lastNode = rxHighPass;
                this.receiveFilters.set(consumer.id, rxHighPass);
            }

            const gainNode = this.outputAudioContext.createGain();

            if (isMusicBot) {
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

            lastNode.connect(gainNode);
            gainNode.connect(this.outputLimiter!);

            this.mediaStreamSources.set(consumer.id, source);
            this.gainNodes.set(consumer.id, gainNode);

            // Chrome/Chromium requires a muted <audio> element consuming the stream
            // to keep createMediaStreamSource() active. Without this, the WebRTC track
            // delivers silence to the Web Audio pipeline.
            const audioEl = document.createElement("audio");
            audioEl.srcObject = remoteStream;
            audioEl.muted = true;
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
            logger.error("Error consuming producer:", error);
        } finally {
            this.consumingInFlight.delete(producerId);
        }
    }

    private async processAudioStream(
        stream: MediaStream,
    ): Promise<MediaStream> {
        const mode = useAudioStore.getState().audioQualityMode;
        const isStudio = mode === 'studio';

        this.audioContext = new AudioContext({
            sampleRate: 48000,
            latencyHint: 'interactive',
        });

        // Firefox requires AudioContext to be resumed after user gesture
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        const source = this.audioContext.createMediaStreamSource(stream);

        // High-pass filter: remove rumble, hum, and low-freq noise
        const highPassFilter = this.audioContext.createBiquadFilter();
        highPassFilter.type = "highpass";
        highPassFilter.frequency.value = isStudio ? 80 : 150;

        // Low-pass filter (standard only): remove high-freq hiss/static above voice range
        const lowPassFilter = this.audioContext.createBiquadFilter();
        lowPassFilter.type = "lowpass";
        lowPassFilter.frequency.value = 8000;

        // Light compressor to even out voice levels without amplifying noise
        const compressor = this.audioContext.createDynamicsCompressor();
        if (isStudio) {
            compressor.threshold.value = -18;
            compressor.knee.value = 12;
            compressor.ratio.value = 1.5;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
        } else {
            // Standard-mode defaults — overridden below for RNNoise path
            compressor.threshold.value = -20;
            compressor.knee.value = 10;
            compressor.ratio.value = 2;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
        }

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.0;

        this.audioDestination =
            this.audioContext.createMediaStreamDestination();

        if (isStudio) {
            // Studio: minimal processing for clean passthrough
            source
                .connect(highPassFilter)
                .connect(compressor)
                .connect(gainNode)
                .connect(this.audioDestination);
        } else {
            // Standard mode: try RNNoise ML denoiser, fall back to FFT noise gate
            const ncEnabled = useAudioStore.getState().noiseCancellation;
            let rnnoiseNode: AudioWorkletNode | null = null;

            if (ncEnabled && RNNoiseService.isSupported()) {
                try {
                    rnnoiseNode = await RNNoiseService.createNode(this.audioContext);
                    this.rnnoiseNode = rnnoiseNode;
                    logger.log('RNNoise noise cancellation active');
                } catch (err) {
                    logger.warn('RNNoise init failed, falling back to FFT gate:', err);
                }
            } else {
                logger.log(`RNNoise skipped: ncEnabled=${ncEnabled}, supported=${RNNoiseService.isSupported()}`);
            }

            // Update store so UI can reflect actual NC status
            useAudioStore.getState().setNoiseCancellationActive(!!rnnoiseNode);

            if (rnnoiseNode) {
                // RNNoise path: gentler compressor — RNNoise already reduces noise,
                // so we only compress loud peaks without boosting quiet residual noise.
                compressor.threshold.value = -12;
                compressor.knee.value = 15;
                compressor.ratio.value = 1.5;
                compressor.release.value = 0.15;

                // Recover from mid-session WASM crashes by falling back to FFT gate
                rnnoiseNode.onprocessorerror = (event) => {
                    logger.error('RNNoise worklet crashed, falling back to FFT gate:', event);
                    this.rnnoiseNode = null;
                    // Route through applyQualityMode which does full teardown + rebuild
                    this.applyQualityMode('standard');
                };

                // RNNoise path: highPass → lowPass → RNNoise worklet → compressor → gain → dest
                // lowPass(8kHz) cuts high-frequency hiss above voice range before
                // RNNoise processes, so the model focuses on in-band noise.
                source
                    .connect(highPassFilter)
                    .connect(lowPassFilter)
                    .connect(rnnoiseNode)
                    .connect(compressor)
                    .connect(gainNode)
                    .connect(this.audioDestination);
            } else {
                // Fallback: band-pass + compression + noise gate
                logger.log('Using FFT noise gate (RNNoise unavailable or disabled)');
                // Browser's noiseSuppression + echoCancellation handle real noise reduction;
                // the gate silences fan/ambient noise when the user isn't speaking.
                const gateAnalyser = this.audioContext.createAnalyser();
                gateAnalyser.fftSize = 256;
                gateAnalyser.smoothingTimeConstant = 0.3;

                const gateGain = this.audioContext.createGain();
                gateGain.gain.value = 0;

                const gateBuffer = new Float32Array(gateAnalyser.fftSize);
                const OPEN_THRESHOLD_DB = -45;
                const CLOSE_THRESHOLD_DB = -50;
                const HOLD_MS = 150;
                let isGateOpen = false;

                this.clearNoiseGate();
                this.noiseGateInterval = setInterval(() => {
                    if (
                        !this.audioContext ||
                        this.audioContext.state === "closed"
                    ) {
                        this.clearNoiseGate();
                        return;
                    }

                    // Skip processing while muted — producer is paused, no RTP flows
                    if (this.isMuted) return;

                    gateAnalyser.getFloatTimeDomainData(gateBuffer);
                    let sum = 0;
                    for (let i = 0; i < gateBuffer.length; i++) {
                        sum += gateBuffer[i] * gateBuffer[i];
                    }
                    const rms = Math.sqrt(sum / gateBuffer.length);
                    const dB = 20 * Math.log10(Math.max(rms, 1e-10));
                    const now = this.audioContext.currentTime;

                    if (dB > OPEN_THRESHOLD_DB) {
                        if (this.noiseGateHoldTimer) {
                            clearTimeout(this.noiseGateHoldTimer);
                            this.noiseGateHoldTimer = null;
                        }
                        if (!isGateOpen) {
                            isGateOpen = true;
                            gateGain.gain.cancelScheduledValues(now);
                            gateGain.gain.setTargetAtTime(1.0, now, 0.006);
                        }
                    } else if (dB < CLOSE_THRESHOLD_DB && isGateOpen) {
                        if (!this.noiseGateHoldTimer) {
                            this.noiseGateHoldTimer = setTimeout(() => {
                                this.noiseGateHoldTimer = null;
                                isGateOpen = false;
                                if (
                                    this.audioContext &&
                                    this.audioContext.state !== "closed"
                                ) {
                                    const t = this.audioContext.currentTime;
                                    gateGain.gain.cancelScheduledValues(t);
                                    gateGain.gain.setTargetAtTime(0.0, t, 0.015);
                                }
                            }, HOLD_MS);
                        }
                    }
                }, 20);

                source
                    .connect(highPassFilter)
                    .connect(lowPassFilter)
                    .connect(compressor)
                    .connect(gateAnalyser)
                    .connect(gateGain)
                    .connect(gainNode)
                    .connect(this.audioDestination);
            }
        }

        // Tap an AnalyserNode for local active-speaker detection.
        // Connected to the pre-processing source so the speaking indicator
        // reflects raw mic input, not the noise-gated output.
        if (this.audioContext) {
            this.localAnalyser = this.audioContext.createAnalyser();
            this.localAnalyser.fftSize = 256;
            source.connect(this.localAnalyser);
        }

        return this.audioDestination!.stream;
    }

    private clearNoiseGate() {
        if (this.noiseGateHoldTimer) {
            clearTimeout(this.noiseGateHoldTimer);
            this.noiseGateHoldTimer = null;
        }
        if (this.noiseGateInterval) {
            clearInterval(this.noiseGateInterval);
            this.noiseGateInterval = null;
        }
    }

    private cleanupRNNoise() {
        if (this.rnnoiseNode) {
            this.rnnoiseNode.port.postMessage({ type: 'destroy' });
            this.rnnoiseNode.disconnect();
            this.rnnoiseNode = null;
        }
        useAudioStore.getState().setNoiseCancellationActive(false);
    }

    public muteMic() {
        if (this.audioProducer) {
            this.audioProducer.pause();
        }
        this.isMuted = true;
        useUiStore.getState().setIsMuted(true);
        if (this.isInFocusMode) {
            this.wasMutedBeforeFocus = true;
        }
    }

    /** Close the audio producer, stop the mic track, and release audio contexts (for leaving calls) */
    public stopMic() {
        this.clearNoiseGate();
        this.cleanupRNNoise();
        if (this.audioProducer && !this.audioProducer.closed) {
            this.sfuService.socket.emit("producerClosed", {
                producerId: this.audioProducer.id,
                kind: "audio",
            });
            this.audioProducer.close();
            this.audioProducer = undefined;
        }
        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => track.stop());
            this.currentStream = null;
        }
        if (this.audioContext) {
            const ctx = this.audioContext;
            this.audioContext = null;
            ctx.close().catch(() => {});
        }
        this.localAnalyser = null;
        this.isMuted = true;
        if (this.isInFocusMode) {
            this.isInFocusMode = false;
            this.wasMutedBeforeFocus = false;
            useFocusStore.getState().setLocalFocusMode(false);
            this.emitFocusModeChange();
        }
    }

    public async unMuteMic() {
        this.isMuted = false;
        useUiStore.getState().setIsMuted(false);
        if (this.isInFocusMode) {
            this.wasMutedBeforeFocus = false;
        }
        if (this.audioProducer) {
            // Resume AudioContexts on unmute (Firefox autoplay policy)
            await this.resumeAudioContexts();
            this.audioProducer.resume();
        }
    }

    public enableFocusMode() {
        if (this.isInFocusMode) return;
        if (!this.consumers) return;
        this.consumers.forEach((consumer) => consumer.pause());
        this.wasMutedBeforeFocus = this.isMuted;
        if (!this.isMuted) {
            this.muteMic();
        }
        this.isInFocusMode = true;
    }

    public async disableFocusMode() {
        if (!this.isInFocusMode) return;
        if (!this.consumers) return;
        this.consumers.forEach((consumer) => {
            if (consumer.closed) return;
            consumer.resume();
            // Resume on server for consumers that were created while in focus mode
            this.sfuService.socket.emit(
                "resumeConsumer",
                { consumerId: consumer.id },
                () => {},
            );
        });
        if (!this.wasMutedBeforeFocus) {
            await this.unMuteMic();
        }
        this.isInFocusMode = false;
    }

    public emitFocusModeChange() {
        const localPlayerId = usePlayersStore.getState().localPlayerId;
        this.sfuService.socket.emit("focusModeChange", {
            playerId: localPlayerId,
            isInFocusMode: this.isInFocusMode,
            userId: useUserStore.getState().backendUser?.id ?? null,
        });
    }

    public getIsInFocusMode(): boolean {
        return this.isInFocusMode;
    }

    public watchFocusModeChanges() {
        if (this._focusModeListenerAttached) return;
        this._focusModeListenerAttached = true;

        // Sync local focus state into the store on (re)mount
        useFocusStore.getState().setLocalFocusMode(this.isInFocusMode);

        this.sfuService.socket.on(
            "playerFocusModeChanged",
            (data: {
                playerId: string;
                isInFocusMode: boolean;
                socketId: string;
                userId?: number | null;
            }) => {
                // Update Phaser player if it exists (no-op in desk mode)
                const playerMap = usePlayersStore.getState().playerMap;
                const player = playerMap[data.playerId];
                if (player) {
                    player.changePlayerAvailabilityStatus(
                        data.isInFocusMode
                            ? AvailabilityStatus.FOCUS
                            : AvailabilityStatus.ONLINE,
                    );
                }

                // Always update focus store for desk mode tile indicators
                if (data.userId != null) {
                    useFocusStore
                        .getState()
                        .setRemoteFocusMode(data.userId, data.isInFocusMode);
                }
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
        const savedWasMutedBeforeFocus = this.wasMutedBeforeFocus;
        const deviceId = this.currentDeviceId ?? undefined;

        // Notify peers before closing old producer so they can clean up stale consumers
        this.sfuService.socket.emit("producerClosed", {
            producerId: this.audioProducer.id,
            kind: "audio",
        });

        // Stop existing producer and stream
        this.clearNoiseGate();
        this.cleanupRNNoise();
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
        // Restore pre-focus intent so quality change doesn't corrupt exit behavior
        if (this.isInFocusMode) {
            this.wasMutedBeforeFocus = savedWasMutedBeforeFocus;
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

        this.cleanupRNNoise();

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

        this.receiveFilters.forEach((filter) => {
            filter.disconnect();
        });
        this.receiveFilters.clear();

        if (this.outputLimiter) {
            this.outputLimiter.disconnect();
            this.outputLimiter = null;
        }

        if (this.outputAudioContext) {
            await this.outputAudioContext.close();
            this.outputAudioContext = null;
        }

        this.audioElements.forEach((audioEl) => {
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
        this.watchingNewProducers = false;
        this.consumingInFlight.clear();
        this.musicBotProducerIds.clear();

        if (this.isInFocusMode) {
            useFocusStore.getState().setLocalFocusMode(false);
        }
        this.isInFocusMode = false;
        this.wasMutedBeforeFocus = false;
        this.isMuted = true;
        this._focusModeListenerAttached = false;
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
        } else {
            const producerId = this.findProducerIdForUserId(userId);
            logger.warn(
                `setUserVolume: no gain node for userId=${userId} ` +
                `(producerId=${producerId ?? "none"}, ` +
                `producerMapSize=${this.audioProducerUserIdMap.size}, ` +
                `gainNodesSize=${this.gainNodes.size})`,
            );
        }
    }

    public setMusicVolume(volume: number): void {
        const clamped = Math.max(0, Math.min(1, volume));
        for (const producerId of this.musicBotProducerIds) {
            const consumerId = this.producerToConsumerMap.get(producerId);
            if (!consumerId) continue;
            const gainNode = this.gainNodes.get(consumerId);
            if (gainNode) {
                gainNode.gain.value = clamped;
            }
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
                p.source === "music-bot" ||
                p.source === "soundboard",
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
