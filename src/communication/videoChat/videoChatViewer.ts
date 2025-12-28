import useUserStore from "@/common/store/useStore";
import usePlayersStore from "@/common/store/playerStore";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import { ConsumerData } from "../screenShare/_types";
import { Consumer } from "mediasoup-client/types";

export class VideoChatViewer {
    public static instance: VideoChatViewer | null = null;
    private sfuService: MediaTransportService;
    private consumers: Map<string, Consumer> = new Map();
    public videoElements: Map<string, HTMLVideoElement> = new Map();
    public videoChatOwnerMap: Record<string, string> = {};
    public updateComponentStateCallback: (() => void) | null = null;

    constructor() {
        this.sfuService = MediaTransportService.getInstance();
        this.setupListeners();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new VideoChatViewer();
        }
        return this.instance;
    }

    private setupListeners(): void {
        this.sfuService.socket.on(
            "newProducer",
            async ({
                producerId,
                userName,
                source,
            }: {
                producerId: string;
                userName: string;
                source: string;
            }) => {
                if (source !== "camera") return;

                this.videoChatOwnerMap[producerId] = userName;
                await this.consumeProducer(producerId);
            },
        );

        this.sfuService.socket.on(
            "endScreenShare",
            ({ producerId }: { producerId: string }) => {
                this.removeScreenShareVideo(producerId);
            },
        );
    }

    private async consumeProducer(producerId: string): Promise<void> {
        try {
            const consumerData = await new Promise<ConsumerData>((resolve) => {
                this.sfuService.socket.emit(
                    "consume",
                    {
                        producerId,
                        rtpCapabilities:
                            this.sfuService.device!.rtpCapabilities,
                        transportId: this.sfuService.recvTransport!.id,
                    },
                    resolve,
                );
            });

            const consumer = await this.sfuService.recvTransport!.consume({
                id: consumerData.id,
                producerId: consumerData.producerId,
                kind: consumerData.kind,
                rtpParameters: consumerData.rtpParameters,
            });

            await new Promise((resolve) => {
                this.sfuService.socket.emit(
                    "resumeConsumer",
                    {
                        consumerId: consumer.id,
                    },
                    resolve,
                );
            });

            const currentProducerIds =
                useUserStore.getState().user.producerIds ?? [];

            this.consumers.set(producerId, consumer);
            useUserStore.getState().updateUser({
                producerIds: [...currentProducerIds, producerId],
            });

            if (consumerData.kind === "video") {
                this.displayVideo(producerId, consumer);
            }
        } catch {
            alert("something went wrong");
        }
    }

    public async loadExistingProducers(): Promise<void> {
        await this.waitForPlayers();

        const producers = await new Promise<
            {
                producerId: string;
                socketId: string;
                source: string;
                userName?: string;
            }[]
        >((resolve) => {
            this.sfuService.socket.emit("getProducers", {}, resolve);
        });

        const relevantProducers = producers.filter(
            (p) => p.source === "camera",
        );

        for (const producer of relevantProducers) {
            if (producer.userName) {
                this.videoChatOwnerMap[producer.producerId] = producer.userName;
            } else {
                const playerMap = usePlayersStore.getState().playerMap;
                const player = playerMap[producer.socketId];
                if (player?.name) {
                    this.videoChatOwnerMap[producer.producerId] = player.name;
                } else {
                    this.videoChatOwnerMap[producer.producerId] =
                        "Unknown User";
                }
            }
            await this.consumeProducer(producer.producerId);
        }
    }

    private async waitForPlayers(maxWaitMs: number = 5000): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            const playerMap = usePlayersStore.getState().playerMap;
            const playerCount = Object.keys(playerMap).length;

            if (playerCount > 0) {
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    private displayVideo(producerId: string, consumer: Consumer): void {
        if (!this.updateComponentStateCallback) return;

        if (consumer.track.readyState !== "live") {
            consumer.close();
            this.consumers.delete(producerId);
            return;
        }

        const videoEl = document.createElement("video") as HTMLVideoElement;
        videoEl.srcObject = new MediaStream([consumer.track]);
        videoEl.autoplay = true;
        videoEl.controls = false;
        videoEl.style.width = "100%";
        videoEl.dataset.producerId = producerId;

        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "contain";
        videoEl.style.backgroundColor = "#000";
        videoEl.style.display = "block";

        consumer.track.onended = () => {
            this.removeScreenShareVideo(producerId);
        };

        let hasReceivedData = false;
        const dataCheckTimeout = setTimeout(() => {
            if (!hasReceivedData) {
                this.removeScreenShareVideo(producerId);
            }
        }, 3000);

        videoEl.onloadeddata = () => {
            hasReceivedData = true;
            clearTimeout(dataCheckTimeout);
        };

        this.videoElements.set(producerId, videoEl);
        this.updateComponentStateCallback!();
    }

    public removeScreenShareVideo(producerId: string) {
        const consumer = this.consumers.get(producerId);
        if (consumer) {
            consumer.close();
            this.consumers.delete(producerId);
        }
        const videoEl = this.videoElements.get(producerId);
        if (videoEl) {
            videoEl.srcObject = null;
            videoEl.remove();
            this.videoElements.delete(producerId);
        }
        delete this.videoChatOwnerMap[producerId];
        const currentProducerIds =
            useUserStore.getState().user.producerIds ?? [];
        const updatedProducerIds = currentProducerIds.filter(
            (id) => id !== producerId,
        );
        useUserStore.getState().updateUser({
            producerIds: updatedProducerIds,
        });
        if (this.updateComponentStateCallback) {
            this.updateComponentStateCallback();
        }
    }
}
