/*eslint-disable @typescript-eslint/no-explicit-any*/
import io from "socket.io-client";
import { MovementPacket, PlayerDto } from "./_types";
import { CONFIG } from "@/common/utils/config";
import usePlayersStore from "@/common/store/playerStore";
import { AvailabilityStatus } from "../player/_enums";
import { CharacterCustomization } from "../character/_types";
import useUserStore from "@/common/store/useStore";
import { Player } from "../player/player";
import useUiStore from "@/common/store/uiStore";

type QueuedMessage = {
    event: string;
    payload: any;
};

export class Multiplayer {
    public socket: SocketIOClient.Socket;
    private isBackendReady: boolean = false;
    private messageQueue: QueuedMessage[] = [];
    private currentScene: string = "MainMap";
    private pingInterval: any = null;

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
            this.startPingLoop();
        });

        this.socket.on("disconnect", () => {
            this.isBackendReady = false;
            this.stopPingLoop();
        });

        this.socket.on("connect_error", (error: any) => {
            console.error("Socket connection error:", error.message);
            this.stopPingLoop();
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

    private startPingLoop() {
        this.stopPingLoop();
        this.pingInterval = setInterval(() => {
            const start = Date.now();
            this.socket.emit("ping", start, (echo: number) => {
                const latency = Date.now() - echo;
                useUiStore.getState().setPing(latency);

                // Broadcast ping to game for adaptive interpolation
                this.socket.emit("pong", latency);
            });
        }, 2000);
    }
    private stopPingLoop() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        useUiStore.getState().setPing(null);
    }

    public connectToserver() {
        this.socket.connect();
    }

    public disconnectFromServer() {
        this.socket.disconnect();
    }

    public removeAllGameListeners() {
        this.socket.off("currentPlayers");
        this.socket.off("newPlayer");
        this.socket.off("deletePlayer");
        this.socket.off("playerMoved");
        this.socket.off("characterUpdated");
        this.socket.off("nameUpdated");
        this.socket.off("playerAction");
    }

    public joinGame(x: number, y: number, sceneName: string) {
        this.currentScene = sceneName;
        this.send("playerJoin", { x, y, scene: sceneName });
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

    public setCurrentScene(sceneName: string) {
        this.currentScene = sceneName;
    }

    public emitSceneChange(newScene: string, x: number, y: number) {
        this.currentScene = newScene;
        this.socket.emit("player:sceneChange", { newScene, x, y });
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
        this.socket.off("currentPlayers");
        this.socket.off("newPlayer");
        this.socket.off("deletePlayer");

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

        // Only create players that are in the same scene
        if (player.currentScene && player.currentScene !== this.currentScene) {
            console.log(
                `Ignoring player ${player.name} - they are in ${player.currentScene}, we are in ${this.currentScene}`,
            );
            return;
        }

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
        this.socket.off("playerMoved");

        this.socket.on("playerMoved", (player: MovementPacket) => {
            const targetPlayer = players.get(player.id);
            if (!targetPlayer) return;

            // Use the new snapshot system for interpolation
            targetPlayer.addServerSnapshot({
                x: player.x,
                y: player.y,
                vx: player.vx,
                vy: player.vy,
                timestamp: player.timestamp || Date.now(),
            });

            targetPlayer.isAttacking = player.isAttacking;

            if (player.isKartMode !== undefined) {
                targetPlayer.isKartMode = player.isKartMode;
            }
        });
    }
    public watchCharacterUpdates(players: Map<string, Player>) {
        this.socket.off("characterUpdated");

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
        this.socket.off("nameUpdated");

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
        this.socket.off("playerAction");

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
