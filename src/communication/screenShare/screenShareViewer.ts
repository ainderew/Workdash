import { Consumer } from "mediasoup-client/types";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import useUserStore from "@/common/store/useStore";
import usePlayersStore from "@/common/store/playerStore";
import { ConsumerData } from "./_types";

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
                source,
            }: {
                producerId: string;
                userName: string;
                source: string;
            }) => {
                if (source !== "screen") return;

                this.videoOwnerMap[producerId] = userName;
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
        // Wait for playerMap to be populated (with timeout)
        console.log("⏳ Waiting for players to load before loading producers...");
        await this.waitForPlayers();

        const producers = await new Promise<
            { producerId: string; socketId: string; source: string; userName?: string }[]
        >((resolve) => {
            this.service.socket.emit("getProducers", {}, resolve);
        });

        console.log(`Found ${producers.length} existing producers`, producers);
        const relevantProducers = producers.filter(
            (producer) => producer.source === "screen",
        );

        for (const producer of relevantProducers) {
            // Store userName if available
            if (producer.userName) {
                console.log("📝 Storing userName for producer:", producer.producerId, "→", producer.userName);
                this.videoOwnerMap[producer.producerId] = producer.userName;
            } else {
                // Look up player name from playerStore using socketId
                const playerMap = usePlayersStore.getState().playerMap;
                console.log("🔍 DEBUG: Looking up socketId:", producer.socketId);
                console.log("🔍 DEBUG: PlayerMap keys:", Object.keys(playerMap));

                const player = playerMap[producer.socketId];
                if (player?.name) {
                    console.log("📝 Found userName in playerStore:", producer.producerId, "→", player.name);
                    this.videoOwnerMap[producer.producerId] = player.name;
                } else {
                    console.warn("⚠️ No player found in playerStore for socketId:", producer.socketId);
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
                console.log(`✅ Players loaded (${playerCount} players in map)`);
                return;
            }

            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.warn("⚠️ Timeout waiting for players - proceeding anyway");
    }


    private async consumeProducer(producerId: string): Promise<void> {
        try {
            const consumerData = await new Promise<ConsumerData>((resolve) => {
                this.service.socket.emit(
                    "consume",
                    {
                        producerId,
                        rtpCapabilities: this.service.device!.rtpCapabilities,
                        transportId: this.service.recvTransport!.id,
                    },
                    resolve,
                );
            });

            const consumer = await this.service.recvTransport!.consume({
                id: consumerData.id,
                producerId: consumerData.producerId,
                kind: consumerData.kind,
                rtpParameters: consumerData.rtpParameters,
            });

            await new Promise((resolve) => {
                this.service.socket.emit(
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
        } catch (error) {
            console.error("Error consuming producer:", error);
        }
    }

    private displayVideo(producerId: string, consumer: Consumer): void {
        if (!this.updateComponentStateCallback) return;

        // Check if track is live/active
        if (consumer.track.readyState !== 'live') {
            console.warn("⚠️ Skipping dead track for producer:", producerId, "readyState:", consumer.track.readyState);
            // Close the consumer for this dead track
            consumer.close();
            this.consumers.delete(producerId);
            return;
        }

        console.log("✅ Creating video element for producer:", producerId, "track state:", consumer.track.readyState);

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

        // Monitor track state changes
        consumer.track.onended = () => {
            console.log("🛑 Track ended for producer:", producerId);
            this.removeScreenShareVideo(producerId);
        };

        // Set up timeout to detect black screens (no data received)
        let hasReceivedData = false;
        const dataCheckTimeout = setTimeout(() => {
            if (!hasReceivedData) {
                console.warn("⚠️ No data received for producer:", producerId, "after 3s - removing");
                this.removeScreenShareVideo(producerId);
            }
        }, 3000);

        videoEl.onloadeddata = () => {
            hasReceivedData = true;
            clearTimeout(dataCheckTimeout);
            console.log("📺 Video data loaded for producer:", producerId);
        };

        this.videoElements.set(producerId, videoEl);
        this.updateComponentStateCallback!();
    }

    public removeScreenShareVideo(producerId: string) {
        console.log("🧹 Removing screenshare producer:", producerId);

        // Close and remove the consumer
        const consumer = this.consumers.get(producerId);
        if (consumer) {
            console.log("🔒 Closing consumer for producer:", producerId);
            consumer.close();
            this.consumers.delete(producerId);
        }

        // Remove the video element
        const videoEl = this.videoElements.get(producerId);
        if (videoEl) {
            console.log("🗑️ Removing video element for producer:", producerId);
            videoEl.srcObject = null; // Clear the stream
            videoEl.remove(); // Remove from DOM if attached
            this.videoElements.delete(producerId);
        }

        // Remove from owner map
        delete this.videoOwnerMap[producerId];

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

        console.log("✅ Screenshare cleanup complete for producer:", producerId);
    }

    public cleanup(): void {
        if (!this.updateComponentStateCallback) return;
        this.consumers.forEach((consumer) => consumer.close());
        this.videoElements.forEach((el) => el.remove());
        this.consumers.clear();
        this.videoElements.clear();
        this.updateComponentStateCallback!();
    }
}
