import { Producer } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportService";

export class VideoChatService {
    public static instance: VideoChatService | null = null;

    private sfuService: MediaTransportService;
    private producer: Producer | null = null;
    private currentStream: MediaStream | null = null;
    private currentDeviceId: string | null = null;
    private switchingCamera = false;

    constructor() {
        this.sfuService = MediaTransportService.getInstance();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new VideoChatService();
        }
        return this.instance;
    }

    private getVideoConstraints(deviceId?: string): MediaTrackConstraints {
        const constraints: MediaTrackConstraints = {
            width: { min: 640, ideal: 1920, max: 1920 },
            height: { min: 480, ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
        };

        if (deviceId) {
            constraints.deviceId = { exact: deviceId };
        } else {
            constraints.facingMode = "user";
        }

        return constraints;
    }

    public async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });
            stream.getTracks().forEach((track) => track.stop());
        } catch (error) {
            console.error("Failed to get camera permission:", error);
            throw error;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter((device) => device.kind === "videoinput");
    }

    public async switchCamera(deviceId: string): Promise<void> {
        if (deviceId === this.currentDeviceId || this.switchingCamera) return;
        this.switchingCamera = true;
        try {
            if (!this.producer) {
                this.currentDeviceId = deviceId;
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: this.getVideoConstraints(deviceId),
                audio: false,
            });

            const videoTrack = stream.getVideoTracks()[0];

            try {
                await this.producer.replaceTrack({ track: videoTrack });
            } catch (err) {
                // Stop the new stream to avoid leaking camera resources
                stream.getTracks().forEach((t) => t.stop());
                throw err;
            }

            // Stop old stream tracks after successful replacement
            if (this.currentStream) {
                this.currentStream.getTracks().forEach((t) => t.stop());
            }

            this.currentStream = stream;
            this.currentDeviceId = deviceId;
        } finally {
            this.switchingCamera = false;
        }
    }

    public async startVideoChat(deviceId?: string) {
        if (this.producer) {
            return this.producer;
        }

        const resolvedDeviceId = deviceId ?? this.currentDeviceId ?? undefined;

        const stream = await navigator.mediaDevices.getUserMedia({
            video: this.getVideoConstraints(resolvedDeviceId),
            audio: false,
        });

        const videoTrack = stream.getVideoTracks()[0];
        
        
        

        this.currentStream = stream;
        if (resolvedDeviceId) {
            this.currentDeviceId = resolvedDeviceId;
        }
        try {
            this.producer = await this.sfuService.sendTransport!.produce({
                track: videoTrack,
                encodings: [
                    { maxBitrate: 200_000, scaleResolutionDownBy: 4, maxFramerate: 15 },
                    { maxBitrate: 1_000_000, scaleResolutionDownBy: 2, maxFramerate: 30 },
                    { maxBitrate: 4_000_000, scaleResolutionDownBy: 1, maxFramerate: 30 },
                ],
                codecOptions: { videoGoogleStartBitrate: 1500 },
                appData: {
                    source: "camera",
                },
            });
        } catch (err) {
            stream.getTracks().forEach((t) => t.stop());
            this.currentStream = null;
            throw err;
        }
    }

    public stopVideoChat() {
        if (!this.producer) return;

        this.sfuService.socket.emit("producerClosed", {
            producerId: this.producer.id,
            kind: "video",
        });

        this.producer.close();
        this.producer = null;

        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => track.stop());
            this.currentStream = null;
        }
    }

    public pauseProducer() {
        if (this.producer && !this.producer.closed) {
            this.producer.pause();
        }
    }

    public resumeProducer() {
        if (this.producer && !this.producer.closed) {
            this.producer.resume();
        }
    }

    public getCurrentStream() {
        return this.currentStream;
    }

    public getCurrentDeviceId(): string | null {
        return this.currentDeviceId;
    }
}
