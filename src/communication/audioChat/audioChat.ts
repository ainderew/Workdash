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
    // Volume control properties
    public audioElements: Map<string, HTMLAudioElement> = new Map();
    public audioOwnerMap: Record<string, string> = {};
    private audioElementUpdateCallback: (() => void) | null = null;
    // Web Audio API for output gain control
    private outputAudioContext: AudioContext | null = null;
    private gainNodes: Map<string, GainNode> = new Map();
    private mediaStreamSources: Map<string, MediaStreamAudioSourceNode> =
        new Map();

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
    }

    public async getAvailableMicrophones(): Promise<MediaDeviceInfo[]> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            // Stop the stream immediately - we just needed permission
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
        this.muteMic();

        const existingProducers = await new Promise<{ producerId: string }[]>(
            (resolve) => {
                this.sfuService.socket.emit("getProducers", {}, resolve);
            },
        );

        for (const producer of existingProducers) {
            await this.consumeProducer(producer.producerId);
        }
    }

    public async watchNewProducers() {
        this.sfuService.socket.on(
            "newProducer",
            async (data: {
                producerId: string;
                userName?: string;
                source?: string;
            }) => {
                if (data.source && data.source !== "microphone") return;
                if (data.userName) {
                    this.audioOwnerMap[data.producerId] = data.userName;
                }

                await this.consumeProducer(data.producerId);
            },
        );
    }

    private async consumeProducer(producerId: string) {
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

            const consumer: Consumer =
                await this.sfuService.recvTransport!.consume({
                    id: consumerData.id,
                    producerId: consumerData.producerId,
                    kind: consumerData.kind,
                    rtpParameters: consumerData.rtpParameters,
                });

            this.consumers.set(consumer.id, consumer);

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

    public unMuteMic() {
        if (this.audioProducer) {
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

            await this.consumeProducer(producer.producerId);
        }
    }
}
