import usePlayersStore from "@/common/store/playerStore";
import useUiStore from "@/common/store/uiStore";
import { BaseGameScene } from "./BaseGameScene";
import { Player } from "../player/player";
import { Ball } from "../soccer/Ball";

export class SoccerMap extends BaseGameScene {
    public mapKey = "soccer_map";
    public worldBounds = { width: 3520, height: 1600 };
    private ball: Ball;
    private floorMarkingsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private kickKey: Phaser.Input.Keyboard.Key | null = null;
    private isMultiplayerMode: boolean = false;
    private lastDribbleTime: number = 0;

    constructor() {
        super("SoccerMap");
    }

    create() {
        super.create();

        // Detect multiplayer mode
        this.isMultiplayerMode = this.multiplayer !== undefined;

        // Set current scene in UI store for scoreboard visibility
        useUiStore.getState().setCurrentScene("SoccerMap");

        this.centerCamera();
        this.createBall();
        this.kickKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H) ||
            null;

        this.physics.add.collider(this.playersLayer, this.playersLayer);

        if (this.isMultiplayerMode) {
            this.setupMultiplayerBallListeners();
        }
    }

    update(time: number): void {
        super.update(time);

        if (this.isMultiplayerMode) {
            this.ball.update(); // Interpolate ball position
            this.handleMultiplayerKick();
        } else {
            this.handleKick(); // Original local logic
        }
    }

    private createBall() {
        this.ball = new Ball(
            this,
            this.worldBounds.width / 2,
            this.worldBounds.height / 2,
            this.isMultiplayerMode, // Pass multiplayer flag
        );

        if (!this.isMultiplayerMode) {
            // Local mode: Keep existing collision/physics
            this.physics.add.collider(
                this.playersLayer,
                this.ball,
                (ball, _player) => {
                    const ballSprite = ball as Ball;
                    // Clamp the ball's velocity after collision
                    const maxSpeed = 150;
                    const velocity = ballSprite.body!.velocity;
                    const speed = velocity.length();

                    if (speed > maxSpeed) {
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
                        console.log(ball);
                        return true;
                    },
                    this,
                );
            }
        } else {
            // Multiplayer mode: Use overlap detection only (no force application)
            this.setupMultiplayerBallCollision();
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

        const kickRange = 200;
        if (distance > kickRange) return;

        const angle = Phaser.Math.Angle.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );

        const kickPower = 1000;

        // Apply knockback to player (opposite direction of kick)
        const knockbackPower = 300; // Increased for visibility
        const knockbackVx = -Math.cos(angle) * knockbackPower;
        const knockbackVy = -Math.sin(angle) * knockbackPower;

        const currentVx = localPlayer.body!.velocity.x;
        const currentVy = localPlayer.body!.velocity.y;
        localPlayer.setVelocity(
            currentVx + knockbackVx,
            currentVy + knockbackVy,
        );

        this.ball.setVelocity(
            Math.cos(angle) * kickPower,
            Math.sin(angle) * kickPower,
        );
    }

    private setupMultiplayerBallListeners() {
        if (!this.multiplayer) return;

        // Listen for ball state updates from server
        this.multiplayer.socket.on("ball:state", (state: any) => {
            this.ball.updateFromServer(state);
        });

        // Listen for kick events (for animations/effects)
        this.multiplayer.socket.on("ball:kicked", (data: any) => {
            console.log(
                `Player ${data.kickerId} kicked the ball with power ${data.kickPower}`,
            );

            // Add white glow effect on the kicking player (like Haxball)
            const kickingPlayer = this.players.get(data.kickerId);
            if (kickingPlayer) {
                this.addKickGlow(kickingPlayer);
            }

            // Play kick sound for all players
            this.sound.play("soccer_kick");
        });

        // Listen for goal events
        this.multiplayer.socket.on("goal:scored", (data: any) => {
            console.log(
                `GOAL! ${data.scoringTeam} scored! Score: Red ${data.score.red} - Blue ${data.score.blue}`,
            );

            this.sound.play("soccer_cheer", { volume: 0.3 });

            // TODO: Add goal animation/effects here (flash, confetti, etc.)
            // TODO: Update scoreboard UI with new score
        });

        // Listen for player physics updates from server
        this.multiplayer.socket.on(
            "players:physicsUpdate",
            (updates: any[]) => {
                for (const update of updates) {
                    const player = this.players.get(update.id);
                    if (!player) continue;

                    if (player.isLocal) {
                        // Apply server corrections to local player (for collisions/knockback)
                        // Only apply position if there's a significant difference (avoid fighting with local input)
                        const dx = update.x - player.x;
                        const dy = update.y - player.y;
                        const distanceSq = dx * dx + dy * dy;

                        if (distanceSq > 100) {
                            // 10px threshold
                            // Significant server correction - apply it
                            player.x = update.x;
                            player.y = update.y;
                            if (player.body) {
                                player.body.updateFromGameObject();
                            }
                        }

                        // Always apply velocity corrections (knockback/push)
                        if (
                            Math.abs(update.vx) > 10 ||
                            Math.abs(update.vy) > 10
                        ) {
                            if (player.body) {
                                player.body.setVelocity(update.vx, update.vy);
                            }
                        }
                    } else {
                        // Remote players - update target for interpolation
                        player.targetPos = {
                            x: update.x,
                            y: update.y,
                            vx: update.vx,
                            vy: update.vy,
                            t: Date.now(),
                        };
                    }
                }
            },
        );
    }

    private setupMultiplayerBallCollision() {
        // Use collider for physical blocking (players can't pass through)
        // Ball is immovable - acts like a wall but server controls movement
        // Check keyboard input to detect when player is trying to push
        this.physics.add.collider(
            this.playersLayer,
            this.ball,
            (ball, player) => {
                const playerSprite = player as Player;

                // Only send dribble if it's the local player
                if (!playerSprite.isLocal) return;

                // Check if player is trying to move (holding keys)
                // This works even when velocity is 0 (blocked by immovable ball)
                const cursors = this.input.keyboard?.createCursorKeys();
                const wasd = this.input.keyboard?.addKeys("W,A,S,D") as any;

                const isTryingToMove =
                    cursors?.left.isDown ||
                    cursors?.right.isDown ||
                    cursors?.up.isDown ||
                    cursors?.down.isDown ||
                    wasd?.W?.isDown ||
                    wasd?.A?.isDown ||
                    wasd?.S?.isDown ||
                    wasd?.D?.isDown;

                if (isTryingToMove) {
                    this.emitDribbleEvent(playerSprite);
                }
            },
        );
    }

    private handleMultiplayerKick() {
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

        const kickRange = 200;
        if (distance > kickRange) return;

        const angle = Phaser.Math.Angle.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );

        const kickPower = 1000;

        // Add white glow effect on local player (like Haxball)
        this.addKickGlow(localPlayer);

        // Send kick event to server (server will handle knockback)
        this.emitKickEvent(this.localPlayerId, kickPower, angle);
    }

    private emitKickEvent(playerId: string, kickPower: number, angle: number) {
        if (!this.multiplayer) return;

        this.multiplayer.socket.emit("ball:kick", {
            playerId,
            kickPower,
            angle,
        });
    }

    private emitDribbleEvent(player: Player) {
        if (!this.multiplayer) return;

        // Throttle dribble events to match server tick rate (50Hz = 20ms)
        const now = Date.now();
        if (now - this.lastDribbleTime < 20) return;
        this.lastDribbleTime = now;

        this.multiplayer.socket.emit("ball:dribble", {
            playerId: player.id,
            playerX: player.x,
            playerY: player.y,
            playerVx: player.body!.velocity.x,
            playerVy: player.body!.velocity.y,
        });
    }

    private addKickGlow(player: Player) {
        // Create white glow outline effect (like Haxball)
        // Add a white tint that fades out
        player.setTint(0xffffff);

        // Create thick white outline by duplicating the player sprite
        const outline = this.add.sprite(player.x, player.y, player.texture.key);
        outline.setFrame(player.frame.name);
        outline.setTint(0xffffff);
        outline.setAlpha(0.8);
        outline.setScale(player.scaleX * 1.2, player.scaleY * 1.2); // 20% larger for thick outline
        outline.setDepth(player.depth - 1);
        outline.setFlipX(player.flipX);

        // Create a white circle outline around player
        const glowCircle = this.add.circle(player.x, player.y, 30, 0xffffff, 0);
        glowCircle.setStrokeStyle(4, 0xffffff, 1);
        glowCircle.setDepth(player.depth - 1);

        // Animate the outline: fade out and expand slightly
        this.tweens.add({
            targets: outline,
            alpha: 0,
            scale: player.scaleX * 1.3,
            duration: 200,
            ease: "Power2",
            onComplete: () => {
                outline.destroy();
            },
        });

        // Animate the glow circle: fade out and expand
        this.tweens.add({
            targets: glowCircle,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            ease: "Power2",
            onComplete: () => {
                glowCircle.destroy();
            },
        });

        // Remove player tint after short delay
        this.time.delayedCall(150, () => {
            player.clearTint();
        });
    }

    destroy() {
        if (this.multiplayer) {
            this.multiplayer.socket.off("ball:state");
            this.multiplayer.socket.off("ball:kicked");
            this.multiplayer.socket.off("goal:scored");
            this.multiplayer.socket.off("players:physicsUpdate");
        }

        // Clear current scene in UI store
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

        console.log("Map loaded:", map);
        console.log("Map dimensions:", map.widthInPixels, map.heightInPixels);

        const soccerTileset = map.addTilesetImage("soccer", "soccer");
        const goalTileset = map.addTilesetImage("goal", "goal");
        const goal2Tileset = map.addTilesetImage("goal_2", "goal_2");
        const circleTileset = map.addTilesetImage("circle", "circle");

        console.log(
            "Tilesets:",
            goalTileset,
            goal2Tileset,
            circleTileset,
            soccerTileset,
        );

        if (!goalTileset || !goal2Tileset || !circleTileset || !soccerTileset) {
            console.error("One or more tilesets failed to load!");
        }

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

        void floorLayer;
        void goalsLayer;
        void circleLayer;

        if (floorMarkingsLayer)
            layers.set("Floor_Markings_Layer", floorMarkingsLayer);
        this.floorMarkingsLayer = floorMarkingsLayer;
        return layers;
    }
    protected setupCollisions(
        layers: Map<string, Phaser.Tilemaps.TilemapLayer>,
    ): void {
        const floorMarkingLayer = layers.get("Floor_Markings_Layer")!;
        floorMarkingLayer.setCollisionBetween(0, 100000, true);
        this.setupDoorCollisions();
    }

    // Overides
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
