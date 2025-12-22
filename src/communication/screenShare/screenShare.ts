import { Producer } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";

export class ScreenShareService {
    private sfuService: MediaTransportService;
    private screenProducer: Producer | null = null;
    private currentStream: MediaStream | null = null;
    public static instance: ScreenShareService | null = null;

    constructor() {
        this.sfuService = MediaTransportService.getInstance();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new ScreenShareService();
        }

        return this.instance;
    }

    public async startScreenShare() {
        if (this.screenProducer) {
            return this.currentStream;
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: "monitor", // Hint preference (user can override)
                width: { max: 1920, ideal: 1920 },
                height: { max: 1080, ideal: 1080 },
                frameRate: { max: 30, ideal: 30 },
            },
            audio: {
                echoCancellation: true, // System audio if supported
                noiseSuppression: true,
                autoGainControl: false,
                // sampleRate: 44100
            },
        });

        this.currentStream = stream;
        const videoTrack = stream.getVideoTracks()[0];

        this.screenProducer = await this.sfuService.sendTransport!.produce({
            track: videoTrack,
            appData: {
                source: "screen",
            },
        });

        videoTrack.onended = () => {
            console.log("Screen sharing has been stopped by the user.");
            this.stopScreenShare();
        };

        return stream;
    }

    public stopScreenShare(): void {
        this.sfuService.socket.emit("producerClosed", {
            producerId: this.screenProducer!.id,
            kind: "video", // or "screen"
        });

        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => track.stop());
            this.currentStream = null;
        }
        if (this.screenProducer) {
            this.screenProducer.close();
            this.screenProducer = null;
        }

        // if (this.systemAudioProducer) {
        //     this.systemAudioProducer.close();
        //     this.systemAudioProducer = null;
        // }
    }
}
