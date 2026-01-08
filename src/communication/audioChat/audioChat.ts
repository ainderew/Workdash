import { Consumer, Producer, RtpParameters } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import usePlayersStore from "@/common/store/playerStore";
import { AvailabilityStatus } from "@/game/player/_enums";
import useAudioStore from "@/common/store/audioStore";

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
    private audioElementsSetter: (audioElement: HTMLAudioElement) => void;
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
    private socketToProducersMap: Map<string, string[]> = new Map();

    constructor() {
        console.log("initializeAudioChat");
        this.sfuService = MediaTransportService.getInstance();
        console.log("AudioChat initialized");
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
                console.log(
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
                console.log(`Player ${data.playerId} left zone ${data.zone}`);
                this.closeConsumersForSocket(data.socketId);
            },
        );

        this.sfuService.socket.on(
            "player-joined-zone",
            async (data: PlayerJoinedZoneData) => {
                console.log(`Player ${data.playerId} joined zone ${data.zone}`);

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

        const audioEl = this.audioElements.get(consumerId);
        if (audioEl) {
            audioEl.srcObject = null;
            audioEl.remove();
            this.audioElements.delete(consumerId);
        }

        delete this.audioOwnerMap[producerId];
        this.producerToConsumerMap.delete(producerId);

        if (this.audioElementUpdateCallback) {
            this.audioElementUpdateCallback();
        }

        console.log(`Closed consumer for producer ${producerId}`);
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
                    console.log("AudioContext resumed successfully");
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

        this.audioProducer = await this.sfuService.sendTransport!.produce({
            track: audioTrack,
        });

        if (wasMuted) {
            this.muteMic();
        } else {
            this.unMuteMic();
        }
    }

    private getAudioConstraints(deviceId?: string): MediaTrackConstraints {
        const constraints: MediaTrackConstraints = {
            channelCount: 1,
            sampleRate: 48000,
            sampleSize: 16,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        };

        if (deviceId) {
            constraints.deviceId = { exact: deviceId };
        }

        return constraints;
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

        this.audioProducer = await this.sfuService.sendTransport!.produce({
            track: audioTrack,
        });

        // Resume AudioContexts after joining (Firefox autoplay policy)
        await this.resumeAudioContexts();

        this.muteMic();
    }

    public async watchNewProducers() {
        this.sfuService.socket.on(
            "newProducer",
            async (data: {
                producerId: string;
                socketId?: string;
                userName?: string;
                source?: string;
            }) => {
                if (data.source && data.source !== "microphone") return;
                if (data.userName) {
                    this.audioOwnerMap[data.producerId] = data.userName;
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
    }

    private async consumeProducer(producerId: string) {
        if (this.producerToConsumerMap.has(producerId)) {
            console.log(`Already consuming producer ${producerId}`);
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
            }

            await new Promise((resolve) => {
                this.sfuService.socket.emit(
                    "resumeConsumer",
                    { consumerId: consumer.id },
                    resolve,
                );
            });

            console.log("Consumer resumed, creating Web Audio pipeline...");

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
            const ownerName = this.audioOwnerMap[consumerData.producerId];
            if (ownerName) {
                const volumeState = useAudioStore
                    .getState()
                    .getUserVolume(ownerName);
                const isMuted = useAudioStore.getState().isUserMuted(ownerName);
                gainNode.gain.value = isMuted ? 0 : volumeState;
            } else {
                gainNode.gain.value = 1.0;
            }

            source.connect(gainNode);
            gainNode.connect(this.outputAudioContext.destination);

            this.mediaStreamSources.set(consumer.id, source);
            this.gainNodes.set(consumer.id, gainNode);

            const audioEl = document.createElement("audio");
            audioEl.srcObject = remoteStream;
            audioEl.autoplay = false;
            audioEl.muted = true;
            this.audioElements.set(consumer.id, audioEl);
            this.audioElementsSetter(audioEl);
            document.body.appendChild(audioEl);

            if (this.audioElementUpdateCallback) {
                this.audioElementUpdateCallback();
            }

            console.log(
                "Web Audio pipeline created for",
                ownerName,
                "with gain",
                gainNode.gain.value,
            );
            console.log(
                "Track:",
                consumer.track.readyState,
                "Enabled:",
                consumer.track.enabled,
            );
        } catch (error) {
            console.error("Error consuming producer:", error);
        }
    }

    private async processAudioStream(
        stream: MediaStream,
    ): Promise<MediaStream> {
        this.audioContext = new AudioContext({ sampleRate: 48000 });

        // Firefox requires AudioContext to be resumed after user gesture
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        const source = this.audioContext.createMediaStreamSource(stream);

        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.2;

        const highPassFilter = this.audioContext.createBiquadFilter();
        highPassFilter.type = "highpass";
        highPassFilter.frequency.value = 80;

        this.audioDestination =
            this.audioContext.createMediaStreamDestination();

        source
            .connect(highPassFilter)
            .connect(compressor)
            .connect(gainNode)
            .connect(this.audioDestination);

        return this.audioDestination.stream;
    }

    public muteMic() {
        if (this.audioProducer) {
            this.audioProducer?.pause();
            this.isMuted = true;
        }
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
        this.consumers.forEach((consumer) => consumer.resume());
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
                console.log(playerMap);
                playerMap[data.playerId].changePlayerAvailabilityStatus(
                    data.isInFocusMode
                        ? AvailabilityStatus.FOCUS
                        : AvailabilityStatus.ONLINE,
                );
            },
        );
    }

    public getCurrentDeviceId(): string | null {
        return this.currentDeviceId;
    }

    public getCurrentZone(): string | null {
        return this.currentZone;
    }

    public async cleanup() {
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

    public setUserVolume(userName: string, volume: number): void {
        const gainNode = this.getGainNodeByUserName(userName);
        if (gainNode) {
            gainNode.gain.value = Math.max(0, Math.min(2.0, volume));
        }
    }

    public async loadExistingProducers(): Promise<void> {
        const producers = await new Promise<
            {
                producerId: string;
                socketId: string;
                source?: string;
                userName?: string;
            }[]
        >((resolve) => {
            this.sfuService.socket.emit("getProducers", {}, resolve);
        });

        const audioProducers = producers.filter(
            (p) => !p.source || p.source === "microphone",
        );

        for (const producer of audioProducers) {
            if (producer.userName) {
                this.audioOwnerMap[producer.producerId] = producer.userName;
            } else {
                const playerMap = usePlayersStore.getState().playerMap;
                const player = playerMap[producer.socketId];
                this.audioOwnerMap[producer.producerId] =
                    player?.name || "Unknown User";
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
