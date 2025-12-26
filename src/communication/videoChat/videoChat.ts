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
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: "user",
        };

        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoOptions,
            audio: false,
        });

        const videoTrack = stream.getVideoTracks()[0];
        // Display in a video element
        // const videoElement = document.getElementById("localVideo");
        // videoElement!.srcObject = stream;

        this.currentStream = stream;
        this.producer = await this.sfuService.sendTransport!.produce({
            track: videoTrack,
            appData: {
                source: "camera",
            },
        });
    }

    public stopVideoChat() {
        this.sfuService.socket.emit("producerClosed", {
            producerId: this.producer!.id,
            kind: "video",
        });

        if (this.producer) {
            this.producer.close();
            this.producer = null;
        }
        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => track.stop());
            this.currentStream = null;
        }
    }

    public getCurrentStream() {
        return this.currentStream;
    }
}
