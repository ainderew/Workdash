import usePlayersStore from "@/common/store/playerStore";
import useUiStore from "@/common/store/uiStore";
import { BaseGameScene } from "./BaseGameScene";
import { Player } from "../player/player";
import { Ball } from "../soccer/Ball";
import { getSoccerStats } from "@/lib/api/soccer-stats";

interface SkillConfig {
    id: string;
    name: string;
    description: string;
    keyBinding: string;
    cooldownMs: number;
    durationMs: number;
    clientVisuals: {
        enableGrayscale: boolean;
        enableSpeedTrail: boolean;
        trailColor?: number;
        trailInterval?: number;
        trailFadeDuration?: number;
        iconKey: string;
    };
}

export class SoccerMap extends BaseGameScene {
    public mapKey = "soccer_map";
    public worldBounds = { width: 3520, height: 1600 };
    private ball: Ball;
    private floorMarkingsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private floorLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private goalsLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private circleLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private kickKey: Phaser.Input.Keyboard.Key | null = null;
    private skillKey: Phaser.Input.Keyboard.Key | null = null;
    private blinkKey: Phaser.Input.Keyboard.Key | null = null;
    private metavisionKey: Phaser.Input.Keyboard.Key | null = null;
    private ninjaStepKey: Phaser.Input.Keyboard.Key | null = null;
    private isMultiplayerMode: boolean = false;
    private inputLoop: Phaser.Time.TimerEvent | null = null;
    private skillCooldown: number = 0;
    private blinkCooldown: number = 0;
    private metavisionCooldown: number = 0;
    private isMetaVisionActive: boolean = false;
    private metaVisionEndTime: number = 0;
    private metaVisionGraphics: Phaser.GameObjects.Graphics | null = null;
    private kickRangeGraphics: Phaser.GameObjects.Graphics | null = null;
    private skillCooldownText: Phaser.GameObjects.Text | null = null;

    private activeSkillPlayerId: string | null = null;
    private activeSkillVisualConfig: any = null;
    private trailSprites: Phaser.GameObjects.Sprite[] = [];
    private trailTimer: number = 0;
    private grayscaleEffects: Map<
        Phaser.GameObjects.GameObject,
        Phaser.FX.ColorMatrix
    > = new Map();
    private skillConfigs: Map<string, SkillConfig> = new Map();
    private soccerStats: {
        speed: number;
        kickPower: number;
        dribbling: number;
    } | null = null;

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
        this.skillKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q) ||
            null;
        this.blinkKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ||
            null;
        this.metavisionKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R) ||
            null;
        this.ninjaStepKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.T) ||
            null;

        this.metaVisionGraphics = this.add.graphics();
        this.metaVisionGraphics.setDepth(1000);

        this.kickRangeGraphics = this.add.graphics();
        this.kickRangeGraphics.setDepth(2);
        this.kickRangeGraphics.setBlendMode(Phaser.BlendModes.ADD);

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

        // Update skill cooldown UI
        this.updateSkillCooldownUI();

        // Create speed trail for activating player during skill
        if (this.activeSkillPlayerId) {
            this.createSpeedTrail(time);
        }

        if (this.isMultiplayerMode) {
            this.ball.update();
            this.drawKickRange();
            this.handleMultiplayerKickInput();
            this.handleSkillInput();
            this.handleBlinkInput();
            this.handleMetaVisionInput();
            this.handleNinjaStepInput();

            if (this.isMetaVisionActive) {
                this.drawTrajectory();
            }
        } else {
            this.handleKick();
        }
    }

    // Process pending teams once player sprites exist
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

        // Request skill configs from server
        socket.emit("soccer:requestSkillConfig", (configs: SkillConfig[]) => {
            configs.forEach((config) =>
                this.skillConfigs.set(config.id, config),
            );
            console.log(
                `Loaded ${configs.length} skill configs:`,
                Array.from(this.skillConfigs.keys()),
            );
        });

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

                // Sync ghosted state
                player.isGhosted = !!update.isGhosted;

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
                        (player.body as Phaser.Physics.Arcade.Body).setVelocity(
                            update.vx,
                            update.vy,
                        );
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
                        (player.body as Phaser.Physics.Arcade.Body).setVelocity(
                            0,
                            0,
                        );
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

        // Listen for skill activation
        socket.on(
            "soccer:skillActivated",
            (data: {
                activatorId: string;
                skillId: string;
                affectedPlayers: string[];
                duration: number;
                visualConfig: any;
            }) => {
                if (data.skillId === "metavision") {
                    if (data.activatorId === this.localPlayerId) {
                        this.isMetaVisionActive = true;
                        this.metaVisionEndTime = this.time.now + data.duration;
                    }
                    // Show a glow on the activator for everyone
                    const activator = this.players.get(data.activatorId);
                    if (activator) this.addKickGlow(activator);
                } else {
                    this.applySkillVisuals(data.activatorId, data.visualConfig);
                }

                // Play skill specific sound if provided, otherwise fallback to generic
                const sfxKey =
                    data.visualConfig?.sfxKey || "soccer_skill_activation";
                this.sound.play(sfxKey, { volume: 0.3 });
            },
        );

        // Listen for skill end
        socket.on("soccer:skillEnded", () => {
            this.removeSkillVisuals();
            this.isMetaVisionActive = false;
            this.metaVisionGraphics?.clear();
        });

        // Listen for blink activation
        socket.on(
            "soccer:blinkActivated",
            (data: {
                activatorId: string;
                fromX: number;
                fromY: number;
                toX: number;
                toY: number;
                visualConfig: any;
            }) => {
                const player = this.players.get(data.activatorId);
                if (player) {
                    // Instant teleport
                    player.setPosition(data.toX, data.toY);
                    if (player.body) {
                        (player.body as Phaser.Physics.Arcade.Body).setVelocity(
                            0,
                            0,
                        );
                    }

                    // Visual effects
                    this.createBlinkEffect(
                        data.activatorId,
                        data.fromX,
                        data.fromY,
                        data.toX,
                        data.toY,
                        data.visualConfig,
                    );

                    // Sound effect
                    const sfxKey = data.visualConfig?.sfxKey || "blink";
                    this.sound.play(sfxKey, { volume: 0.5 });
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

        // If too far, do nothing (140 matches server threshold, but 200 if metavision is active)
        const kickThreshold = this.isMetaVisionActive ? 200 : 140;
        if (distance > kickThreshold) return;

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
            (ball) => {
                const ballSprite = ball as Ball;
                const maxSpeed = 150;
                const velocity = ballSprite.body!.velocity;
                if (velocity.length() > maxSpeed) {
                    velocity.normalize().scale(maxSpeed);
                }
            },
            (ball) => {
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

    private handleSkillInput() {
        if (!this.skillKey || !Phaser.Input.Keyboard.JustDown(this.skillKey))
            return;

        // Get slowdown skill config
        const skillConfig = this.skillConfigs.get("slowdown");
        if (!skillConfig) {
            console.warn("Slowdown skill config not loaded yet");
            return;
        }

        const now = Date.now();
        if (now - this.skillCooldown < skillConfig.cooldownMs) {
            const remainingSeconds = Math.ceil(
                (skillConfig.cooldownMs - (now - this.skillCooldown)) / 1000,
            );
            console.log(`Skill on cooldown: ${remainingSeconds}s remaining`);
            return;
        }

        // Get player's facing direction
        const localPlayer = this.players.get(this.localPlayerId);
        const facingDirection = localPlayer?.lastFacingDirection || "DOWN";

        // Activate skill
        this.skillCooldown = now;
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "slowdown",
            facingDirection: facingDirection,
        });

        console.log(
            `${skillConfig.name} activated! All other players slowed for ${skillConfig.durationMs / 1000} seconds`,
        );
    }

    private handleBlinkInput() {
        if (!this.blinkKey || !Phaser.Input.Keyboard.JustDown(this.blinkKey))
            return;

        // Get blink skill config
        const skillConfig = this.skillConfigs.get("blink");
        if (!skillConfig) {
            console.warn("Blink skill config not loaded yet");
            return;
        }

        const now = Date.now();
        if (now - this.blinkCooldown < skillConfig.cooldownMs) {
            const remainingSeconds = Math.ceil(
                (skillConfig.cooldownMs - (now - this.blinkCooldown)) / 1000,
            );
            console.log(`Blink on cooldown: ${remainingSeconds}s remaining`);
            return;
        }

        // Get player's facing direction
        const localPlayer = this.players.get(this.localPlayerId);
        const facingDirection = localPlayer?.lastFacingDirection || "DOWN";

        // Activate blink skill
        this.blinkCooldown = now;
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "blink",
            facingDirection: facingDirection,
        });

        console.log(
            `${skillConfig.name} activated! Blinking ${facingDirection}`,
        );
    }

    private handleMetaVisionInput() {
        if (
            !this.metavisionKey ||
            !Phaser.Input.Keyboard.JustDown(this.metavisionKey)
        )
            return;

        const skillConfig = this.skillConfigs.get("metavision");
        if (!skillConfig) return;

        const now = Date.now();
        if (now - this.metavisionCooldown < skillConfig.cooldownMs) return;

        this.metavisionCooldown = now;
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "metavision",
        });
    }

    private handleNinjaStepInput() {
        if (
            !this.ninjaStepKey ||
            !Phaser.Input.Keyboard.JustDown(this.ninjaStepKey)
        )
            return;

        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "ninja_step",
        });
    }

    private drawTrajectory() {
        if (!this.metaVisionGraphics) return;

        this.metaVisionGraphics.clear();

        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        const distance = Phaser.Math.Distance.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );

        const ballVx = this.ball.targetPos.vx;
        const ballVy = this.ball.targetPos.vy;
        const ballSpeed = Math.sqrt(ballVx * ballVx + ballVy * ballVy);
        const isBallMoving = ballSpeed > 10;

        // Dynamic thresholds:
        // - Aiming (stationary ball): 300px
        // - Observation (moving ball): 2000px
        const threshold = isBallMoving ? 2000 : 300;

        if (distance > threshold) {
            return;
        }

        // Only draw the dash "aim line" if we are in aiming range (stationary ball)
        if (!isBallMoving) {
            // 2. Draw the dashed aim line from player to ball
            const isInKickRange =
                distance <= (this.isMetaVisionActive ? 200 : 140);
            const lineColor = isInKickRange ? 0x00ff00 : 0x00ffff; // Green if in range, Cyan if not
            const lineAlpha = isInKickRange ? 0.6 : 0.3;
            this.metaVisionGraphics.lineStyle(2, lineColor, lineAlpha);

            const dashLength = 10;
            const gapLength = 5;
            const angleToBall = Phaser.Math.Angle.Between(
                localPlayer.x,
                localPlayer.y,
                this.ball.x,
                this.ball.y,
            );
            let currentX = localPlayer.x;
            let currentY = localPlayer.y;
            const totalSteps = distance / (dashLength + gapLength);

            for (let i = 0; i < totalSteps; i++) {
                this.metaVisionGraphics.beginPath();
                this.metaVisionGraphics.moveTo(currentX, currentY);
                currentX += Math.cos(angleToBall) * dashLength;
                currentY += Math.sin(angleToBall) * dashLength;
                this.metaVisionGraphics.lineTo(currentX, currentY);
                this.metaVisionGraphics.strokePath();
                currentX += Math.cos(angleToBall) * gapLength;
                currentY += Math.sin(angleToBall) * gapLength;
            }
        }

        // Improve the trajectory simulation:
        // Use current ball velocity if moving, otherwise simulate a kick based on player-to-ball angle.
        let simX = this.ball.x;
        let simY = this.ball.y;
        let simVx = 0;
        let simVy = 0;

        if (isBallMoving) {
            simVx = ballVx;
            simVy = ballVy;
        } else {
            const angle = Phaser.Math.Angle.Between(
                localPlayer.x,
                localPlayer.y,
                this.ball.x,
                this.ball.y,
            );
            const baseKickPower = 1000;
            const kickPowerStat = this.soccerStats?.kickPower ?? 0;
            // Server applies 1.2x boost for Metavision
            const kickPowerMultiplier = (1.0 + kickPowerStat * 0.1) * 1.2;
            simVx = Math.cos(angle) * baseKickPower * kickPowerMultiplier;
            simVy = Math.sin(angle) * baseKickPower * kickPowerMultiplier;
        }

        const DRAG = 1; // matching server SoccerService
        const BOUNCE = 0.7; // matching server SoccerService
        const BALL_RADIUS = 30; // matching server SoccerService
        const WORLD_WIDTH = this.worldBounds.width;
        const WORLD_HEIGHT = this.worldBounds.height;
        const dt = 0.0166; // ~60fps simulation step (16.6ms matching server)
        const duration = 2; // Simulate 2 seconds

        this.metaVisionGraphics.lineStyle(2, 0x00ffff, 1.0);
        this.metaVisionGraphics.beginPath();
        this.metaVisionGraphics.moveTo(simX, simY);

        for (let t = 0; t < duration; t += dt) {
            // 1. Apply exponential drag (matching server)
            const dragFactor = Math.exp(-DRAG * dt);
            simVx *= dragFactor;
            simVy *= dragFactor;

            // 2. Update position
            simX += simVx * dt;
            simY += simVy * dt;

            // 3. Robust bounce logic against world bounds (matching server exactly)
            if (simX - BALL_RADIUS < 0) {
                simX = BALL_RADIUS;
                simVx = -simVx * BOUNCE;
            } else if (simX + BALL_RADIUS > WORLD_WIDTH) {
                simX = WORLD_WIDTH - BALL_RADIUS;
                simVx = -simVx * BOUNCE;
            }

            if (simY - BALL_RADIUS < 0) {
                simY = BALL_RADIUS;
                simVy = -simVy * BOUNCE;
            } else if (simY + BALL_RADIUS > WORLD_HEIGHT) {
                simY = WORLD_HEIGHT - BALL_RADIUS;
                simVy = -simVy * BOUNCE;
            }

            // 4. Tile-based collision (FloorMarkingsLayer)
            if (this.floorMarkingsLayer) {
                const tile = this.floorMarkingsLayer.getTileAtWorldXY(
                    simX,
                    simY,
                );
                if (tile && tile.index !== -1) {
                    // Simple reflection for tile collisions in simulation
                    // We check which component of velocity brought us here
                    const prevX = simX - simVx * dt;
                    const prevY = simY - simVy * dt;

                    const tileX = this.floorMarkingsLayer.getTileAtWorldXY(
                        prevX,
                        simY,
                    );
                    const tileY = this.floorMarkingsLayer.getTileAtWorldXY(
                        simX,
                        prevY,
                    );

                    if (tileX && tileX.index !== -1) {
                        simVy = -simVy * BOUNCE;
                        simY = prevY; // snap back
                    }
                    if (tileY && tileY.index !== -1) {
                        simVx = -simVx * BOUNCE;
                        simX = prevX; // snap back
                    }
                    if (!tileX && !tileY) {
                        simVx = -simVx * BOUNCE;
                        simVy = -simVy * BOUNCE;
                        simX = prevX;
                        simY = prevY;
                    }
                }
            }

            this.metaVisionGraphics.lineTo(simX, simY);

            // Stop simulation if ball slows down below threshold (matching server)
            if (Math.sqrt(simVx * simVx + simVy * simVy) < 10) break;
        }

        this.metaVisionGraphics.strokePath();

        // Draw a small cyan circle at the final predicted position.
        this.metaVisionGraphics.fillStyle(0x00ffff, 0.8);
        this.metaVisionGraphics.fillCircle(simX, simY, 6);
    }

    private drawKickRange() {
        if (!this.kickRangeGraphics) return;

        this.kickRangeGraphics.clear();

        // Only visible when Metavision is active
        if (!this.isMetaVisionActive) return;

        // Use game time for animations
        const time = this.time.now;

        // 1. Standard range (140px)
        const stdRange = 140;
        // Subtle fill for standard range
        this.kickRangeGraphics.fillStyle(0xffffff, 0.08);
        this.kickRangeGraphics.fillCircle(this.ball.x, this.ball.y, stdRange);

        // Standard range outline
        this.kickRangeGraphics.lineStyle(2, 0xffffff, 0.4);
        this.kickRangeGraphics.strokeCircle(this.ball.x, this.ball.y, stdRange);

        // 2. Highlight active Metavision range
        const mvRange = 200;
        const pulse = (Math.sin(time / 150) + 1) / 2; // Faster pulse

        // Glowing fill for Metavision range
        this.kickRangeGraphics.fillStyle(0x00ffff, 0.1 + pulse * 0.05);
        this.kickRangeGraphics.fillCircle(this.ball.x, this.ball.y, mvRange);

        // Strong outer border
        this.kickRangeGraphics.lineStyle(3, 0x00ffff, 0.6);
        this.kickRangeGraphics.strokeCircle(this.ball.x, this.ball.y, mvRange);

        // Pulsing "sonar" rings
        for (let i = 0; i < 2; i++) {
            const ringPulse = ((time + i * 500) % 1000) / 1000;
            const ringAlpha = 0.4 * (1 - ringPulse);
            const ringRadius = stdRange + (mvRange - stdRange) * ringPulse;

            this.kickRangeGraphics.lineStyle(2, 0x00ffff, ringAlpha);
            this.kickRangeGraphics.strokeCircle(
                this.ball.x,
                this.ball.y,
                ringRadius,
            );
        }

        // Extra outer glow pulse
        this.kickRangeGraphics.lineStyle(1, 0x00ffff, 0.2 + pulse * 0.3);
        this.kickRangeGraphics.strokeCircle(
            this.ball.x,
            this.ball.y,
            mvRange + 5 + pulse * 10,
        );
    }

    private updateSkillCooldownUI() {
        if (!this.skillCooldownText) return;

        const skillConfig = this.skillConfigs.get("slowdown");
        if (!skillConfig) return;

        const now = Date.now();
        const timeSinceLastUse = now - this.skillCooldown;

        if (timeSinceLastUse >= skillConfig.cooldownMs) {
            // Skill is ready
            this.skillCooldownText.setText("Q: READY");
            this.skillCooldownText.setColor("#00ff00");
        } else {
            // Skill is on cooldown
            const remainingSeconds = Math.ceil(
                (skillConfig.cooldownMs - timeSinceLastUse) / 1000,
            );
            this.skillCooldownText.setText(`Q: ${remainingSeconds}s`);
            this.skillCooldownText.setColor("#ff0000");
        }
    }

    private applySkillVisuals(activatorId: string, visualConfig: any) {
        // Store the activator ID and visual config for trail effect
        this.activeSkillPlayerId = activatorId;
        this.activeSkillVisualConfig = visualConfig;

        // Apply grayscale if enabled in config
        if (visualConfig.enableGrayscale) {
            // Apply true grayscale (desaturation) to tilemap layers
            if (this.floorLayer && this.floorLayer.postFX) {
                const colorMatrix = this.floorLayer.postFX.addColorMatrix();
                colorMatrix.grayscale();
                this.grayscaleEffects.set(this.floorLayer, colorMatrix);
            }
            if (this.floorMarkingsLayer && this.floorMarkingsLayer.postFX) {
                const colorMatrix =
                    this.floorMarkingsLayer.postFX.addColorMatrix();
                colorMatrix.grayscale();
                this.grayscaleEffects.set(this.floorMarkingsLayer, colorMatrix);
            }
            if (this.goalsLayer && this.goalsLayer.postFX) {
                const colorMatrix = this.goalsLayer.postFX.addColorMatrix();
                colorMatrix.grayscale();
                this.grayscaleEffects.set(this.goalsLayer, colorMatrix);
            }
            if (this.circleLayer && this.circleLayer.postFX) {
                const colorMatrix = this.circleLayer.postFX.addColorMatrix();
                colorMatrix.grayscale();
                this.grayscaleEffects.set(this.circleLayer, colorMatrix);
            }

            // Apply grayscale to the ball
            if (this.ball && this.ball.postFX) {
                const colorMatrix = this.ball.postFX.addColorMatrix();
                colorMatrix.grayscale();
                this.grayscaleEffects.set(this.ball, colorMatrix);
            }

            // Apply grayscale to all players EXCEPT the activator
            for (const [playerId, player] of this.players.entries()) {
                if (playerId !== activatorId) {
                    if (player.postFX) {
                        const colorMatrix = player.postFX.addColorMatrix();
                        colorMatrix.grayscale();
                        this.grayscaleEffects.set(player, colorMatrix);
                    }
                    // Also apply to their team glow if it exists
                    if (player.teamGlow && player.teamGlow.postFX) {
                        const glowColorMatrix =
                            player.teamGlow.postFX.addColorMatrix();
                        glowColorMatrix.grayscale();
                        this.grayscaleEffects.set(
                            player.teamGlow,
                            glowColorMatrix,
                        );
                    }
                }
                // Activating player remains fully colored (no effects)
            }
        }

        console.log(
            `Skill visuals applied - player ${activatorId} with config:`,
            visualConfig,
        );
    }

    private removeSkillVisuals() {
        // Clear activator ID to stop trail creation
        this.activeSkillPlayerId = null;

        // Clean up all trail sprites
        this.clearSpeedTrail();

        // Remove all grayscale ColorMatrix effects
        for (const [
            gameObject,
            colorMatrix,
        ] of this.grayscaleEffects.entries()) {
            const go = gameObject as any;
            if (go && go.postFX) {
                // Remove the specific ColorMatrix effect
                go.postFX.remove(colorMatrix);
            }
        }

        // Clear the effects map
        this.grayscaleEffects.clear();

        console.log("Skill visuals removed - all colors restored");
    }

    private createSpeedTrail(time: number) {
        if (!this.activeSkillPlayerId || !this.activeSkillVisualConfig) return;

        // Check if speed trail is enabled in config
        if (!this.activeSkillVisualConfig.enableSpeedTrail) return;

        const player = this.players.get(this.activeSkillPlayerId);
        if (!player) return;

        // Use configured trail interval (default 30ms)
        const trailInterval = this.activeSkillVisualConfig.trailInterval || 30;
        if (time - this.trailTimer < trailInterval) return;
        this.trailTimer = time;

        // Create a trail sprite at the player's current position
        const trail = this.add.sprite(
            player.x,
            player.y,
            player.texture.key,
            player.frame.name,
        );

        // Match player properties
        trail.setScale(player.scaleX, player.scaleY);
        trail.setFlipX(player.flipX);
        trail.setDepth(player.depth - 1);

        // Use configured trail color (default cyan)
        const trailColor = this.activeSkillVisualConfig.trailColor || 0x00ffff;
        trail.setTintFill(trailColor);
        trail.setAlpha(0.7);

        // Store the trail sprite
        this.trailSprites.push(trail);

        // Use configured fade duration (default 300ms)
        const fadeDuration =
            this.activeSkillVisualConfig.trailFadeDuration || 300;

        // Fade out and destroy the trail sprite
        this.tweens.add({
            targets: trail,
            alpha: 0,
            duration: fadeDuration,
            ease: "Power2",
            onComplete: () => {
                trail.destroy();
                // Remove from array
                const index = this.trailSprites.indexOf(trail);
                if (index > -1) {
                    this.trailSprites.splice(index, 1);
                }
            },
        });
    }

    private clearSpeedTrail() {
        // Destroy all trail sprites
        for (const trail of this.trailSprites) {
            if (trail && trail.active) {
                trail.destroy();
            }
        }
        this.trailSprites = [];
        this.trailTimer = 0;
    }

    private createBlinkEffect(
        playerId: string,
        fromX: number, // MUST pass where the player was BEFORE the blink
        fromY: number,
        toX: number,
        toY: number,
        visualConfig: any,
    ) {
        const player = this.players.get(playerId);
        if (!player) return;

        const tint = visualConfig.tint || 0x00ffff;
        const fadeDuration = visualConfig.trailFadeDuration || 200;

        // 1. Force High Density (Multiple Ghosts)
        // We set this very low (e.g., 8 pixels). This ensures that even a
        // short blink (e.g., 100px) generates ~12 ghosts.
        const stepSize = 40;

        const distance = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);

        // If distance is too small, just exit (avoids division by zero or stacking)
        if (distance < stepSize) return;

        const numGhosts = Math.floor(distance / stepSize);
        const dx = (toX - fromX) / numGhosts;
        const dy = (toY - fromY) / numGhosts;

        // 2. Create the Dense Trail
        for (let i = 0; i < numGhosts; i++) {
            const ghostX = fromX + dx * i;
            const ghostY = fromY + dy * i;

            const ghost = this.add.sprite(
                ghostX,
                ghostY,
                player.texture.key,
                player.frame.name,
            );

            // Match Player Properties
            ghost.setOrigin(player.originX, player.originY);
            ghost.setScale(player.scaleX, player.scaleY);
            ghost.setRotation(player.rotation);
            ghost.setFlip(player.flipX, player.flipY);
            ghost.setDepth(player.depth - 1);

            // Visuals
            ghost.setTint(tint);
            ghost.setAlpha(0.4); // Lower alpha because there are many overlapping ghosts
            ghost.setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: ghost,
                alpha: 0,
                // Shrink slightly to create a "cone" shape trail
                scaleX: player.scaleX * 0.6,
                scaleY: player.scaleY * 0.6,
                duration: fadeDuration,
                delay: i * 5, // Fast ripple
                onComplete: () => ghost.destroy(),
            });
        }

        // 3. Impact Ring (Destination)
        const impactRing = this.add.circle(toX, toY, 10);
        impactRing.setStrokeStyle(3, tint);
        this.tweens.add({
            targets: impactRing,
            radius: 40,
            alpha: 0,
            duration: 300,
            ease: "Quad.out",
            onComplete: () => impactRing.destroy(),
        });

        // 4. Departure Ring (Optional: Leaves a ring where you came from)
        // This helps visually confirm the start point even if standing still
        const startRing = this.add.circle(fromX, fromY, 15);
        startRing.setStrokeStyle(2, tint);
        this.tweens.add({
            targets: startRing,
            scale: 0.1, // Implode effect
            alpha: 0,
            duration: 200,
            onComplete: () => startRing.destroy(),
        });
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
                this.soccerStats = stats;
            }
        } catch (error) {
            console.error("Failed to check soccer stats:", error);
            // Optionally open modal on error, or silently fail
        }
    }

    destroy() {
        if (this.inputLoop) this.inputLoop.destroy();
        if (this.skillCooldownText) this.skillCooldownText.destroy();
        this.metaVisionGraphics?.destroy();
        this.kickRangeGraphics?.destroy();
        if (this.multiplayer) {
            this.multiplayer.socket.off("ball:state");
            this.multiplayer.socket.off("ball:kicked");
            this.multiplayer.socket.off("goal:scored");
            this.multiplayer.socket.off("players:physicsUpdate");
            this.multiplayer.socket.off("soccer:playerReset");
            this.multiplayer.socket.off("soccer:teamAssigned");
        }

        useUiStore.getState().setCurrentScene("");
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

        // Store layer references for skill visuals
        this.floorLayer = floorLayer;
        this.goalsLayer = goalsLayer;
        this.circleLayer = circleLayer;

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
