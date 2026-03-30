import useUserStore from "@/common/store/useStore";
import usePlayersStore from "@/common/store/playerStore";
import useCallStore from "@/common/store/callStore";
import useUiStore from "@/common/store/uiStore";
import { MediaTransportService } from "../mediaTransportService/mediaTransportService";
import { ConsumerData } from "../screenShare/_types";
import { Consumer } from "mediasoup-client/types";
import {
    emitWithTimeout,
    SFU_TIMEOUTS,
    validateNoError,
} from "@/communication/utils/emitWithTimeout";
import { logger } from "@/common/utils/logger";

export class VideoChatViewer {
    public static instance: VideoChatViewer | null = null;
    private sfuService: MediaTransportService;
    private consumers: Map<string, Consumer> = new Map();
    private consumingInFlight = new Set<string>();
    /** MediaStream per producer — used by desk-mode tiles to avoid double video decode */
    public videoStreams: Map<string, MediaStream> = new Map();
    /** HTMLVideoElement per producer — used by world-mode hooks that mount elements into the DOM */
    public videoElements: Map<string, HTMLVideoElement> = new Map();
    public videoChatOwnerMap: Record<string, string> = {};
    public updateComponentStateCallback: (() => void) | null = null;
    private stateListeners = new Set<() => void>();

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

    public onStateUpdate(cb: () => void): void {
        this.stateListeners.add(cb);
    }

    public offStateUpdate(cb: () => void): void {
        this.stateListeners.delete(cb);
    }

    private notifyStateListeners(): void {
        this.updateComponentStateCallback?.();
        this.stateListeners.forEach((cb) => cb());
    }

    private setupListeners(): void {
        this.sfuService.socket.on(
            "newProducer",
            async ({
                producerId,
                userName,
                userId,
                source,
            }: {
                producerId: string;
                userName: string;
                userId?: number;
                source: string;
            }) => {
                if (source !== "camera") return;
                if (!useCallStore.getState().isCallOwner) return;

                this.videoChatOwnerMap[producerId] = userName;
                if (userId != null) {
                    useCallStore.getState().setProducerUser(producerId, userId);
                }
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
        if (this.consumers.has(producerId) || this.consumingInFlight.has(producerId)) {
            return;
        }
        this.consumingInFlight.add(producerId);

        try {
            if (!this.sfuService.device || !this.sfuService.recvTransport) {
                logger.error("Cannot consume video — SFU not initialized");
                return;
            }

            const consumerData = await emitWithTimeout<ConsumerData>({
                socket: this.sfuService.socket,
                event: "consume",
                data: {
                    producerId,
                    rtpCapabilities:
                        this.sfuService.device!.rtpCapabilities,
                    transportId: this.sfuService.recvTransport!.id,
                },
                timeoutMs: SFU_TIMEOUTS.CONSUME,
                validate: validateNoError,
            });

            const consumer = await this.sfuService.recvTransport!.consume({
                id: consumerData.id,
                producerId: consumerData.producerId,
                kind: consumerData.kind,
                rtpParameters: consumerData.rtpParameters,
            });

            await emitWithTimeout<unknown>({
                socket: this.sfuService.socket,
                event: "resumeConsumer",
                data: { consumerId: consumer.id },
                timeoutMs: SFU_TIMEOUTS.RESUME_CONSUMER,
                validate: validateNoError,
            });

            const currentProducerIds =
                useUserStore.getState().user.producerIds ?? [];

            this.consumers.set(producerId, consumer);
            useCallStore.getState().setProducerConsumer(producerId, consumer.id);
            useUserStore.getState().updateUser({
                producerIds: [...currentProducerIds, producerId],
            });

            if (consumerData.kind === "video") {
                this.displayVideo(producerId, consumer);
            }
        } catch (err) {
            logger.error("Failed to consume producer:", err);
        } finally {
            this.consumingInFlight.delete(producerId);
        }
    }

    public async loadExistingProducers(): Promise<void> {
        // In desk mode there are no Phaser players; skip the wait.
        if (useUiStore.getState().interactionMode !== "desk") {
            await this.waitForPlayers();
        }

        const producers = await emitWithTimeout<
            {
                producerId: string;
                socketId: string;
                source: string;
                userName?: string;
                userId?: number;
            }[]
        >({
            socket: this.sfuService.socket,
            event: "getProducers",
            data: {},
            timeoutMs: SFU_TIMEOUTS.GET_PRODUCERS,
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
            if (producer.userId != null) {
                useCallStore.getState().setProducerUser(producer.producerId, producer.userId);
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
        if (consumer.track.readyState !== "live") {
            consumer.close();
            this.consumers.delete(producerId);
            return;
        }

        const stream = new MediaStream([consumer.track]);
        this.videoStreams.set(producerId, stream);

        // World-mode backing element — only plays when mounted into the DOM
        const videoEl = document.createElement("video") as HTMLVideoElement;
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.controls = false;
        videoEl.dataset.producerId = producerId;
        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "contain";
        this.videoElements.set(producerId, videoEl);

        consumer.track.onended = () => {
            this.removeScreenShareVideo(producerId);
        };

        this.notifyStateListeners();
    }

    public pauseAllConsumers() {
        this.consumers.forEach((consumer) => consumer.pause());
    }

    public resumeAllConsumers() {
        this.consumers.forEach((consumer) => consumer.resume());
    }

    public closeAllConsumers(): void {
        const producerIds = Array.from(this.consumers.keys());
        for (const producerId of producerIds) {
            this.removeScreenShareVideo(producerId);
        }
    }

    public removeScreenShareVideo(producerId: string) {
        const consumer = this.consumers.get(producerId);
        if (consumer) {
            consumer.close();
            this.consumers.delete(producerId);
        }
        this.videoStreams.delete(producerId);
        const videoEl = this.videoElements.get(producerId);
        if (videoEl) {
            videoEl.srcObject = null;
            videoEl.remove();
            this.videoElements.delete(producerId);
        }
        delete this.videoChatOwnerMap[producerId];
        useCallStore.getState().removeProducer(producerId);
        const currentProducerIds =
            useUserStore.getState().user.producerIds ?? [];
        const updatedProducerIds = currentProducerIds.filter(
            (id) => id !== producerId,
        );
        useUserStore.getState().updateUser({
            producerIds: updatedProducerIds,
        });
        this.notifyStateListeners();
    }
}
