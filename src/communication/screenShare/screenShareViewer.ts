import { Consumer } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportService";
import useUserStore from "@/common/store/useStore";
import usePlayersStore from "@/common/store/playerStore";
import useCallStore from "@/common/store/callStore";
import useUiStore from "@/common/store/uiStore";
import { logger } from "@/common/utils/logger";
import { ConsumerData } from "./_types";
import { SfuEvents } from "@/types/sfuEvents";
import {
    emitWithTimeout,
    SFU_TIMEOUTS,
    validateNoError,
} from "@/communication/utils/emitWithTimeout";

export class ScreenShareViewer {
    private static instance: ScreenShareViewer | null = null;
    private service: MediaTransportService;
    private consumers: Map<string, Consumer> = new Map();
    private _videoElements: Map<string, HTMLVideoElement> = new Map();
    private _videoOwnerMap: Record<string, string> = {};
    private _subscribers: Set<() => void> = new Set();
    private dataCheckTimers: Map<string, ReturnType<typeof setTimeout>> =
        new Map();

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

    public get videoElements(): ReadonlyMap<string, HTMLVideoElement> {
        return this._videoElements;
    }

    public get videoOwnerMap(): Readonly<Record<string, string>> {
        return this._videoOwnerMap;
    }

    public subscribe(callback: () => void): () => void {
        this._subscribers.add(callback);
        return () => {
            this._subscribers.delete(callback);
        };
    }

    private notifySubscribers(): void {
        for (const cb of this._subscribers) {
            cb();
        }
    }

    private setupListeners(): void {
        this.service.socket.on(
            SfuEvents.NEW_PRODUCER,
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
                if (!useCallStore.getState().isCallOwner) return;

                this._videoOwnerMap[producerId] = userName;
                if (userId != null) {
                    useCallStore
                        .getState()
                        .setScreenProducerUser(producerId, userId);
                }
                await this.consumeProducer(producerId);
            },
        );

        this.service.socket.on(
            SfuEvents.PRODUCER_REMOVED,
            ({ producerId }: { producerId: string }) => {
                this.removeScreenShareVideo(producerId);
            },
        );
    }

    public async loadExistingProducers(): Promise<void> {
        // In desk mode there are no Phaser players; skip the wait.
        if (useUiStore.getState().interactionMode !== "desk") {
            logger.log(
                "Waiting for players to load before loading producers...",
            );
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
                useCallStore
                    .getState()
                    .setScreenProducerUser(
                        producer.producerId,
                        producer.userId,
                    );
            }

            // Store userName if available
            if (producer.userName) {
                logger.log(
                    "📝 Storing userName for producer:",
                    producer.producerId,
                    "→",
                    producer.userName,
                );
                this._videoOwnerMap[producer.producerId] = producer.userName;
            } else {
                // Look up player name from playerStore using socketId
                const playerMap = usePlayersStore.getState().playerMap;
                const player = playerMap[producer.socketId];
                if (player?.name) {
                    logger.log(
                        "📝 Found userName in playerStore:",
                        producer.producerId,
                        "→",
                        player.name,
                    );
                    this._videoOwnerMap[producer.producerId] = player.name;
                } else {
                    logger.warn(
                        "No player found in playerStore for socketId:",
                        producer.socketId,
                    );
                    this._videoOwnerMap[producer.producerId] = "Unknown User";
                }
            }
        }

        await Promise.all(
            relevantProducers.map((producer) =>
                this.consumeProducer(producer.producerId),
            ),
        );

        const unknownProducers = relevantProducers.filter(
            (p) => this._videoOwnerMap[p.producerId] === "Unknown User",
        );
        if (unknownProducers.length > 0) {
            const unsub = usePlayersStore.subscribe((state) => {
                let resolved = 0;
                for (const p of unknownProducers) {
                    if (this._videoOwnerMap[p.producerId] !== "Unknown User") {
                        resolved++;
                        continue;
                    }
                    const player = state.playerMap[p.socketId];
                    if (player?.name) {
                        this._videoOwnerMap[p.producerId] = player.name;
                        resolved++;
                    }
                }
                if (resolved === unknownProducers.length) unsub();
                this.notifySubscribers();
            });
            setTimeout(() => unsub(), 30_000);
        }
    }

    private async waitForPlayers(maxWaitMs: number = 5000): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            const playerMap = usePlayersStore.getState().playerMap;
            const playerCount = Object.keys(playerMap).length;

            if (playerCount > 0) {
                logger.log(
                    `✅ Players loaded (${playerCount} players in map)`,
                );
                return;
            }

            // Wait 100ms before checking again
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        logger.warn("Timeout waiting for players - proceeding anyway");
    }

    private static readonly CONSUME_MAX_RETRIES = 3;
    private static readonly CONSUME_RETRY_BASE_MS = 1000;

    private async consumeProducer(
        producerId: string,
        attempt = 0,
    ): Promise<void> {
        try {
            if (!this.service.recvTransport || this.service.recvTransport.closed) {
                throw new Error("recvTransport not available");
            }

            const consumerData = await emitWithTimeout<ConsumerData>({
                socket: this.service.socket,
                event: "consume",
                data: {
                    producerId,
                    rtpCapabilities: this.service.device!.rtpCapabilities,
                    transportId: this.service.recvTransport.id,
                },
                timeoutMs: SFU_TIMEOUTS.CONSUME,
                validate: validateNoError,
            });

            const consumer = await this.service.recvTransport.consume({
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
            useCallStore
                .getState()
                .setProducerConsumer(producerId, consumer.id);
            useUserStore.getState().updateUser({
                producerIds: [...currentProducerIds, producerId],
            });

            if (consumerData.kind === "video") {
                this.displayVideo(producerId, consumer);
                // Quality layer is driven by the rendered tile size via
                // screenLayerController (ScreenShareTile reports its width).
            }
        } catch (error) {
            if (attempt < ScreenShareViewer.CONSUME_MAX_RETRIES) {
                const delayMs =
                    ScreenShareViewer.CONSUME_RETRY_BASE_MS * 2 ** attempt;
                logger.warn(
                    `consumeProducer failed (attempt ${attempt + 1}/${ScreenShareViewer.CONSUME_MAX_RETRIES + 1}), retrying in ${delayMs}ms:`,
                    (error as Error).message,
                );
                await new Promise((r) => setTimeout(r, delayMs));
                // Bail out if the producer was removed while waiting
                if (!useCallStore.getState().screenProducerUserMap[producerId]) {
                    return;
                }
                return this.consumeProducer(producerId, attempt + 1);
            }
            logger.error(
                `consumeProducer failed after ${attempt + 1} attempts:`,
                error,
            );
        }
    }

    private displayVideo(producerId: string, consumer: Consumer): void {
        if (this._subscribers.size === 0) return;

        // Check if track is live/active
        if (consumer.track.readyState !== "live") {
            logger.warn(
                "Skipping dead track for producer:",
                producerId,
                "readyState:",
                consumer.track.readyState,
            );
            // Close the consumer for this dead track
            consumer.close();
            this.consumers.delete(producerId);
            return;
        }

        logger.log(
            "✅ Creating video element for producer:",
            producerId,
            "track state:",
            consumer.track.readyState,
        );

        const videoEl = document.createElement("video") as HTMLVideoElement;
        videoEl.srcObject = new MediaStream([consumer.track]);
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.controls = false;
        videoEl.dataset.producerId = producerId;

        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "contain";
        videoEl.style.backgroundColor = "var(--wd-surface-base)";
        videoEl.style.display = "block";

        // Monitor track state changes
        consumer.track.onended = () => {
            logger.log("🛑 Track ended for producer:", producerId);
            this.removeScreenShareVideo(producerId);
        };

        // Set up timeout to detect black screens (no data received)
        let hasReceivedData = false;
        const dataCheckTimeout = setTimeout(() => {
            this.dataCheckTimers.delete(producerId);
            if (!hasReceivedData) {
                logger.warn(
                    "No data received for producer:",
                    producerId,
                    "after 10s - removing",
                );
                this.removeScreenShareVideo(producerId);
            }
        }, 10000);
        this.dataCheckTimers.set(producerId, dataCheckTimeout);

        videoEl.onloadeddata = () => {
            hasReceivedData = true;
            const timer = this.dataCheckTimers.get(producerId);
            if (timer) {
                clearTimeout(timer);
                this.dataCheckTimers.delete(producerId);
            }
            logger.log("📺 Video data loaded for producer:", producerId);
        };

        this._videoElements.set(producerId, videoEl);
        this.notifySubscribers();
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

        const timer = this.dataCheckTimers.get(producerId);
        if (timer) {
            clearTimeout(timer);
            this.dataCheckTimers.delete(producerId);
        }

        // Close and remove the consumer
        const consumer = this.consumers.get(producerId);
        if (consumer) {
            logger.log("🔒 Closing consumer for producer:", producerId);
            consumer.close();
            this.consumers.delete(producerId);
        }

        // Remove the video element
        const videoEl = this._videoElements.get(producerId);
        if (videoEl) {
            logger.log("🗑️ Removing video element for producer:", producerId);
            videoEl.srcObject = null;
            videoEl.remove();
            this._videoElements.delete(producerId);
        }

        // Remove from owner map and callStore screen producer map
        delete this._videoOwnerMap[producerId];
        useCallStore.getState().removeScreenProducer(producerId);

        // Remove from user store
        const currentProducerIds =
            useUserStore.getState().user.producerIds ?? [];
        const updatedProducerIds = currentProducerIds.filter(
            (id) => id !== producerId,
        );
        useUserStore.getState().updateUser({
            producerIds: updatedProducerIds,
        });

        // Update UI
        this.notifySubscribers();

        logger.log("✅ Screenshare cleanup complete for producer:", producerId);
    }

    public cleanup(): void {
        this.service.socket.off(SfuEvents.PRODUCER_REMOVED);
        for (const timer of this.dataCheckTimers.values()) {
            clearTimeout(timer);
        }
        this.dataCheckTimers.clear();

        const producerIds = Array.from(this.consumers.keys());
        for (const producerId of producerIds) {
            this.removeScreenShareVideo(producerId);
        }
    }
}
