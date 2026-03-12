import { Producer } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";

export class VideoChatService {
    public static instance: VideoChatService | null = null;

    private sfuService: MediaTransportService;
    private producer: Producer | null = null;
    private currentStream: MediaStream | null = null;

    constructor() {
        this.sfuService = MediaTransportService.getInstance();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new VideoChatService();
        }
        return this.instance;
    }

    public async startVideoChat() {
        if (this.producer) {
            return this.producer;
        }

        const videoOptions = {
            width: { min: 640, ideal: 1920, max: 1920 },
            height: { min: 480, ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: "user",
        };

        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoOptions,
            audio: false,
        });

        const videoTrack = stream.getVideoTracks()[0];
        
        
        

        this.currentStream = stream;
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
}
