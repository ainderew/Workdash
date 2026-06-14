import { Producer } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportService";
import { CallSignalingService } from "../callSignaling/callSignalingService";
import useCallStore from "@/common/store/callStore";
import { assertTransportReady } from "@/communication/utils/emitWithTimeout";

export class ScreenShareService {
    private sfuService: MediaTransportService;
    private screenProducer: Producer | null = null;
    private screenAudioProducer: Producer | null = null;
    private currentStream: MediaStream | null = null;
    private starting = false;
    private static instance: ScreenShareService | null = null;

    private constructor() {
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
        if (this.screenProducer || this.starting) {
            return this.currentStream;
        }
        this.starting = true;

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: "monitor",
                    width: { max: 1920, ideal: 1920 },
                    height: { max: 1080, ideal: 1080 },
                    frameRate: { max: 30, ideal: 30 },
                },
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });

            this.currentStream = stream;
            const videoTrack = stream.getVideoTracks()[0];

            // Bias the encoder toward spatial detail (crisp text/UI) over
            // smooth framerate — screen content is mostly static.
            if ("contentHint" in videoTrack) {
                (videoTrack as MediaStreamTrack & { contentHint: string }).contentHint =
                    "detail";
            }

            assertTransportReady(this.sfuService.sendTransport, "Send");
            // Two-layer simulcast so viewers can pull a cheap thumbnail layer
            // (spatial 0) or the full-res layer (spatial 1) on demand. The
            // focused/staged screen requests high; thumbnails request low.
            // See screenLayerController.ts. Capped at 2 layers to bound the
            // sharer's encode cost.
            this.screenProducer = await this.sfuService.sendTransport.produce({
                track: videoTrack,
                encodings: [
                    { rid: "low", scaleResolutionDownBy: 2, maxBitrate: 600_000, maxFramerate: 30 },
                    { rid: "high", scaleResolutionDownBy: 1, maxBitrate: 5_000_000, maxFramerate: 30 },
                ],
                codecOptions: { videoGoogleStartBitrate: 1000 },
                appData: {
                    source: "screen",
                },
            });

            // Produce screen share audio if available
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                assertTransportReady(this.sfuService.sendTransport, "Send");
                this.screenAudioProducer = await this.sfuService.sendTransport.produce({
                    track: audioTracks[0],
                    appData: { source: "screen-audio" },
                });
            }

            videoTrack.onended = () => {
                this.stopScreenShare();
            };

            return stream;
        } catch (error) {
            // Roll back partially-constructed state so the stream doesn't leak
            if (this.currentStream) {
                this.currentStream.getTracks().forEach((track) => track.stop());
                this.currentStream = null;
            }
            if (this.screenAudioProducer && !this.screenAudioProducer.closed) {
                this.sfuService.socket.emit("producerClosed", {
                    producerId: this.screenAudioProducer.id,
                    kind: "audio",
                });
                this.screenAudioProducer.close();
                this.screenAudioProducer = null;
            }
            if (this.screenProducer && !this.screenProducer.closed) {
                this.sfuService.socket.emit("producerClosed", {
                    producerId: this.screenProducer.id,
                    kind: "video",
                });
                this.screenProducer.close();
                this.screenProducer = null;
            }
            throw error;
        } finally {
            this.starting = false;
        }
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
        if (!this.screenProducer || this.screenProducer.closed) {
            return;
        }

        // Close screen audio producer first (prevents orphaned audio stream)
        if (this.screenAudioProducer && !this.screenAudioProducer.closed) {
            this.sfuService.socket.emit("producerClosed", {
                producerId: this.screenAudioProducer.id,
                kind: "audio",
            });
            this.screenAudioProducer.close();
            this.screenAudioProducer = null;
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
