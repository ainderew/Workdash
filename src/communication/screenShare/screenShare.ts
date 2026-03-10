import { Producer } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import { CallSignalingService } from "../callSignaling/callSignalingService";
import useCallStore from "@/common/store/callStore";

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

    public getCurrentStream(): MediaStream | null {
        return this.currentStream;
    }

    public async startScreenShare() {
        if (this.screenProducer) {
            return this.currentStream;
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: "monitor", 
                width: { max: 1920, ideal: 1920 },
                height: { max: 1080, ideal: 1080 },
                frameRate: { max: 30, ideal: 30 },
            },
            audio: {
                echoCancellation: true, 
                noiseSuppression: true,
                autoGainControl: false,
                
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
            this.stopScreenShare();
        };

        return stream;
    }

    public pauseProducer() {
        if (this.screenProducer && !this.screenProducer.closed) {
            this.screenProducer.pause();
        }
    }

    public resumeProducer() {
        if (this.screenProducer && !this.screenProducer.closed) {
            this.screenProducer.resume();
        }
    }

    public stopScreenShare(): void {
        if (!this.screenProducer) {
            return;
        }

        const producerId = this.screenProducer.id;

        this.sfuService.socket.emit("producerClosed", {
            producerId: producerId,
            kind: "video",
        });

        if (this.currentStream) {
            this.currentStream.getTracks().forEach((track) => {
                track.stop();
            });
            this.currentStream = null;
        }

        this.screenProducer.close();
        this.screenProducer = null;

        // Notify call participants that screen share stopped
        const currentCall = useCallStore.getState().currentCall;
        if (currentCall) {
            CallSignalingService.getInstance().setMedia(currentCall.channelId, {
                screen: false,
            });
        }
    }
}
