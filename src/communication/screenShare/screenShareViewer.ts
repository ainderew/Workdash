import { Consumer } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportService";
import useUserStore from "@/common/store/useStore";
import usePlayersStore from "@/common/store/playerStore";
import useCallStore from "@/common/store/callStore";
import useUiStore from "@/common/store/uiStore";
import { logger } from "@/common/utils/logger";
import { ConsumerData } from "./_types";
import {
    emitWithTimeout,
    SFU_TIMEOUTS,
    validateNoError,
} from "@/communication/utils/emitWithTimeout";

export class ScreenShareViewer {
    private static instance: ScreenShareViewer | null = null;
    private service: MediaTransportService;
    private consumers: Map<string, Consumer> = new Map();
    public videoElements: Map<string, HTMLVideoElement> = new Map();
    public videoOwnerMap: Record<string, string> = {};
    public updateComponentStateCallback: (() => void) | null = null;

    private constructor() {
        this.service = MediaTransportService.getInstance();
        this.setupListeners();
    }

    public static getInstance(): ScreenShareViewer {
        if (!ScreenShareViewer.instance) {
            ScreenShareViewer.instance = new ScreenShareViewer();
        }
        return ScreenShareViewer.instance;
    }

    private setupListeners(): void {
        this.service.socket.on(
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
                if (source !== "screen") return;

                this.videoOwnerMap[producerId] = userName;
                if (userId != null) {
                    useCallStore.getState().setScreenProducerUser(producerId, userId);
                }
                await this.consumeProducer(producerId);
            },
        );

        this.service.socket.on(
            "endScreenShare",
            ({ producerId }: { producerId: string }) => {
                this.removeScreenShareVideo(producerId);
            },
        );
    }

    public async loadExistingProducers(): Promise<void> {
        // In desk mode there are no Phaser players; skip the wait.
        if (useUiStore.getState().interactionMode !== "desk") {
            logger.log("Waiting for players to load before loading producers...");
            await this.waitForPlayers();
        }

        const producers = await emitWithTimeout<
            { producerId: string; socketId: string; source: string; userName?: string; userId?: number }[]
        >({
            socket: this.service.socket,
            event: "getProducers",
            data: {},
            timeoutMs: SFU_TIMEOUTS.GET_PRODUCERS,
        });

        logger.log(`Found ${producers.length} existing producers`, producers);
        const relevantProducers = producers.filter(
            (producer) => producer.source === "screen",
        );

        for (const producer of relevantProducers) {
            // Store userId mapping for screen share tiles
            if (producer.userId != null) {
                useCallStore.getState().setScreenProducerUser(producer.producerId, producer.userId);
            }

            // Store userName if available
            if (producer.userName) {
                logger.log("📝 Storing userName for producer:", producer.producerId, "→", producer.userName);
                this.videoOwnerMap[producer.producerId] = producer.userName;
            } else {
                // Look up player name from playerStore using socketId
                const playerMap = usePlayersStore.getState().playerMap;

                const player = playerMap[producer.socketId];
                if (player?.name) {
                    logger.log("📝 Found userName in playerStore:", producer.producerId, "→", player.name);
                    this.videoOwnerMap[producer.producerId] = player.name;
                } else {
                    logger.warn("No player found in playerStore for socketId:", producer.socketId);
                    this.videoOwnerMap[producer.producerId] = "Unknown User";
                }
            }

            // Consume producer immediately
            await this.consumeProducer(producer.producerId);
        }
    }

    private async waitForPlayers(maxWaitMs: number = 5000): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            const playerMap = usePlayersStore.getState().playerMap;
            const playerCount = Object.keys(playerMap).length;

            if (playerCount > 0) {
                logger.log(`✅ Players loaded (${playerCount} players in map)`);
                return;
            }

            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        logger.warn("Timeout waiting for players - proceeding anyway");
    }


    private async consumeProducer(producerId: string): Promise<void> {
        try {
            const consumerData = await emitWithTimeout<ConsumerData>({
                socket: this.service.socket,
                event: "consume",
                data: {
                    producerId,
                    rtpCapabilities: this.service.device!.rtpCapabilities,
                    transportId: this.service.recvTransport!.id,
                },
                timeoutMs: SFU_TIMEOUTS.CONSUME,
                validate: validateNoError,
            });

            const consumer = await this.service.recvTransport!.consume({
                id: consumerData.id,
                producerId: consumerData.producerId,
                kind: consumerData.kind,
                rtpParameters: consumerData.rtpParameters,
            });

            await emitWithTimeout<unknown>({
                socket: this.service.socket,
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
        } catch (error) {
            logger.error("Error consuming producer:", error);
        }
    }

    private displayVideo(producerId: string, consumer: Consumer): void {
        if (!this.updateComponentStateCallback) return;

        // Check if track is live/active
        if (consumer.track.readyState !== 'live') {
            logger.warn("Skipping dead track for producer:", producerId, "readyState:", consumer.track.readyState);
            // Close the consumer for this dead track
            consumer.close();
            this.consumers.delete(producerId);
            return;
        }

        logger.log("✅ Creating video element for producer:", producerId, "track state:", consumer.track.readyState);

        const videoEl = document.createElement("video") as HTMLVideoElement;
        videoEl.srcObject = new MediaStream([consumer.track]);
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.controls = false;
        videoEl.style.width = "100%";
        videoEl.dataset.producerId = producerId;

        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "contain";
        videoEl.style.backgroundColor = "#000";
        videoEl.style.display = "block";

        // Monitor track state changes
        consumer.track.onended = () => {
            logger.log("🛑 Track ended for producer:", producerId);
            this.removeScreenShareVideo(producerId);
        };

        // Set up timeout to detect black screens (no data received)
        let hasReceivedData = false;
        const dataCheckTimeout = setTimeout(() => {
            if (!hasReceivedData) {
                logger.warn("No data received for producer:", producerId, "after 10s - removing");
                this.removeScreenShareVideo(producerId);
            }
        }, 10000);

        videoEl.onloadeddata = () => {
            hasReceivedData = true;
            clearTimeout(dataCheckTimeout);
            logger.log("📺 Video data loaded for producer:", producerId);
        };

        this.videoElements.set(producerId, videoEl);
        this.updateComponentStateCallback!();
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
        logger.log("🧹 Removing screenshare producer:", producerId);

        // Close and remove the consumer
        const consumer = this.consumers.get(producerId);
        if (consumer) {
            logger.log("🔒 Closing consumer for producer:", producerId);
            consumer.close();
            this.consumers.delete(producerId);
        }

        // Remove the video element
        const videoEl = this.videoElements.get(producerId);
        if (videoEl) {
            logger.log("🗑️ Removing video element for producer:", producerId);
            videoEl.srcObject = null; // Clear the stream
            videoEl.remove(); // Remove from DOM if attached
            this.videoElements.delete(producerId);
        }

        // Remove from owner map and callStore screen producer map
        delete this.videoOwnerMap[producerId];
        useCallStore.getState().removeScreenProducer(producerId);

        // Remove from user store
        const currentProducerIds = useUserStore.getState().user.producerIds ?? [];
        const updatedProducerIds = currentProducerIds.filter(id => id !== producerId);
        useUserStore.getState().updateUser({
            producerIds: updatedProducerIds,
        });

        // Update UI
        if (this.updateComponentStateCallback) {
            this.updateComponentStateCallback();
        }

        logger.log("✅ Screenshare cleanup complete for producer:", producerId);
    }

    public cleanup(): void {
        this.consumers.forEach((consumer) => consumer.close());
        this.videoElements.forEach((el) => {
            el.srcObject = null;
            el.remove();
        });
        this.consumers.clear();
        this.videoElements.clear();
        this.videoOwnerMap = {};
        this.updateComponentStateCallback?.();
    }
}
