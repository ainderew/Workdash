import { Consumer, Producer, RtpParameters } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import usePlayersStore from "@/common/store/playerStore";
import { AvailabilityStatus } from "@/game/player/_enums";

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
    ) {
        this.audioElementsSetter = setter;
        this.watchFocusModeChanges();
    }

    /**
     * Get list of available microphones
     */
    public async getAvailableMicrophones(): Promise<MediaDeviceInfo[]> {
        // Request permission first to get device labels
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

    /**
     * Switch to a different microphone
     */
    public async switchMicrophone(deviceId: string): Promise<void> {
        // Don't switch if it's the same device
        if (deviceId === this.currentDeviceId) {
            return;
        }

        const wasMuted = this.isMuted;

        // Clean up old resources
        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => track.stop());
            this.currentStream = null;
        }

        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        // Close old producer
        if (this.audioProducer && !this.audioProducer.closed) {
            this.audioProducer.close();
            this.audioProducer = undefined;
        }

        // Get new stream with selected device
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: this.getAudioConstraints(deviceId),
        });

        this.currentStream = stream;
        this.currentDeviceId = deviceId;

        const processedStream = await this.processAudioStream(stream);
        const [audioTrack] = processedStream.getAudioTracks();

        // Create new producer
        this.audioProducer = await this.sfuService.sendTransport!.produce({
            track: audioTrack,
        });

        // Restore mute state
        if (wasMuted) {
            this.muteMic();
        } else {
            this.unMuteMic();
        }

        console.log(`Switched to microphone: ${deviceId}`);
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
            async (data: { producerId: string }) => {
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

            console.log("Consumer resumed, creating audio element...");

            const remoteStream = new MediaStream([consumer.track]);

            const audioEl = document.createElement("audio");
            audioEl.srcObject = remoteStream;
            audioEl.autoplay = false;
            audioEl.volume = 1.0;
            audioEl.muted = false;

            this.audioElementsSetter(audioEl);
            document.body.appendChild(audioEl);

            console.log("Audio element created and ready");
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

    /**
     * Get the currently selected microphone device ID
     */
    public getCurrentDeviceId(): string | null {
        return this.currentDeviceId;
    }

    /**
     * Cleanup resources
     */
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

        this.consumers.forEach((consumer) => {
            if (!consumer.closed) {
                consumer.close();
            }
        });
        this.consumers.clear();
    }
}
