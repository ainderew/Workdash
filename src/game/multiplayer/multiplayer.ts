/*eslint-disable @typescript-eslint/no-explicit-any*/
import io from "socket.io-client";
import { MovementPacket, PlayerDto } from "./_types";
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

        this.socket.on("disconnect", () => {
            this.isBackendReady = false;
        });

        this.socket.on("connect_error", (error: any) => {
            console.error("Socket connection error:", error.message);
        });

        this.socket.on("sfuInitialized", () => {
            this.isBackendReady = true;
            this.flushMessageQueue();
        });
    }

    private send(event: string, payload: any) {
        if (this.socket.connected && this.isBackendReady) {
            this.socket.emit(event, payload);
        } else {
            this.messageQueue.push({ event, payload });

            if (!this.socket.connected) {
                this.socket.connect();
            }
        }
    }

    private flushMessageQueue() {
        if (this.messageQueue.length === 0) return;

        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) {
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

    public emitPlayerMovement(data: MovementPacket) {
        this.send("playerMovement", data);
    }

    public emitCharacterUpdate(data: CharacterCustomization) {
        console.log("Emitting character update to backend:", data);
        this.send("updateCharacter", data);
    }

    public emitPlayerAction(action: string) {
        this.send("playerAction", { action });
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
        players: Map<string, Player>,
    ) {
        this.socket.on(
            "currentPlayers",
            (playersData: PlayerDto[] | Record<string, PlayerDto>) => {
                console.log("Received currentPlayers:", playersData);
                const playerList = Array.isArray(playersData)
                    ? playersData
                    : Object.values(playersData);

                playerList.forEach((player) => {
                    this.handlePlayerSync(player, createPlayer, players);
                });
            },
        );

        this.socket.on(
            "newPlayer",
            (
                data: { playerId: string; playerState: PlayerDto } | PlayerDto,
            ) => {
                const player = "playerState" in data ? data.playerState : data;
                console.log("New player joined:", player);
                this.handlePlayerSync(
                    player as PlayerDto,
                    createPlayer,
                    players,
                );
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
        players?: Map<string, Player>,
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

        if (players && player.isKartMode !== undefined) {
            const syncedPlayer = players.get(player.id);
            if (syncedPlayer) {
                syncedPlayer.isKartMode = player.isKartMode;
            }
        }

        if (isLocal) {
            useUserStore.getState().updateUser({
                name: player.name,
                socketId: this.socket.id,
            });
        }
    }

    public watchPlayerMovement(players: Map<string, Player>) {
        this.socket.on("playerMoved", (player: MovementPacket) => {
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
                if (player.isKartMode !== undefined) {
                    targetPlayer.isKartMode = player.isKartMode;
                    targetPlayer.idleAnimation();
                }
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

    public watchPlayerActions(players: Map<string, Player>) {
        this.socket.on(
            "playerAction",
            (data: { playerId: string; action: string }) => {
                console.log(
                    "Player action received:",
                    data.playerId,
                    data.action,
                );

                const targetPlayer = players.get(data.playerId);
                if (targetPlayer) {
                    if (data.action === "attack") {
                        targetPlayer.isAttacking = true;
                    }
                } else {
                    console.warn(
                        `Player ${data.playerId} not found for action`,
                    );
                }
            },
        );
    }
}
