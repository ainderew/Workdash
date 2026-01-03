import usePlayersStore from "@/common/store/playerStore";
import useUiStore from "@/common/store/uiStore";
import { BaseGameScene } from "./BaseGameScene";
import { Player } from "../player/player";
import { Ball } from "../soccer/Ball";
import { getSoccerStats } from "@/lib/api/soccer-stats";

export class SoccerMap extends BaseGameScene {
    public mapKey = "soccer_map";
    public worldBounds = { width: 3520, height: 1600 };
    private ball: Ball;
    private floorMarkingsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private kickKey: Phaser.Input.Keyboard.Key | null = null;
    private isMultiplayerMode: boolean = false;
    private inputLoop: Phaser.Time.TimerEvent | null = null;

    // FIX: Add a buffer to store teams for players that haven't loaded yet
    private pendingTeams: Map<string, "red" | "blue"> = new Map();

    constructor() {
        super("SoccerMap");
    }

    create() {
        super.create();

        // Detect multiplayer mode
        this.isMultiplayerMode = this.multiplayer !== undefined;

        // Set current scene in UI store for scoreboard visibility
        useUiStore.getState().setCurrentScene("SoccerMap");

        // Check if player has soccer stats, open modal if not
        this.checkSoccerStats();

        this.centerCamera();
        this.createBall();
        this.kickKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H) ||
            null;

        if (this.isMultiplayerMode) {
            this.setupServerListeners();
            this.startInputLoop();
        } else {
            this.setupLocalPhysics();
        }
    }

    update(time: number): void {
        super.update(time);

        // FIX: Check for pending teams every frame until they are assigned
        this.processPendingTeams();

        if (this.isMultiplayerMode) {
            this.ball.update();
            this.handleMultiplayerKickInput();
        } else {
            this.handleKick();
        }
    }

    // FIX: New method to apply teams once the sprite actually exists
    private processPendingTeams() {
        if (this.pendingTeams.size === 0) return;

        // Iterate through pending assignments
        for (const [playerId, team] of this.pendingTeams.entries()) {
            const player = this.players.get(playerId);

            // If the player sprite now exists, set the team and remove from pending
            if (player) {
                player.setTeam(team);
                this.pendingTeams.delete(playerId);
                console.log(
                    `Applied pending team ${team} to player ${playerId}`,
                );
            }
        }
    }

    private createBall() {
        this.ball = new Ball(
            this,
            this.worldBounds.width / 2,
            this.worldBounds.height / 2,
            this.isMultiplayerMode,
        );
    }

    private setupServerListeners() {
        if (!this.multiplayer) return;
        const socket = this.multiplayer.socket;

        // Fetch initial team assignments for all players
        socket.emit(
            "soccer:getPlayers",
            (
                playerList: Array<{ id: string; team: "red" | "blue" | null }>,
            ) => {
                playerList.forEach((playerData) => {
                    if (!playerData.team) return;

                    const player = this.players.get(playerData.id);

                    if (player) {
                        // If player exists immediately, set it
                        player.setTeam(playerData.team);
                    } else {
                        // FIX: If player doesn't exist yet (still loading), buffer it
                        this.pendingTeams.set(playerData.id, playerData.team);
                    }
                });
            },
        );

        socket.on("ball:state", (state: any) => {
            this.ball.updateFromServer(state);
        });

        socket.on("ball:kicked", (data: any) => {
            const kicker = this.players.get(data.kickerId);
            if (kicker) this.addKickGlow(kicker);
            this.sound.play("soccer_kick");
        });

        socket.on("goal:scored", (data: any) => {
            console.log(`GOAL! ${data.scoringTeam} scored!`);
            this.sound.play("soccer_cheer", { volume: 0.3 });
            this.ball.setPosition(
                this.worldBounds.width / 2,
                this.worldBounds.height / 2,
            );
            this.ball.setVelocity(0, 0);
        });

        socket.on("players:physicsUpdate", (updates: any[]) => {
            for (const update of updates) {
                const player = this.players.get(update.id);
                if (!player) continue;

                if (player.isLocal) {
                    const dist = Phaser.Math.Distance.Between(
                        player.x,
                        player.y,
                        update.x,
                        update.y,
                    );
                    if (dist > 5) {
                        player.setPosition(update.x, update.y);
                    }
                    if (player.body) {
                        player.body.setVelocity(update.vx, update.vy);
                    }
                } else {
                    player.targetPos = {
                        x: update.x,
                        y: update.y,
                        vx: update.vx,
                        vy: update.vy,
                        t: Date.now(),
                    };
                }
            }
        });

        socket.on(
            "soccer:playerReset",
            (data: { playerId: string; x: number; y: number }) => {
                const player = this.players.get(data.playerId);
                if (player) {
                    player.setPosition(data.x, data.y);
                    if (player.body) {
                        player.body.setVelocity(0, 0);
                    }
                    console.log(
                        `Player ${data.playerId} reset to position (${data.x}, ${data.y})`,
                    );
                }
            },
        );

        socket.on(
            "soccer:teamAssigned",
            (data: { playerId: string; team: "red" | "blue" | null }) => {
                // Update player sprite glow
                const player = this.players.get(data.playerId);
                if (player) {
                    player.setTeam(data.team);
                    // Also remove from pending if we happen to get a live update
                    this.pendingTeams.delete(data.playerId);
                } else if (data.team) {
                    // If we get a live update for a player we haven't rendered yet
                    this.pendingTeams.set(data.playerId, data.team);
                }
            },
        );
    }

    private startInputLoop() {
        this.inputLoop = this.time.addEvent({
            delay: 20,
            loop: true,
            callback: () => {
                this.sendPlayerInputs();
                this.checkDribbleInput();
            },
        });
    }

    private sendPlayerInputs() {
        if (!this.multiplayer) return;
        const cursors = this.input.keyboard?.createCursorKeys();
        const wasd = this.input.keyboard?.addKeys("W,A,S,D") as any;
        const input = {
            up: cursors?.up.isDown || wasd?.W?.isDown,
            down: cursors?.down.isDown || wasd?.S?.isDown,
            left: cursors?.left.isDown || wasd?.A?.isDown,
            right: cursors?.right.isDown || wasd?.D?.isDown,
        };
        this.multiplayer.socket.emit("playerInput", input);
    }

    private checkDribbleInput() {
        const player = this.players.get(this.localPlayerId);
        if (!player) return;
        const distToBall = Phaser.Math.Distance.Between(
            player.x,
            player.y,
            this.ball.x,
            this.ball.y,
        );
        if (distToBall < 100) {
            this.multiplayer.socket.emit("ball:dribble", {
                playerId: player.id,
                playerX: player.x,
                playerY: player.y,
                playerVx: player.body?.velocity.x || 0,
                playerVy: player.body?.velocity.y || 0,
            });
        }
    }

    private handleMultiplayerKickInput() {
        if (!this.kickKey || !Phaser.Input.Keyboard.JustDown(this.kickKey))
            return;

        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        // FIX: Client side distance check so you don't "ghost kick"
        const distance = Phaser.Math.Distance.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );

        // If too far, do nothing (140 matches server threshold)
        if (distance > 140) return;

        this.addKickGlow(localPlayer);

        const angle = Phaser.Math.Angle.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );

        this.multiplayer?.socket.emit("ball:kick", {
            playerId: this.localPlayerId,
            kickPower: 1000,
            angle: angle,
        });
    }

    // ... (Remaining Local/Offline Methods kept same as provided) ...
    private setupLocalPhysics() {
        this.physics.add.collider(this.playersLayer, this.playersLayer);
        this.physics.add.collider(
            this.playersLayer,
            this.ball,
            (ball, _player) => {
                const ballSprite = ball as Ball;
                const maxSpeed = 150;
                const velocity = ballSprite.body!.velocity;
                if (velocity.length() > maxSpeed) {
                    velocity.normalize().scale(maxSpeed);
                }
            },
            (ball, _player) => {
                (ball as Ball).setBounce(0.4);
                return true;
            },
            this,
        );
        if (this.floorMarkingsLayer) {
            this.physics.add.collider(
                this.ball,
                this.floorMarkingsLayer,
                undefined,
                (ball) => {
                    (ball as Ball).setBounce(0.7);
                    return true;
                },
                this,
            );
        }
    }

    private handleKick() {
        if (!this.kickKey || !Phaser.Input.Keyboard.JustDown(this.kickKey))
            return;
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;
        const distance = Phaser.Math.Distance.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );
        if (distance > 200) return;
        const angle = Phaser.Math.Angle.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );
        const kickPower = 1000;
        const knockbackPower = 300;
        const knockbackVx = -Math.cos(angle) * knockbackPower;
        const knockbackVy = -Math.sin(angle) * knockbackPower;
        localPlayer.setVelocity(
            localPlayer.body!.velocity.x + knockbackVx,
            localPlayer.body!.velocity.y + knockbackVy,
        );
        this.ball.setVelocity(
            Math.cos(angle) * kickPower,
            Math.sin(angle) * kickPower,
        );
    }

    private addKickGlow(player: Player) {
        player.setTint(0xffffff);
        const outline = this.add.sprite(player.x, player.y, player.texture.key);
        outline.setFrame(player.frame.name);
        outline.setTint(0xffffff);
        outline.setAlpha(0.8);
        outline.setScale(player.scaleX * 1.2, player.scaleY * 1.2);
        outline.setDepth(player.depth - 1);
        outline.setFlipX(player.flipX);
        const glowCircle = this.add.circle(player.x, player.y, 30, 0xffffff, 0);
        glowCircle.setStrokeStyle(4, 0xffffff, 1);
        glowCircle.setDepth(player.depth - 1);
        this.tweens.add({
            targets: outline,
            alpha: 0,
            scale: player.scaleX * 1.3,
            duration: 200,
            ease: "Power2",
            onComplete: () => outline.destroy(),
        });
        this.tweens.add({
            targets: glowCircle,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            ease: "Power2",
            onComplete: () => glowCircle.destroy(),
        });
        this.time.delayedCall(150, () => player.clearTint());
    }

    private async checkSoccerStats() {
        try {
            const stats = await getSoccerStats();

            // If no stats exist, open the modal
            if (!stats) {
                console.log("No soccer stats found - opening modal");
                useUiStore.getState().openSoccerStatsModal();
            } else {
                console.log("Soccer stats loaded:", stats);
            }
        } catch (error) {
            console.error("Failed to check soccer stats:", error);
            // Optionally open modal on error, or silently fail
        }
    }

    destroy() {
        if (this.inputLoop) this.inputLoop.destroy();
        if (this.multiplayer) {
            this.multiplayer.socket.off("ball:state");
            this.multiplayer.socket.off("ball:kicked");
            this.multiplayer.socket.off("goal:scored");
            this.multiplayer.socket.off("players:physicsUpdate");
            this.multiplayer.socket.off("soccer:playerReset");
            this.multiplayer.socket.off("soccer:teamAssigned");
        }

        useUiStore.getState().setCurrentScene(null);
        super.destroy();
    }

    protected setupLocalPlayer(localPlayer: Player): void {
        this.localPlayerId = localPlayer.id;
        usePlayersStore.getState().setLocalPlayerId(localPlayer.id);
        localPlayer.setPosition(this.spawnX, this.spawnY);
        localPlayer.setScale(2);
        localPlayer.setSize(40, 40);
        localPlayer.setOffset(0, 20);
        localPlayer.moveSpeed = localPlayer.moveSpeed * 0.5;
    }

    protected setupRemotePlayer(player: Player): void {
        player.setScale(2);
        player.destroyNameTag();
        player.moveSpeed = player.moveSpeed * 1.5;
        player.setSize(40, 40);
        player.setOffset(0, 20);
    }

    private centerCamera() {
        const zoomX = this.scale.width / this.worldBounds.width;
        const zoomY = this.scale.height / this.worldBounds.height;
        const zoom = Math.min(zoomX, zoomY);
        const gameWidth = this.worldBounds.width * zoom;
        const gameHeight = this.worldBounds.height * zoom;
        const offsetX = (this.scale.width - gameWidth) / 2;
        const offsetY = (this.scale.height - gameHeight) / 2;
        this.cameras.main.setViewport(offsetX, offsetY, gameWidth, gameHeight);
        this.cameras.main.setZoom(zoom);
        this.cameras.main.stopFollow();
        this.cameras.main.setScroll(0, 0);
    }

    protected createLayers(
        map: Phaser.Tilemaps.Tilemap,
    ): Map<string, Phaser.Tilemaps.TilemapLayer> {
        const layers = new Map<string, Phaser.Tilemaps.TilemapLayer>();
        const soccerTileset = map.addTilesetImage("soccer", "soccer");
        const goalTileset = map.addTilesetImage("goal", "goal");
        const goal2Tileset = map.addTilesetImage("goal_2", "goal_2");
        const circleTileset = map.addTilesetImage("circle", "circle");
        const allTilesets = [
            goalTileset!,
            goal2Tileset!,
            circleTileset!,
            soccerTileset!,
        ];
        const floorLayer = map.createLayer("Floor", allTilesets, 0, 0);
        const floorMarkingsLayer = map.createLayer(
            "FloorMarkings",
            allTilesets,
            0,
            0,
        );
        const goalsLayer = map.createLayer("Goals", allTilesets, 0, 0);
        const circleLayer = map.createLayer("Circle", allTilesets, 0, 0);
        goalsLayer?.setDepth(100);
        if (floorMarkingsLayer) {
            layers.set("Floor_Markings_Layer", floorMarkingsLayer);
            this.floorMarkingsLayer = floorMarkingsLayer;
        }
        return layers;
    }

    protected setupCollisions(
        layers: Map<string, Phaser.Tilemaps.TilemapLayer>,
    ): void {
        const floorMarkingLayer = layers.get("Floor_Markings_Layer");
        if (floorMarkingLayer) {
            floorMarkingLayer.setCollisionBetween(0, 100000, true);
        }
        this.setupDoorCollisions();
    }

    protected createAnimatedObjects(_map: Phaser.Tilemaps.Tilemap) {
        void _map;
    }
    protected createDoors(_map: Phaser.Tilemaps.Tilemap) {
        this.doors = [];
        void _map;
    }
    protected setupAudio() {}
    protected setupCamera() {}
}
