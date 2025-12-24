/*eslint-disable @typescript-eslint/no-explicit-any*/
import io from "socket.io-client";
import { PlayerDto } from "./_types";
import { CONFIG } from "@/common/utils/config";
import usePlayersStore from "@/common/store/playerStore";
import { AvailabilityStatus } from "../player/_enums";
import { CharacterCustomization } from "../character/_types";
import useUserStore from "@/common/store/useStore";
import { Player } from "../player/player";

// Type definition for queued commands
type QueuedMessage = {
    event: string;
    payload: any;
};

export class Multiplayer {
    public socket: SocketIOClient.Socket;
    private isBackendReady: boolean = false;
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

    private setupLifecycleEvents() {
        this.socket.on("connect", () => {
            console.log("Socket Connected (Waiting for Logic Init...)");
        });

        this.socket.on("disconnect", (reason: any) => {
            console.warn(`Socket Disconnected: ${reason}`);
            this.isBackendReady = false; // Reset readiness
        });

        this.socket.on("connect_error", (error: any) => {
            console.error("Socket connection error:", error.message);
        });

        this.socket.on("sfuInitialized", () => {
            console.log("SFU Initialized - Backend Logic Ready");
            this.isBackendReady = true;
            this.flushMessageQueue();
        });
    }

    private send(event: string, payload: any) {
        if (this.socket.connected && this.isBackendReady) {
            this.socket.emit(event, payload);
        } else {
            const status = !this.socket.connected
                ? "Not Connected"
                : "Backend Not Ready";
            console.log(`Queueing event '${event}' (${status})`);

            this.messageQueue.push({ event, payload });

            if (!this.socket.connected) {
                this.socket.connect();
            }
        }
    }

    private flushMessageQueue() {
        if (this.messageQueue.length === 0) return;

        console.log(`Flushing ${this.messageQueue.length} queued messages...`);

        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) {
                console.log(`Sending queued: ${msg.event}`);
                this.socket.emit(msg.event, msg.payload);
            }
        }
    }

    public connectToserver() {
        this.socket.connect();
    }

    public disconnectFromServer() {
        this.socket.disconnect();
    }

    public joinGame(x: number, y: number) {
        this.send("playerJoin", { x, y });
    }

    public emitPlayerMovement(data: Partial<PlayerDto>) {
        this.send("playerMovement", data);
    }

    public emitCharacterUpdate(data: CharacterCustomization) {
        console.log("Emitting character update to backend:", data);
        this.send("updateCharacter", data);
    }

    public watchNewPlayers(
        createPlayer: (
            id: string,
            name: string | undefined,
            x: number,
            y: number,
            availabilityStatus: AvailabilityStatus,
            customization: CharacterCustomization | null,
            opts: { isLocal: boolean },
        ) => void,
        destroyPlayer: (id: string) => void,
    ) {
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
        createPlayer: (
            id: string,
            name: string | undefined,
            x: number,
            y: number,
            availabilityStatus: AvailabilityStatus,
            customization: CharacterCustomization | null,
            opts: { isLocal: boolean },
        ) => void,
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

        if (isLocal) {
            useUserStore.getState().updateUser({ name: player.name });
        }
    }

    public watchPlayerMovement(players: Map<string, Player>) {
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

    public watchCharacterUpdates(players: Map<string, Player>) {
        this.socket.on(
            "characterUpdated",
            (data: { playerId: string; character: CharacterCustomization }) => {
                console.log(
                    "Character updated for player:",
                    data.playerId,
                    data.character,
                );

                const targetPlayer = players.get(data.playerId);
                if (
                    targetPlayer &&
                    typeof targetPlayer.changeSprite === "function"
                ) {
                    targetPlayer.changeSprite(data.character);
                } else {
                    console.warn(
                        `Player ${data.playerId} not found or cannot change sprite`,
                    );
                }
            },
        );
    }

    public emitNameUpdate(newName: string) {
        console.log("Emitting name update to backend:", newName);
        this.send("updateName", { name: newName });
    }

    public watchNameUpdates(players: Map<string, Player>) {
        this.socket.on(
            "nameUpdated",
            (data: { playerId: string; name: string }) => {
                console.log(
                    "Name updated for player:",
                    data.playerId,
                    data.name,
                );

                const targetPlayer = players.get(data.playerId);
                if (targetPlayer) {
                    targetPlayer.name = data.name;
                    // Reinitialize the name tag to display the new name
                    if (typeof targetPlayer.initializeNameTag === "function") {
                        targetPlayer.initializeNameTag();
                    }
                } else {
                    console.warn(
                        `Player ${data.playerId} not found for name update`,
                    );
                }
            },
        );
    }
}
