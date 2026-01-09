/* eslint-disable @typescript-eslint/no-explicit-any */
import usePlayersStore from "@/common/store/playerStore";
import useUiStore from "@/common/store/uiStore";
import { BaseGameScene } from "./BaseGameScene";
import { Player } from "../player/player";
import { Ball } from "../soccer/Ball";
import { getSoccerStats } from "@/lib/api/soccer-stats";
import useSoccerStore from "@/common/store/soccerStore";

export interface SkillConfig {
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
    private floorMarkings2Layer: Phaser.Tilemaps.TilemapLayer | null = null;
    private kickKey: Phaser.Input.Keyboard.Key | null = null;
    private skillKey: Phaser.Input.Keyboard.Key | null = null;
    private blinkKey: Phaser.Input.Keyboard.Key | null = null;
    private metavisionKey: Phaser.Input.Keyboard.Key | null = null;
    private ninjaStepKey: Phaser.Input.Keyboard.Key | null = null;
    private lurkingKey: Phaser.Input.Keyboard.Key | null = null;
    private powerShotKey: Phaser.Input.Keyboard.Key | null = null;
    private isMultiplayerMode: boolean = false;
    private inputLoop: Phaser.Time.TimerEvent | null = null;
    private skillCooldown: number = 0;
    private blinkCooldown: number = 0;
    private metavisionCooldown: number = 0;
    private powerShotCooldown: number = 0;
    private ballFlameGraphics: Phaser.GameObjects.Graphics | null = null;
    private ballFlameActive: boolean = false;
    private ballFlameStartTime: number = 0;
    private powerShotBuffEndTime: number = 0;
    private ballTrailActive: boolean = false;
    private ballTrailTimer: number = 0;
    private ballTrailSprites: Phaser.GameObjects.Sprite[] = [];
    private isMetaVisionActive: boolean = false;
    private metaVisionGraphics: Phaser.GameObjects.Graphics | null = null;
    private kickRangeGraphics: Phaser.GameObjects.Graphics | null = null;
    private lurkingGraphics: Phaser.GameObjects.Graphics | null = null;
    private skillCooldownText: Phaser.GameObjects.Text | null = null;

    private activeSkillPlayerId: string | null = null;
    private activeSkillId: string | null = null;
    private lurkingPlayerId: string | null = null;
    private lurkingEndTime: number = 0;
    private activeSkillVisualConfig: SkillConfig["clientVisuals"] | null = null;
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

        // Automatically open game controls
        useUiStore.getState().openSoccerGameControlModal();

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
        this.lurkingKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F) ||
            null;
        this.powerShotKey =
            this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G) ||
            null;

        this.metaVisionGraphics = this.add.graphics();
        this.metaVisionGraphics.setDepth(1000);

        this.kickRangeGraphics = this.add.graphics();
        this.kickRangeGraphics.setDepth(2);
        this.kickRangeGraphics.setBlendMode(Phaser.BlendModes.ADD);

        this.lurkingGraphics = this.add.graphics();
        this.lurkingGraphics.setDepth(3);
        this.lurkingGraphics.setBlendMode(Phaser.BlendModes.ADD);

        if (this.isMultiplayerMode) {
            this.setupServerListeners();
            this.startInputLoop();
        } else {
            this.setupLocalPhysics();
        }
    }

    update(time: number): void {
        super.update(time);
        if (this.time.now % 1000 < 20) {
            console.log("Ball:", this.ball.getDebugInfo());
        }

        const isSelectionPhaseActive =
            useSoccerStore.getState().isSelectionPhaseActive;

        // FIX: Check for pending teams every frame until they are assigned
        this.processPendingTeams();
        this.updateSkillCooldownUI();

        if (this.activeSkillPlayerId) {
            this.createSpeedTrail(time);
        }

        if (this.ballTrailActive) {
            this.createBallTrail(time);
        }

        if (this.isMultiplayerMode) {
            this.ball.update();

            this.updateTeamGlows();

            if (!isSelectionPhaseActive) {
                const isGameActive = useSoccerStore.getState().isGameActive;
                this.drawKickRange();
                this.drawLurkingRadius();
                this.handleMultiplayerKickInput();

                if (isGameActive) {
                    // During active game, all skills are on Q
                    this.handleUnifiedSkillInput();
                } else {
                    // Lobby mode: original hotkeys
                    this.handleSkillInput();
                    this.handleBlinkInput();
                    this.handleMetaVisionInput();
                    this.handleNinjaStepInput();
                    this.handleLurkingInput();
                    this.handlePowerShotInput();
                }
            }

            if (this.isMetaVisionActive) {
                this.drawTrajectory();
            }

            // Render ball flames if active
            this.renderBallFlames();

            // Check if power shot buff expired (remove trail) - only for power shot
            if (
                this.activeSkillId === "power_shot" &&
                this.powerShotBuffEndTime > 0 &&
                this.time.now >= this.powerShotBuffEndTime &&
                this.activeSkillPlayerId
            ) {
                this.removeSkillVisuals();
            }
        } else {
            this.handleKick();
        }
    }

    // Force update all team glow positions to stay in perfect sync with players
    private updateTeamGlows() {
        for (const player of this.players.values()) {
            if (player.teamGlow && player.team) {
                player.teamGlow.setPosition(player.x, player.y);
                player.teamGlow.setFrame(player.frame.name);
                player.teamGlow.setFlipX(player.flipX);
                player.teamGlow.setDepth(player.depth - 1);
                player.teamGlow.setScale(
                    player.scaleX * 1.15,
                    player.scaleY * 1.15,
                );
            }
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

        socket.on("pong", (latency: number) => {
            // Update ball interpolation delay based on actual network conditions
            this.ball.setNetworkConditions(latency);

            // Update all remote players
            this.players.forEach((player, id) => {
                if (id !== this.localPlayerId) {
                    player.setNetworkConditions(latency);
                }
            });
        });
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
            this.sound.play("soccer_cheer", { volume: 0.2 });
            this.ball.setPosition(
                this.worldBounds.width / 2,
                this.worldBounds.height / 2,
            );
            this.ball.setVelocity(0, 0);
        });

        socket.on("players:physicsUpdate", (data: any) => {
            let updates: any[] = [];
            let sharedTimestamp = Date.now();

            if (Array.isArray(data)) {
                updates = data;
            } else if (data && data.updates) {
                updates = data.updates;
                sharedTimestamp = data.timestamp || Date.now();
            }

            for (const update of updates) {
                const player = this.players.get(update.id);
                if (!player) continue;

                player.isGhosted = !!update.isGhosted;
                player.isSpectator = !!update.isSpectator;

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
                    player.addServerSnapshot({
                        x: update.x,
                        y: update.y,
                        vx: update.vx,
                        vy: update.vy,
                        timestamp: update.timestamp || sharedTimestamp,
                    });
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
            (data: {
                playerId: string;
                team: "red" | "blue" | "spectator" | null;
            }) => {
                // Update player sprite glow
                const player = this.players.get(data.playerId);
                if (player) {
                    player.setTeam(data.team as any);
                    // Also remove from pending if we happen to get a live update
                    this.pendingTeams.delete(data.playerId);
                } else if (data.team) {
                    // If we get a live update for a player we haven't rendered yet
                    this.pendingTeams.set(data.playerId, data.team as any);
                }
            },
        );

        socket.on(
            "soccer:startMidGamePick",
            (data: { availableSkills: string[] }) => {
                console.log("Mid-game Skill Pick Started", data);
                useSoccerStore
                    .getState()
                    .setAvailableSkillIds(data.availableSkills);
                useSoccerStore.getState().setSelectionPhaseActive(true);
                useSoccerStore
                    .getState()
                    .setCurrentPickerId(this.localPlayerId);
                useSoccerStore
                    .getState()
                    .setSelectionTurnEndTime(Date.now() + 30000);
            },
        );

        // Skill Selection Events
        socket.on(
            "soccer:selectionPhaseStarted",
            (data: { order: string[]; availableSkills: string[] }) => {
                console.log("Skill Selection Started", data);
                useSoccerStore.getState().resetSelection();
                useSoccerStore.getState().setSelectionOrder(data.order);
                useSoccerStore
                    .getState()
                    .setAvailableSkillIds(data.availableSkills);
                useSoccerStore.getState().setSelectionPhaseActive(true);
            },
        );

        socket.on(
            "soccer:selectionUpdate",
            (data: {
                currentPickerId: string;
                endTime: number;
                availableSkills: string[];
            }) => {
                console.log("Selection Update", data);
                useSoccerStore
                    .getState()
                    .setCurrentPickerId(data.currentPickerId);
                useSoccerStore.getState().setSelectionTurnEndTime(data.endTime);
                useSoccerStore
                    .getState()
                    .setAvailableSkillIds(data.availableSkills);
            },
        );

        socket.on(
            "soccer:skillPicked",
            (data: {
                playerId: string;
                skillId: string;
                availableSkills: string[];
            }) => {
                console.log("Skill Picked", data);
                useSoccerStore
                    .getState()
                    .setPlayerPick(data.playerId, data.skillId);
                useSoccerStore
                    .getState()
                    .setAvailableSkillIds(data.availableSkills);

                const { selectionOrder } = useSoccerStore.getState();
                const isInitialDraft = selectionOrder.length > 0;

                // Only close overlay immediately if it's a mid-game joiner (no selection order)
                // For initial draft, wait for soccer:gameStarted
                if (data.playerId === this.localPlayerId && !isInitialDraft) {
                    useSoccerStore.getState().setSelectionPhaseActive(false);
                }
            },
        );

        socket.on("soccer:gameStarted", (data: { duration: number }) => {
            console.log("Game Started", data);
            useSoccerStore.getState().setSelectionPhaseActive(false);
            useSoccerStore.getState().setGameActive(true);
        });

        socket.on("soccer:gameEnd", (data: any) => {
            console.log("Game Ended", data);
            useSoccerStore.getState().setGameActive(false);
            useSoccerStore.getState().resetSelection();
        });

        socket.on("soccer:gameReset", () => {
            useSoccerStore.getState().setGameActive(false);
            useSoccerStore.getState().resetSelection();
        });

        // Request initial game state
        socket.emit("soccer:requestGameState", (state: any) => {
            console.log("Initial game state received:", state);
            useSoccerStore.getState().setGameActive(!!state.isGameActive);
            if (state.gameStatus === "SKILL_SELECTION") {
                useSoccerStore.getState().setSelectionPhaseActive(true);
            }
            // Sync any existing picks
            if (state.playerPicks) {
                Object.entries(state.playerPicks).forEach(([pid, sid]) => {
                    useSoccerStore.getState().setPlayerPick(pid, sid as string);
                });
            }
        });

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
                    }
                    const activator = this.players.get(data.activatorId);
                    if (activator) this.addKickGlow(activator);
                } else if (data.skillId === "lurking_radius") {
                    this.lurkingPlayerId = data.activatorId;
                    this.lurkingEndTime = this.time.now + data.duration;
                } else if (data.skillId === "power_shot") {
                    const activator = this.players.get(data.activatorId);
                    if (activator) {
                        const chargeRing = this.add.circle(
                            activator.x,
                            activator.y,
                            10,
                        );
                        chargeRing.setStrokeStyle(4, 0xff6600);
                        chargeRing.setDepth(activator.depth + 1);

                        this.tweens.add({
                            targets: chargeRing,
                            radius: 80,
                            alpha: 0,
                            duration: 400,
                            ease: "Quad.out",
                            onComplete: () => chargeRing.destroy(),
                        });

                        // Screen shake
                        this.cameras.main.shake(200, 0.01);

                        // Activate ball flames for 3 seconds
                        this.ballFlameActive = true;
                        this.ballFlameStartTime = this.time.now;
                        if (!this.ballFlameGraphics) {
                            this.ballFlameGraphics = this.add.graphics();
                            this.ballFlameGraphics.setDepth(
                                this.ball.depth + 1,
                            ); // Above ball
                        }

                        // Activate ball trail for 3 seconds
                        this.ballTrailActive = true;

                        console.log("Ball flames and trail activated!", {
                            active: this.ballFlameActive,
                            startTime: this.ballFlameStartTime,
                            graphics: !!this.ballFlameGraphics,
                            trailActive: this.ballTrailActive,
                        });

                        // Store buff end time for trail duration
                        this.powerShotBuffEndTime =
                            this.time.now + (data.duration || 3000);

                        // Add visual trail to player (tied to buff)
                        this.applySkillVisuals(
                            data.activatorId,
                            data.visualConfig,
                        );

                        // Track that power_shot is the active skill
                        this.activeSkillId = "power_shot";
                    }
                } else {
                    this.applySkillVisuals(data.activatorId, data.visualConfig);
                    this.activeSkillId = data.skillId;
                }

                // Play skill specific sound if provided, otherwise fallback to generic
                const sfxKey =
                    data.visualConfig?.sfxKey || "soccer_skill_activation";
                this.sound.play(sfxKey, { volume: 0.3 });
            },
        );

        // Listen for skill end
        socket.on(
            "soccer:skillEnded",
            (data: { activatorId: string; skillId: string }) => {
                if (
                    data.skillId === "lurking_radius" &&
                    this.lurkingPlayerId === data.activatorId
                ) {
                    this.lurkingPlayerId = null;
                    this.lurkingGraphics?.clear();
                }
                this.removeSkillVisuals();
                this.isMetaVisionActive = false;
                this.metaVisionGraphics?.clear();
            },
        );

        // Listen for skill trigger (e.g. Lurking Intercept)
        socket.on("soccer:skillTriggered", (data: any) => {
            if (data.type === "intercept") {
                const player = this.players.get(data.activatorId);
                if (player) {
                    // Teleport visual (Blink-like)
                    this.createBlinkEffect(
                        data.activatorId,
                        player.x,
                        player.y,
                        data.targetX,
                        data.targetY,
                        { trailColor: 0x800080 }, // Purple trail
                    );

                    // Snap position immediately
                    player.setPosition(data.targetX, data.targetY);

                    // End lurking
                    this.lurkingPlayerId = null;
                    this.lurkingGraphics?.clear();

                    this.sound.play("blink", { volume: 0.3 });
                }
            }
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
                    this.sound.play(sfxKey, { volume: 0.3 });
                }
            },
        );
    }

    private startInputLoop() {
        this.inputLoop = this.time.addEvent({
            delay: 16, // Matched to server 60Hz rate
            loop: true,
            callback: () => {
                this.sendPlayerInputs();
                this.checkDribbleInput();
            },
        });
    }

    private sendPlayerInputs() {
        if (!this.multiplayer) return;

        // Block movement during skill selection
        if (useSoccerStore.getState().isSelectionPhaseActive) {
            this.multiplayer.socket.emit("playerInput", {
                up: false,
                down: false,
                left: false,
                right: false,
            });
            return;
        }

        const cursors = this.input.keyboard?.createCursorKeys();
        const wasd = this.input.keyboard?.addKeys("W,A,S,D") as any;

        const up = cursors?.up.isDown || wasd?.W?.isDown;
        const down = cursors?.down.isDown || wasd?.S?.isDown;
        const left = cursors?.left.isDown || wasd?.A?.isDown;
        const right = cursors?.right.isDown || wasd?.D?.isDown;

        // Collision detection removed - players can now pass through CollisionLayer
        // Ball collision is handled server-side

        const input = {
            up,
            down,
            left,
            right,
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

        const distance = Phaser.Math.Distance.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );

        const kickThreshold = this.isMetaVisionActive ? 200 : 140;
        if (distance > kickThreshold) return;

        this.addKickGlow(localPlayer);

        const angle = Phaser.Math.Angle.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );

        // --- NEW: Client-Side Prediction Physics (Matches Server Logic) ---
        const baseKickPower = 1000;

        // 1. Get stats (or default to 0)
        const kickPowerStat = this.soccerStats?.kickPower ?? 0;

        // 2. Calculate Multiplier
        let kickPowerMultiplier = 1.0 + kickPowerStat * 0.1;

        // 3. Metavision Boost
        if (this.isMetaVisionActive) {
            kickPowerMultiplier *= 1.2;
        }

        const finalPower = baseKickPower * kickPowerMultiplier;
        const kickVx = Math.cos(angle) * finalPower;
        const kickVy = Math.sin(angle) * finalPower;

        // --- APPLY PREDICTION ---
        // This moves the ball instantly on client, bypassing 50-100ms lag
        this.ball.predictKick(kickVx, kickVy);

        // Play sound immediately for responsiveness
        this.sound.play("soccer_kick");

        // Send to server
        this.multiplayer?.socket.emit("ball:kick", {
            playerId: this.localPlayerId,
            kickPower: baseKickPower, // Send base power, server handles stats
            angle: angle,
        });
    }

    // ... (Remaining Local/Offline Methods kept same as provided) ...
    private setupLocalPhysics() {
        this.physics.add.collider(
            this.playersLayer,
            this.playersLayer,
            (p1, p2) => {
                const player1 = p1 as Player;
                const player2 = p2 as Player;
                // Skip collision if either is spectator
                if (
                    player1.team === "spectator" ||
                    player2.team === "spectator"
                ) {
                    return false;
                }
                return true;
            },
        );
        this.physics.add.collider(
            this.playersLayer,
            this.ball,
            (ball, player) => {
                const playerSprite = player as Player;
                if (playerSprite.team === "spectator") return;

                const ballSprite = ball as Ball;
                const maxSpeed = 150;
                const velocity = ballSprite.body!.velocity;
                if (velocity.length() > maxSpeed) {
                    velocity.normalize().scale(maxSpeed);
                }
            },
            (ball, player) => {
                const playerSprite = player as Player;
                if (playerSprite.team === "spectator") return false;

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
        this.triggerSlowdown();
    }

    private triggerSlowdown() {
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
        this.triggerBlink();
    }

    private triggerBlink() {
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
        this.triggerMetaVision();
    }

    private triggerMetaVision() {
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
        this.triggerNinjaStep();
    }

    private triggerNinjaStep() {
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "ninja_step",
        });
    }

    private handleLurkingInput() {
        if (
            !this.lurkingKey ||
            !Phaser.Input.Keyboard.JustDown(this.lurkingKey)
        )
            return;
        this.triggerLurkingRadius();
    }

    private handlePowerShotInput() {
        if (
            !this.powerShotKey ||
            !Phaser.Input.Keyboard.JustDown(this.powerShotKey)
        )
            return;

        this.triggerPowerShot();
    }

    private triggerLurkingRadius() {
        // Cooldown check is handled by server mostly, but we can do a local check if we want
        // For simplicity and consistency with server 2-stage logic, just emit
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "lurking_radius",
        });
    }

    private triggerPowerShot() {
        const skillConfig = this.skillConfigs.get("power_shot");
        if (!skillConfig) {
            console.warn("Power shot config not loaded");
            return;
        }

        const now = Date.now();
        if (now - this.powerShotCooldown < skillConfig.cooldownMs) {
            const remainingSeconds = Math.ceil(
                (skillConfig.cooldownMs - (now - this.powerShotCooldown)) /
                    1000,
            );
            console.log(
                `Power Shot on cooldown: ${remainingSeconds}s remaining`,
            );
            return;
        }

        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        // Check distance to ball
        const distance = Phaser.Math.Distance.Between(
            localPlayer.x,
            localPlayer.y,
            this.ball.x,
            this.ball.y,
        );

        if (distance > 200) {
            console.log(
                `Power Shot failed: Too far from ball (${distance.toFixed(0)} > 200)`,
            );
            return;
        }

        // Update cooldown
        this.powerShotCooldown = now;

        // Activate skill
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "power_shot",
        });

        console.log("Power Shot activated!");
    }

    private handleUnifiedSkillInput() {
        if (!this.skillKey || !Phaser.Input.Keyboard.JustDown(this.skillKey))
            return;

        const { playerPicks } = useSoccerStore.getState();
        const assignedSkillId = playerPicks[this.localPlayerId];
        if (!assignedSkillId) return;

        if (assignedSkillId === "slowdown") {
            this.triggerSlowdown();
        } else if (assignedSkillId === "blink") {
            this.triggerBlink();
        } else if (assignedSkillId === "metavision") {
            this.triggerMetaVision();
        } else if (assignedSkillId === "ninja_step") {
            this.triggerNinjaStep();
        } else if (assignedSkillId === "lurking_radius") {
            this.triggerLurkingRadius();
        } else if (assignedSkillId === "power_shot") {
            this.triggerPowerShot();
        }
    }

    private drawTrajectory() {
        if (!this.metaVisionGraphics) return;

        this.metaVisionGraphics.clear();

        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer || localPlayer.team === "spectator") return;

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

        const localPlayer = this.players.get(this.localPlayerId);
        if (localPlayer?.team === "spectator") return;

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

    private drawLurkingRadius() {
        if (!this.lurkingGraphics || !this.lurkingPlayerId) return;

        this.lurkingGraphics.clear();

        const player = this.players.get(this.lurkingPlayerId);
        if (!player) return;

        // Check expiration
        if (this.time.now > this.lurkingEndTime) {
            this.lurkingPlayerId = null;
            this.lurkingGraphics.clear();
            return;
        }

        const radius = 300;
        const distToBall = Phaser.Math.Distance.Between(
            player.x,
            player.y,
            this.ball.x,
            this.ball.y,
        );
        const isBallInside = distToBall <= radius;
        const time = this.time.now;

        // Animation variables
        const pulse = (Math.sin(time / 100) + 1) / 2;
        const fastPulse = (Math.sin(time / 50) + 1) / 2;
        const rotationAngle = (time / 1000) % (Math.PI * 2); // Full rotation every ~6 seconds

        if (isBallInside) {
            // ===== INTERCEPT READY STATE: Aggressive Green Energy =====

            // 1. Pulsing inner glow
            this.lurkingGraphics.fillStyle(0x00ff00, 0.15 + pulse * 0.1);
            this.lurkingGraphics.fillCircle(player.x, player.y, radius);

            // 2. Multiple concentric rings (expanding)
            for (let i = 0; i < 3; i++) {
                const offset = (time / 80 + i * 60) % 180;
                const ringRadius = radius - offset;
                if (ringRadius > 20) {
                    const alpha = 1 - offset / 180;
                    this.lurkingGraphics.lineStyle(3, 0x00ff00, alpha * 0.6);
                    this.lurkingGraphics.strokeCircle(
                        player.x,
                        player.y,
                        ringRadius,
                    );
                }
            }

            // 3. Main outer ring (bright)
            this.lurkingGraphics.lineStyle(5, 0x00ff00, 0.9 + fastPulse * 0.1);
            this.lurkingGraphics.strokeCircle(player.x, player.y, radius);

            // 4. Energy sparks around perimeter
            const sparkCount = 8;
            for (let i = 0; i < sparkCount; i++) {
                const angle = (i / sparkCount) * Math.PI * 2 + rotationAngle;
                const sparkX = player.x + Math.cos(angle) * radius;
                const sparkY = player.y + Math.sin(angle) * radius;
                const sparkSize = 3 + pulse * 2;

                this.lurkingGraphics.fillStyle(0xffffff, 0.8 + fastPulse * 0.2);
                this.lurkingGraphics.fillCircle(sparkX, sparkY, sparkSize);

                // Inner glow
                this.lurkingGraphics.fillStyle(0x00ff00, 0.4);
                this.lurkingGraphics.fillCircle(
                    sparkX,
                    sparkY,
                    sparkSize * 1.5,
                );
            }

            // 5. Rotating energy arcs
            const arcCount = 4;
            for (let i = 0; i < arcCount; i++) {
                const arcAngle =
                    (i / arcCount) * Math.PI * 2 + rotationAngle * 2;
                const startAngle = arcAngle;
                const endAngle = arcAngle + Math.PI / 4;

                this.lurkingGraphics.lineStyle(2, 0x00ff00, 0.6);
                this.lurkingGraphics.beginPath();
                this.lurkingGraphics.arc(
                    player.x,
                    player.y,
                    radius * 0.7,
                    startAngle,
                    endAngle,
                );
                this.lurkingGraphics.strokePath();
            }
        } else {
            // ===== SEARCHING STATE: Ominous Purple/Red Energy =====

            // 1. Dark pulsing background
            this.lurkingGraphics.fillStyle(0x800080, 0.08 + pulse * 0.04);
            this.lurkingGraphics.fillCircle(player.x, player.y, radius);

            // 2. Radar sweep effect
            const sweepAngle = rotationAngle;
            const sweepWidth = Math.PI / 3;

            this.lurkingGraphics.fillStyle(0x800080, 0.2);
            this.lurkingGraphics.slice(
                player.x,
                player.y,
                radius,
                sweepAngle - sweepWidth / 2,
                sweepAngle + sweepWidth / 2,
                false,
            );
            this.lurkingGraphics.fillPath();

            // 3. Dotted circle perimeter (scanning effect)
            const dotCount = 24;
            for (let i = 0; i < dotCount; i++) {
                const angle = (i / dotCount) * Math.PI * 2;
                const dotX = player.x + Math.cos(angle) * radius;
                const dotY = player.y + Math.sin(angle) * radius;

                // Fade dots based on sweep position
                const angleDiff =
                    Math.abs(
                        Phaser.Math.Angle.ShortestBetween(
                            angle * Phaser.Math.RAD_TO_DEG,
                            sweepAngle * Phaser.Math.RAD_TO_DEG,
                        ),
                    ) / 180;
                const dotAlpha = Math.max(0.2, 1 - angleDiff);

                this.lurkingGraphics.fillStyle(0x800080, dotAlpha * 0.8);
                this.lurkingGraphics.fillCircle(dotX, dotY, 2);
            }

            // 4. Main outer ring (purple)
            this.lurkingGraphics.lineStyle(2, 0x800080, 0.6);
            this.lurkingGraphics.strokeCircle(player.x, player.y, radius);

            // 5. Expanding danger pulse (red)
            const expandPulse = (time / 200) % 1;
            const expandRadius = radius + expandPulse * 20;
            const expandAlpha = (1 - expandPulse) * 0.5;

            this.lurkingGraphics.lineStyle(2, 0xff0000, expandAlpha);
            this.lurkingGraphics.strokeCircle(player.x, player.y, expandRadius);

            // 6. Inner concentric rings (slow pulse)
            for (let i = 1; i <= 2; i++) {
                const innerRadius = radius * (i / 3);
                this.lurkingGraphics.lineStyle(1, 0x800080, 0.3 + pulse * 0.2);
                this.lurkingGraphics.strokeCircle(
                    player.x,
                    player.y,
                    innerRadius,
                );
            }
        }

        // ===== ALWAYS DRAW: Heterochromia Eyes (Glowing) =====
        const eyeY = player.y - 15;
        const leftEyeX = player.x - 4;
        const rightEyeX = player.x + 4;
        const eyeGlow = 2 + fastPulse * 1;

        // Left eye (Green) with glow
        this.lurkingGraphics.fillStyle(0x00ff00, 0.3);
        this.lurkingGraphics.fillCircle(leftEyeX, eyeY, eyeGlow);
        this.lurkingGraphics.fillStyle(0x00ff00, 1);
        this.lurkingGraphics.fillCircle(leftEyeX, eyeY, 3);

        // Right eye (Purple) with glow
        this.lurkingGraphics.fillStyle(0x800080, 0.3);
        this.lurkingGraphics.fillCircle(rightEyeX, eyeY, eyeGlow);
        this.lurkingGraphics.fillStyle(0x800080, 1);
        this.lurkingGraphics.fillCircle(rightEyeX, eyeY, 3);
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

        // Hide team glow during speed trail to prevent trailing outline effect
        if (visualConfig.enableSpeedTrail) {
            const activator = this.players.get(activatorId);
            if (activator && activator.teamGlow) {
                activator.teamGlow.setVisible(false);
            }
        }

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
        // Don't remove if power shot buff is still active (only for power shot skill)
        if (
            this.activeSkillId === "power_shot" &&
            this.time.now < this.powerShotBuffEndTime
        ) {
            return;
        }

        for (const player of this.players.values()) {
            if (player.teamGlow) {
                player.teamGlow.setVisible(true);
            }
        }
        // Clear activator ID to stop trail creation
        this.activeSkillPlayerId = null;
        this.activeSkillId = null;

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

    private renderBallFlames() {
        if (!this.ballFlameActive || !this.ballFlameGraphics) return;

        const elapsed = this.time.now - this.ballFlameStartTime;
        const duration = 3000; // 3 seconds

        // Deactivate after duration
        if (elapsed > duration) {
            this.ballFlameActive = false;
            this.ballFlameGraphics.clear();
            this.clearBallTrail(); // Also clear ball trail
            console.log("Ball flames and trail deactivated after 3 seconds");
            return;
        }

        this.ballFlameGraphics.clear();

        // Create multiple flame layers
        const baseRadius = 30;
        const time = this.time.now / 100; // Animation speed

        for (let i = 0; i < 3; i++) {
            const offset = i * 0.5;
            const radius = baseRadius + Math.sin(time + offset) * 5;
            const alpha = 0.6 - i * 0.15;

            // Outer orange glow
            this.ballFlameGraphics.fillStyle(0xff6600, alpha);
            this.ballFlameGraphics.fillCircle(
                this.ball.x,
                this.ball.y,
                radius + 10 - i * 3,
            );

            // Inner red/yellow core
            this.ballFlameGraphics.fillStyle(0xffaa00, alpha + 0.2);
            this.ballFlameGraphics.fillCircle(
                this.ball.x,
                this.ball.y,
                radius - i * 5,
            );
        }

        // Add flame "sparks" trailing behind ball
        const body = this.ball.body as Phaser.Physics.Arcade.Body;
        if (body && body.velocity) {
            const velocityAngle = Math.atan2(body.velocity.y, body.velocity.x);
            for (let i = 0; i < 5; i++) {
                const trailDist = 20 + i * 8;
                const sparkX =
                    this.ball.x - Math.cos(velocityAngle) * trailDist;
                const sparkY =
                    this.ball.y - Math.sin(velocityAngle) * trailDist;
                const sparkSize = 4 - i * 0.6;
                const sparkAlpha = 0.8 - i * 0.15;

                this.ballFlameGraphics.fillStyle(0xff3300, sparkAlpha);
                this.ballFlameGraphics.fillCircle(sparkX, sparkY, sparkSize);
            }
        }
    }

    private createBallTrail(time: number) {
        if (!this.ballTrailActive) return;

        const trailInterval = 1; // ms between trail sprites
        const trailFadeDuration = 300; // ms for fade animation

        // Create trail sprite at intervals
        if (time - this.ballTrailTimer > trailInterval) {
            this.ballTrailTimer = time;

            // Create a trail sprite at ball's current position
            const trailSprite = this.add.sprite(
                this.ball.x,
                this.ball.y,
                "ball", // Use "ball" texture directly
            );
            trailSprite.setScale(this.ball.scaleX, this.ball.scaleY);
            trailSprite.setDepth(99); // High depth to be visible above floor layers
            trailSprite.setAlpha(0.3);
            trailSprite.setTintFill(0xff6600); // Orange/red tint

            this.ballTrailSprites.push(trailSprite);

            console.log("Ball trail sprite created:", {
                count: this.ballTrailSprites.length,
                position: { x: this.ball.x, y: this.ball.y },
                depth: trailSprite.depth,
            });

            // Fade out and destroy
            this.tweens.add({
                targets: trailSprite,
                alpha: 0,
                duration: trailFadeDuration,
                ease: "Power2",
                onComplete: () => {
                    trailSprite.destroy();
                    const index = this.ballTrailSprites.indexOf(trailSprite);
                    if (index > -1) {
                        this.ballTrailSprites.splice(index, 1);
                    }
                },
            });
        }
    }

    private clearBallTrail() {
        // Destroy all existing trail sprites
        this.ballTrailSprites.forEach((sprite) => sprite.destroy());
        this.ballTrailSprites = [];
        this.ballTrailActive = false;
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
        const floorMarkings2Layer = map.createLayer(
            "FloorMarkings2",
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
        this.floorMarkings2Layer = floorMarkings2Layer;

        if (floorMarkingsLayer) {
            layers.set("Floor_Markings_Layer", floorMarkingsLayer);
            this.floorMarkingsLayer = floorMarkingsLayer;
        }

        void this.floorMarkings2Layer;
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
