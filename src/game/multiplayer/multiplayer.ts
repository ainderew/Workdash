import io from "socket.io-client";
import { PlayerInterface } from "../player/_types";
import { PlayerDto } from "./_types";
import { CONFIG } from "@/common/utils/config";
import usePlayersStore from "@/common/store/playerStore";
import { AvailabilityStatus } from "../player/_enums";

// Type definition for queued commands
type QueuedMessage = {
    event: string;
    payload: any;
};

export class Multiplayer {
    public socket: SocketIOClient.Socket;

    // STATE: Tracks if the backend logic is actually ready (post-DB load)
    private isBackendReady: boolean = false;

    // QUEUE: Buffer for events fired before the backend was ready
    private messageQueue: QueuedMessage[] = [];

    constructor(jwtToken?: string) {
        console.log(
            "Multiplayer constructor - JWT token:",
            jwtToken ? "present (length: " + jwtToken.length + ")" : "MISSING",
        );

        this.socket = io(CONFIG.SFU_SERVER_URL, {
            autoConnect: false,
            auth: {
                token: jwtToken || "",
            },
        });

        this.setupLifecycleEvents();
    }

    /**
     * Sets up the core network lifecycle listeners.
     * Separated from constructor for cleanliness.
     */
    private setupLifecycleEvents() {
        // 1. Physical Connection Established
        this.socket.on("connect", () => {
            console.log("🔌 Socket Connected (Waiting for Logic Init...)");
        });

        // 2. Physical Disconnection
        this.socket.on("disconnect", (reason) => {
            console.warn(`🔌 Socket Disconnected: ${reason}`);
            this.isBackendReady = false; // Reset readiness
        });

        this.socket.on("connect_error", (error) => {
            console.error("❌ Socket connection error:", error.message);
        });

        // 3. LOGICAL Readiness (The Critical Fix)
        // This event comes from the backend AFTER it has loaded the user from DB
        this.socket.on("sfuInitialized", () => {
            console.log("🟢 SFU Initialized - Backend Logic Ready");
            this.isBackendReady = true;
            this.flushMessageQueue();
        });
    }

    // =========================================================================
    //  THE ENGINE (The "Senior" Architecture Part)
    // =========================================================================

    /**
     * Generic sender that handles buffering automatically.
     * If the backend isn't ready, the message is queued.
     * If the backend is ready, it sends immediately.
     */
    private send(event: string, payload: any) {
        // Condition: Socket must be physically connected AND Logically ready
        if (this.socket.connected && this.isBackendReady) {
            this.socket.emit(event, payload);
        } else {
            // Log for debugging
            const status = !this.socket.connected
                ? "Not Connected"
                : "Backend Not Ready";
            console.log(`⏳ Queueing event '${event}' (${status})`);

            // Add to queue
            this.messageQueue.push({ event, payload });

            // Fail-safe: Ensure we are at least trying to connect
            if (!this.socket.connected) {
                this.socket.connect();
            }
        }
    }

    /**
     * Flushes all buffered messages in FIFO order.
     */
    private flushMessageQueue() {
        if (this.messageQueue.length === 0) return;

        console.log(
            `🚀 Flushing ${this.messageQueue.length} queued messages...`,
        );

        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) {
                console.log(`   ↳ Sending queued: ${msg.event}`);
                this.socket.emit(msg.event, msg.payload);
            }
        }
    }

    // =========================================================================
    //  PUBLIC API (Clean & Simple)
    // =========================================================================

    public connectToserver() {
        this.socket.connect();
    }

    public disconnectFromServer() {
        this.socket.disconnect();
    }

    /**
     * Usage: multiplayer.joinGame(800, 800);
     * No need to worry about race conditions here anymore.
     */
    public joinGame(x: number, y: number) {
        this.send("playerJoin", { x, y });
    }

    public emitPlayerMovement(data: Partial<PlayerDto>) {
        this.send("playerMovement", data);
    }

    // =========================================================================
    //  INCOMING EVENT LISTENERS (Unchanged logic, just organized)
    // =========================================================================

    public watchNewPlayers(
        createPlayer: (
            id: string,
            name: string | undefined,
            x: number,
            y: number,
            availabilityStatus: AvailabilityStatus,
            customization: any,
            opts: { isLocal: boolean },
        ) => void,
        destroyPlayer: (id: string) => void,
    ) {
        // Handle "currentPlayers" (Bulk load on join)
        this.socket.on(
            "currentPlayers",
            (players: PlayerDto[] | Record<string, PlayerDto>) => {
                console.log("Received currentPlayers:", players);
                const playerList = Array.isArray(players)
                    ? players
                    : Object.values(players);

                playerList.forEach((player) => {
                    this.handlePlayerSync(player, createPlayer);
                });
            },
        );

        // Handle "newPlayer" (Single player joined)
        this.socket.on(
            "newPlayer",
            (
                data: { playerId: string; playerState: PlayerDto } | PlayerDto,
            ) => {
                // Normalize data structure
                const player = "playerState" in data ? data.playerState : data;
                console.log("New player joined:", player);
                this.handlePlayerSync(player as PlayerDto, createPlayer);
            },
        );

        // Handle Disconnects
        this.socket.on("deletePlayer", (data: { id: string }) => {
            usePlayersStore.getState().removePlayerFromMap(data.id);
            destroyPlayer(data.id);
        });
    }

    private handlePlayerSync(
        player: PlayerDto,
        createPlayer: any, // Typed as 'any' here just to shorten the signature in private method
    ) {
        if (!player) return;

        const isLocal = player.id === this.socket.id;

        const availabilityStatus = player?.isInFocusMode
            ? AvailabilityStatus.FOCUS
            : AvailabilityStatus.ONLINE;

        createPlayer(
            player.id,
            player.name,
            player.x,
            player.y,
            availabilityStatus,
            player.characterCustomization || player.character || null,
            { isLocal },
        );
    }

    public watchPlayerMovement(players: Map<string, PlayerInterface>) {
        this.socket.on("playerMoved", (player: PlayerDto) => {
            const targetPlayer = players.get(player.id);
            if (targetPlayer) {
                targetPlayer.targetPos = {
                    x: player.x,
                    y: player.y,
                    vx: player.vx,
                    vy: player.vy,
                    t: Date.now(),
                };
                targetPlayer.isAttacking = player.isAttacking;
            }
        });
    }
}
