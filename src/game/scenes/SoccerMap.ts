/* eslint-disable @typescript-eslint/no-explicit-any */
import usePlayersStore from "@/common/store/playerStore";
import useUiStore from "@/common/store/uiStore";
import { BaseGameScene } from "./BaseGameScene";
import { Player } from "../player/player";
import { Ball } from "../soccer/Ball";
import { getSoccerStats } from "@/lib/api/soccer-stats";
import useSoccerStore from "@/common/store/soccerStore";
import {
    calculateKickVelocity,
    PHYSICS_CONSTANTS,
} from "../soccer/shared-physics";

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
    serverEffect?: {
        type: string;
        params: Record<string, any>;
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
    
    // Keys
    private kickKey: Phaser.Input.Keyboard.Key | null = null;
    private skillKey: Phaser.Input.Keyboard.Key | null = null;
    private blinkKey: Phaser.Input.Keyboard.Key | null = null;
    private metavisionKey: Phaser.Input.Keyboard.Key | null = null;
    private ninjaStepKey: Phaser.Input.Keyboard.Key | null = null;
    private lurkingKey: Phaser.Input.Keyboard.Key | null = null;
    private powerShotKey: Phaser.Input.Keyboard.Key | null = null;
    
    private isMultiplayerMode: boolean = false;
    
    // Network/Input State
    private inputFlushTimer: ReturnType<typeof setInterval> | null = null;
    private readonly INPUT_FLUSH_INTERVAL_MS: number = 8;
    private readonly MAX_INPUT_BATCH_SIZE: number = 32;
    
    // Skill State
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
    private localSpeedMultiplier: number = 1.0;
    private activeSpeedSkillId: string | null = null;
    private serverTickOffsetMs: number | null = null;

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

    private pendingTeams: Map<string, "red" | "blue"> = new Map();

    constructor() {
        super("SoccerMap");
    }

    preload() {
        this.load.setPath("/assets");
        this.load.image("goal", "tile-sets/goal.png");
        this.load.image("goal_2", "tile-sets/goal_2.png");
        this.load.image("circle", "tile-sets/circle.png");
        this.load.image("soccer", "tile-sets/soccer.png");

        this.load.audio("soccer_kick", "sounds/soccer_kick.mp3");
        this.load.audio("soccer_cheer", "sounds/soccer_cheer.mp3");
        this.load.audio("soccer_skill_activation", "sounds/soccer_skill_activation.mp3");
        this.load.audio("time_dilation", "sounds/skill_slow_down.mp3");
        this.load.audio("blink", "sounds/skill_blink.mp3");
        this.load.audio("skill_metavision", "sounds/ninja-sound-effect.mp3");
        this.load.audio("shadow", "sounds/skill_shadow.mp3");
        this.load.audio("lurking", "sounds/skill_lurking.mp3");
        this.load.audio("power_shot", "sounds/skill_power_shot.mp3");

        this.load.tilemapTiledJSON("soccer_map", "soccer_map.json");
    }

    create() {
        super.create();
        this.isMultiplayerMode = this.multiplayer !== undefined;

        useUiStore.getState().setCurrentScene("SoccerMap");
        this.checkSoccerStats();
        useUiStore.getState().openSoccerGameControlModal();
        this.createNetworkDiagnosticsUI();

        this.centerCamera();
        this.createBall();

        this.kickKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H) || null;
        this.skillKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q) || null;
        this.blinkKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) || null;
        this.metavisionKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R) || null;
        this.ninjaStepKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.T) || null;
        this.lurkingKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F) || null;
        this.powerShotKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G) || null;

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
            this.startInputFlushLoop();
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                this.stopInputFlushLoop();
            });
            this.events.once(Phaser.Scenes.Events.DESTROY, () => {
                this.stopInputFlushLoop();
            });
        } else {
            this.setupLocalPhysics();
        }
    }

    update(time: number, delta: number): void {
        super.update(time, delta);

        if (this.ball) {
            this.ball.update(time, delta);
        }

        const isSelectionPhaseActive = useSoccerStore.getState().isSelectionPhaseActive;
        this.processPendingTeams();
        this.updateSkillCooldownUI();

        if (this.activeSkillPlayerId) {
            this.createSpeedTrail(time);
        }

        if (this.ballFlameActive) {
            this.createBallTrail(time);
        }

        if (this.isMultiplayerMode) {
            this.updateTeamGlows();

            if (!isSelectionPhaseActive) {
                this.checkDribbleInput();
                const isGameActive = useSoccerStore.getState().isGameActive;
                this.drawKickRange();
                this.drawLurkingRadius();
                this.handleMultiplayerKickInput();

                if (isGameActive) {
                    this.handleUnifiedSkillInput();
                } else {
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

            this.renderBallFlames();

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

    private setupServerListeners() {
        if (!this.multiplayer) return;
        const socket = this.multiplayer.socket;

        socket.emit("soccer:getPlayers", (playerList: Array<{ id: string; team: "red" | "blue" | null }>) => {
            playerList.forEach((playerData) => {
                if (!playerData.team) return;
                const player = this.players.get(playerData.id);
                if (player) {
                    player.setTeam(playerData.team);
                } else {
                    this.pendingTeams.set(playerData.id, playerData.team);
                }
            });
        });

        socket.emit("soccer:requestSkillConfig", (configs: SkillConfig[]) => {
            configs.forEach((config) => this.skillConfigs.set(config.id, config));
        });

        socket.on("ball:state", (state: any) => {
            this.ball.onServerUpdate(state);
        });

        socket.on("ball:kicked", (data: any) => {
            if (data.kickerId === this.localPlayerId) {
                this.ball.acknowledgeKick(data.localKickId);
                return;
            }

            this.sound.play("soccer_kick");
            const kicker = this.players.get(data.kickerId);
            if (kicker) this.addKickGlow(kicker);
        });

        socket.on("goal:scored", (data: any) => {
            console.log(`GOAL! ${data.scoringTeam} scored!`);
            this.sound.play("soccer_cheer", { volume: 0.2 });
            this.ball.setPosition(PHYSICS_CONSTANTS.WORLD_WIDTH / 2, PHYSICS_CONSTANTS.WORLD_HEIGHT / 2);
        });

        socket.on("players:physicsUpdate", (data: { players: any[]; timestamp: number; tick?: number }) => {
            const { players, timestamp, tick } = data;
            const tickMs = PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS;
            if (typeof tick === "number") {
                const serverTickTime = tick * tickMs;
                const targetOffset = Date.now() - serverTickTime;
                if (this.serverTickOffsetMs === null) {
                    this.serverTickOffsetMs = targetOffset;
                } else {
                    this.serverTickOffsetMs =
                        this.serverTickOffsetMs * 0.9 + targetOffset * 0.1;
                }
            }
            const effectiveTimestamp =
                typeof tick === "number" && this.serverTickOffsetMs !== null
                    ? tick * tickMs + this.serverTickOffsetMs
                    : timestamp;
            for (const update of players) {
                const player = this.players.get(update.id);
                if (!player) continue;
                if (typeof tick === "number" && player.lastServerTick >= tick) {
                    continue;
                }

                player.isGhosted = !!update.isGhosted;
                player.isSpectator = !!update.isSpectator;

                if (player.isSpectator && player.body) {
                    player.body.enable = true;
                }

                if (player.isLocal) {
                    player.reconcile(
                        update.x,
                        update.y,
                        update.vx,
                        update.vy,
                        update.lastSequence || 0,
                        tick,
                    );
                } else {
                    player.pushSnapshot({
                        x: update.x,
                        y: update.y,
                        vx: update.vx,
                        vy: update.vy,
                        timestamp: effectiveTimestamp,
                    });
                }
            }
        });

        socket.on("soccer:playerReset", (data: { playerId: string; x: number; y: number }) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.setPosition(data.x, data.y);
            }
        });

        socket.on("soccer:teamAssigned", (data: { playerId: string; team: "red" | "blue" | "spectator" | null }) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.setTeam(data.team as any);
                this.pendingTeams.delete(data.playerId);
            } else if (data.team) {
                this.pendingTeams.set(data.playerId, data.team as any);
            }
        });

        socket.on("soccer:startMidGamePick", (data: { availableSkills: string[] }) => {
            useSoccerStore.getState().setAvailableSkillIds(data.availableSkills);
            useSoccerStore.getState().setSelectionPhaseActive(true);
            useSoccerStore.getState().setCurrentPickerId(this.localPlayerId);
            useSoccerStore.getState().setSelectionTurnEndTime(Date.now() + 30000);
        });

        socket.on("soccer:selectionPhaseStarted", (data: { order: string[]; availableSkills: string[] }) => {
            useSoccerStore.getState().resetSelection();
            useSoccerStore.getState().setSelectionOrder(data.order);
            useSoccerStore.getState().setAvailableSkillIds(data.availableSkills);
            useSoccerStore.getState().setSelectionPhaseActive(true);
        });

        socket.on("soccer:selectionUpdate", (data: { currentPickerId: string; endTime: number; availableSkills: string[] }) => {
            useSoccerStore.getState().setCurrentPickerId(data.currentPickerId);
            useSoccerStore.getState().setSelectionTurnEndTime(data.endTime);
            useSoccerStore.getState().setAvailableSkillIds(data.availableSkills);
        });

        socket.on("soccer:skillPicked", (data: { playerId: string; skillId: string; availableSkills: string[] }) => {
            useSoccerStore.getState().setPlayerPick(data.playerId, data.skillId);
            useSoccerStore.getState().setAvailableSkillIds(data.availableSkills);
            if (data.playerId === this.localPlayerId && useSoccerStore.getState().selectionOrder.length === 0) {
                useSoccerStore.getState().setSelectionPhaseActive(false);
            }
        });

        socket.on("soccer:gameStarted", () => {
            useSoccerStore.getState().setSelectionPhaseActive(false);
            useSoccerStore.getState().setGameActive(true);
        });

        socket.on("soccer:gameEnd", () => {
            useSoccerStore.getState().setGameActive(false);
            useSoccerStore.getState().resetSelection();
        });

        socket.on("soccer:gameReset", () => {
            useSoccerStore.getState().setGameActive(false);
            useSoccerStore.getState().resetSelection();
        });

        socket.emit("soccer:requestGameState", (state: any) => {
            useSoccerStore.getState().setGameActive(!!state.isGameActive);
            if (state.gameStatus === "SKILL_SELECTION") {
                useSoccerStore.getState().setSelectionPhaseActive(true);
            }
            if (state.playerPicks) {
                Object.entries(state.playerPicks).forEach(([pid, sid]) => {
                    useSoccerStore.getState().setPlayerPick(pid, sid as string);
                });
            }
        });

        socket.on("soccer:skillActivated", (data: { activatorId: string; skillId: string; affectedPlayers: string[]; duration: number; visualConfig: any }) => {
            const skillConfig = this.skillConfigs.get(data.skillId);
            const effectParams = skillConfig?.serverEffect?.params as any;
            const isSpeedEffect =
                effectParams?.type === "speed_slow" ||
                effectParams?.type === "speed_boost";

            if (
                isSpeedEffect &&
                data.affectedPlayers?.includes(this.localPlayerId)
            ) {
                const multiplier =
                    typeof effectParams.multiplier === "number"
                        ? effectParams.multiplier
                        : 1.0;
                this.localSpeedMultiplier = multiplier;
                this.activeSpeedSkillId = data.skillId;
                const localPlayer = this.players.get(this.localPlayerId);
                if (localPlayer) {
                    localPlayer.setExternalSpeedMultiplier(multiplier);
                }
            }

            if (data.skillId === "metavision") {
                if (data.activatorId === this.localPlayerId) this.isMetaVisionActive = true;
                const activator = this.players.get(data.activatorId);
                if (activator) this.addKickGlow(activator);
            } else if (data.skillId === "lurking_radius") {
                this.lurkingPlayerId = data.activatorId;
                this.lurkingEndTime = this.time.now + data.duration;
            } else if (data.skillId === "power_shot") {
                const activator = this.players.get(data.activatorId);
                if (activator) {
                    const chargeRing = this.add.circle(activator.x, activator.y, 10);
                    chargeRing.setStrokeStyle(4, 0xff6600);
                    chargeRing.setDepth(activator.depth + 1);
                    this.tweens.add({
                        targets: chargeRing, radius: 80, alpha: 0, duration: 400, ease: "Quad.out", onComplete: () => chargeRing.destroy()
                    });
                    this.cameras.main.shake(200, 0.01);
                    this.ballFlameActive = true;
                    this.ballFlameStartTime = this.time.now;
                    if (!this.ballFlameGraphics) {
                        this.ballFlameGraphics = this.add.graphics();
                        this.ballFlameGraphics.setDepth(this.ball.depth + 1);
                    }
                    this.ballTrailActive = true;
                    this.powerShotBuffEndTime = this.time.now + (data.duration || 3000);
                    this.applySkillVisuals(data.activatorId, data.visualConfig);
                    this.activeSkillId = "power_shot";
                }
            } else {
                this.applySkillVisuals(data.activatorId, data.visualConfig);
                this.activeSkillId = data.skillId;
            }
            this.sound.play(data.visualConfig?.sfxKey || "soccer_skill_activation", { volume: 0.3 });
        });

        socket.on("soccer:skillEnded", (data: { activatorId: string; skillId: string }) => {
            if (data.skillId === "lurking_radius" && this.lurkingPlayerId === data.activatorId) {
                this.lurkingPlayerId = null;
                this.lurkingGraphics?.clear();
            }
            if (this.activeSpeedSkillId === data.skillId) {
                this.localSpeedMultiplier = 1.0;
                this.activeSpeedSkillId = null;
                const localPlayer = this.players.get(this.localPlayerId);
                if (localPlayer) {
                    localPlayer.setExternalSpeedMultiplier(1.0);
                }
            }
            this.removeSkillVisuals();
            this.isMetaVisionActive = false;
            this.metaVisionGraphics?.clear();
        });

        socket.on("soccer:skillTriggered", (data: any) => {
            if (data.type === "intercept") {
                const player = this.players.get(data.activatorId);
                if (player) {
                    this.createBlinkEffect(data.activatorId, player.x, player.y, data.targetX, data.targetY, { trailColor: 0x800080 });
                    player.setPosition(data.targetX, data.targetY);
                    this.lurkingPlayerId = null;
                    this.lurkingGraphics?.clear();
                    this.sound.play("blink", { volume: 0.3 });
                }
            }
        });

        socket.on("soccer:blinkActivated", (data: { activatorId: string; fromX: number; fromY: number; toX: number; toY: number; visualConfig: any }) => {
            const player = this.players.get(data.activatorId);
            if (player) {
                player.setPosition(data.toX, data.toY);
                this.createBlinkEffect(data.activatorId, data.fromX, data.fromY, data.toX, data.toY, data.visualConfig);
                this.sound.play(data.visualConfig?.sfxKey || "blink", { volume: 0.3 });
            }
        });
    }

    private sendPlayerInput() {
        if (!this.multiplayer) return;
        const player = this.players.get(this.localPlayerId);
        if (!player || !player.isLocal) return;

        if (useSoccerStore.getState().isSelectionPhaseActive) {
            player.drainPendingNetworkInputs();
            return;
        }

        const pendingInputs = player.drainPendingNetworkInputs();
        if (pendingInputs.length === 0) return;

        for (let i = 0; i < pendingInputs.length; i += this.MAX_INPUT_BATCH_SIZE) {
            const chunk = pendingInputs.slice(i, i + this.MAX_INPUT_BATCH_SIZE);
            if (chunk.length === 0) continue;
            this.multiplayer.socket.emit("playerInputBatch", { inputs: chunk });
        }

    }

    private startInputFlushLoop() {
        if (this.inputFlushTimer !== null) {
            clearInterval(this.inputFlushTimer);
            this.inputFlushTimer = null;
        }

        this.inputFlushTimer = setInterval(() => {
            this.sendPlayerInput();
        }, this.INPUT_FLUSH_INTERVAL_MS);
    }

    private stopInputFlushLoop() {
        if (this.inputFlushTimer === null) return;
        this.sendPlayerInput();
        clearInterval(this.inputFlushTimer);
        this.inputFlushTimer = null;
    }

    private lastDribbleEmit: number = 0;
    private checkDribbleInput() {
        const now = Date.now();
        if (now - this.lastDribbleEmit < 50) return;

        const player = this.players.get(this.localPlayerId);
        if (!player) return;
        const distToBall = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);
        if (distToBall < 100) {
            this.lastDribbleEmit = now;
            this.multiplayer.socket.emit("ball:dribble", {
                playerId: player.id,
                playerX: player.x,
                playerY: player.y,
                playerVx: player.physicsState.vx,
                playerVy: player.physicsState.vy,
            });
        }
    }

    private handleMultiplayerKickInput() {
        if (!this.kickKey || !Phaser.Input.Keyboard.JustDown(this.kickKey)) return;

        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        const distance = Phaser.Math.Distance.Between(localPlayer.x, localPlayer.y, this.ball.x, this.ball.y);
        const kickRange = this.isMetaVisionActive ? 200 : 140;
        if (distance > kickRange) return;

        const angle = Phaser.Math.Angle.Between(localPlayer.x, localPlayer.y, this.ball.x, this.ball.y);
        const basePower = 1000;
        const kickPowerStat = this.soccerStats?.kickPower ?? 0;

        const kickVelocity = calculateKickVelocity(angle, basePower, kickPowerStat, this.isMetaVisionActive);
        const localKickId = this.ball.predictKick(kickVelocity.vx, kickVelocity.vy);
        this.sound.play("soccer_kick");
        this.addKickGlow(localPlayer);

        this.multiplayer?.socket.emit("ball:kick", {
            playerId: this.localPlayerId,
            kickPower: basePower,
            angle: angle,
            timestamp: Date.now(),
            localKickId,
        });
    }

    private handleKick() {
        if (!this.kickKey || !Phaser.Input.Keyboard.JustDown(this.kickKey)) return;
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;
        const distance = Phaser.Math.Distance.Between(localPlayer.x, localPlayer.y, this.ball.x, this.ball.y);
        if (distance > 200) return;
        const angle = Phaser.Math.Angle.Between(localPlayer.x, localPlayer.y, this.ball.x, this.ball.y);
        const kickPower = 1000;
        this.ball.setVelocity(Math.cos(angle) * kickPower, Math.sin(angle) * kickPower);
        this.sound.play("soccer_kick");
    }

    private handleSkillInput() {
        if (!this.skillKey || !Phaser.Input.Keyboard.JustDown(this.skillKey)) return;
        this.triggerSlowdown();
    }

    private triggerSlowdown() {
        const skillConfig = this.skillConfigs.get("slowdown");
        if (!skillConfig) return;
        const now = Date.now();
        if (now - this.skillCooldown < skillConfig.cooldownMs) return;
        const localPlayer = this.players.get(this.localPlayerId);
        this.skillCooldown = now;
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "slowdown",
            facingDirection: localPlayer?.lastFacingDirection || "DOWN",
        });
    }

    private handleBlinkInput() {
        if (!this.blinkKey || !Phaser.Input.Keyboard.JustDown(this.blinkKey)) return;
        this.triggerBlink();
    }

    private triggerBlink() {
        const skillConfig = this.skillConfigs.get("blink");
        if (!skillConfig) return;
        const now = Date.now();
        if (now - this.blinkCooldown < skillConfig.cooldownMs) return;
        const localPlayer = this.players.get(this.localPlayerId);
        this.blinkCooldown = now;
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "blink",
            facingDirection: localPlayer?.lastFacingDirection || "DOWN",
        });
    }

    private handleMetaVisionInput() {
        if (!this.metavisionKey || !Phaser.Input.Keyboard.JustDown(this.metavisionKey)) return;
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
        if (!this.ninjaStepKey || !Phaser.Input.Keyboard.JustDown(this.ninjaStepKey)) return;
        this.triggerNinjaStep();
    }

    private triggerNinjaStep() {
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "ninja_step",
        });
    }

    private handleLurkingInput() {
        if (!this.lurkingKey || !Phaser.Input.Keyboard.JustDown(this.lurkingKey)) return;
        this.triggerLurkingRadius();
    }

    private triggerLurkingRadius() {
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "lurking_radius",
        });
    }

    private handlePowerShotInput() {
        if (!this.powerShotKey || !Phaser.Input.Keyboard.JustDown(this.powerShotKey)) return;
        this.triggerPowerShot();
    }

    private triggerPowerShot() {
        const skillConfig = this.skillConfigs.get("power_shot");
        if (!skillConfig) return;
        const now = Date.now();
        if (now - this.powerShotCooldown < skillConfig.cooldownMs) return;
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;
        const distance = Phaser.Math.Distance.Between(localPlayer.x, localPlayer.y, this.ball.x, this.ball.y);
        if (distance > 200) return;
        this.powerShotCooldown = now;
        this.multiplayer?.socket.emit("soccer:activateSkill", {
            playerId: this.localPlayerId,
            skillId: "power_shot",
        });
    }

    private handleUnifiedSkillInput() {
        if (!this.skillKey || !Phaser.Input.Keyboard.JustDown(this.skillKey)) return;
        const { playerPicks } = useSoccerStore.getState();
        const assignedSkillId = playerPicks[this.localPlayerId];
        if (!assignedSkillId) return;
        const handlers: any = {
            slowdown: () => this.triggerSlowdown(),
            blink: () => this.triggerBlink(),
            metavision: () => this.triggerMetaVision(),
            ninja_step: () => this.triggerNinjaStep(),
            lurking_radius: () => this.triggerLurkingRadius(),
            power_shot: () => this.triggerPowerShot(),
        };
        handlers[assignedSkillId]?.();
    }

    private drawTrajectory() {
        if (!this.metaVisionGraphics) return;
        this.metaVisionGraphics.clear();
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer || localPlayer.team === "spectator") return;

        const distance = Phaser.Math.Distance.Between(localPlayer.x, localPlayer.y, this.ball.x, this.ball.y);
        const ballSpeed = Math.sqrt(this.ball.targetPos.vx ** 2 + this.ball.targetPos.vy ** 2);
        const isBallMoving = ballSpeed > 10;
        const threshold = isBallMoving ? 2000 : 300;
        if (distance > threshold) return;

        if (!isBallMoving) {
            const isInKickRange = distance <= (this.isMetaVisionActive ? 200 : 140);
            this.metaVisionGraphics.lineStyle(2, isInKickRange ? 0x00ff00 : 0x00ffff, isInKickRange ? 0.6 : 0.3);
            const angleToBall = Phaser.Math.Angle.Between(localPlayer.x, localPlayer.y, this.ball.x, this.ball.y);
            let cx = localPlayer.x, cy = localPlayer.y;
            for (let i = 0; i < distance / 15; i++) {
                this.metaVisionGraphics.beginPath();
                this.metaVisionGraphics.moveTo(cx, cy);
                cx += Math.cos(angleToBall) * 10; cy += Math.sin(angleToBall) * 10;
                this.metaVisionGraphics.lineTo(cx, cy);
                this.metaVisionGraphics.strokePath();
                cx += Math.cos(angleToBall) * 5; cy += Math.sin(angleToBall) * 5;
            }
        }

        let sx = this.ball.x, sy = this.ball.y, svx = 0, svy = 0;
        if (isBallMoving) {
            svx = this.ball.targetPos.vx; svy = this.ball.targetPos.vy;
        } else {
            const angle = Phaser.Math.Angle.Between(localPlayer.x, localPlayer.y, this.ball.x, this.ball.y);
            const kickVel = calculateKickVelocity(angle, 1000, this.soccerStats?.kickPower ?? 0, true);
            svx = kickVel.vx; svy = kickVel.vy;
        }

        this.metaVisionGraphics.lineStyle(2, 0x00ffff, 1.0);
        this.metaVisionGraphics.beginPath();
        this.metaVisionGraphics.moveTo(sx, sy);
        const dt = 0.016, dur = 2;
        for (let t = 0; t < dur; t += dt) {
            const df = Math.exp(-PHYSICS_CONSTANTS.BALL_DRAG * dt);
            svx *= df; svy *= df;
            sx += svx * dt; sy += svy * dt;
            if (sx < 30 || sx > this.worldBounds.width - 30) svx *= -PHYSICS_CONSTANTS.BALL_BOUNCE;
            if (sy < 30 || sy > this.worldBounds.height - 30) svy *= -PHYSICS_CONSTANTS.BALL_BOUNCE;
            this.metaVisionGraphics.lineTo(sx, sy);
            if (Math.sqrt(svx * svx + svy * svy) < 10) break;
        }
        this.metaVisionGraphics.strokePath();
        this.metaVisionGraphics.fillStyle(0x00ffff, 0.8).fillCircle(sx, sy, 6);
    }

    private drawKickRange() {
        if (!this.kickRangeGraphics || !this.isMetaVisionActive) return;
        this.kickRangeGraphics.clear();
        const time = this.time.now;
        const stdRange = 140, mvRange = 200, pulse = (Math.sin(time / 150) + 1) / 2;
        this.kickRangeGraphics.fillStyle(0xffffff, 0.08).fillCircle(this.ball.x, this.ball.y, stdRange);
        this.kickRangeGraphics.lineStyle(2, 0xffffff, 0.4).strokeCircle(this.ball.x, this.ball.y, stdRange);
        this.kickRangeGraphics.fillStyle(0x00ffff, 0.1 + pulse * 0.05).fillCircle(this.ball.x, this.ball.y, mvRange);
        this.kickRangeGraphics.lineStyle(3, 0x00ffff, 0.6).strokeCircle(this.ball.x, this.ball.y, mvRange);
        for (let i = 0; i < 2; i++) {
            const p = ((time + i * 500) % 1000) / 1000;
            this.kickRangeGraphics.lineStyle(2, 0x00ffff, 0.4 * (1 - p)).strokeCircle(this.ball.x, this.ball.y, stdRange + (mvRange - stdRange) * p);
        }
    }

    private drawLurkingRadius() {
        if (!this.lurkingGraphics || !this.lurkingPlayerId) return;
        this.lurkingGraphics.clear();
        const player = this.players.get(this.lurkingPlayerId);
        if (!player || this.time.now > this.lurkingEndTime) { this.lurkingPlayerId = null; return; }
        const r = 300, time = this.time.now, p = (Math.sin(time / 100) + 1) / 2;
        const inside = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y) <= r;
        if (inside) {
            this.lurkingGraphics.fillStyle(0x00ff00, 0.15 + p * 0.1).fillCircle(player.x, player.y, r);
            this.lurkingGraphics.lineStyle(5, 0x00ff00, 1).strokeCircle(player.x, player.y, r);
        } else {
            this.lurkingGraphics.fillStyle(0x800080, 0.08 + p * 0.04).fillCircle(player.x, player.y, r);
            this.lurkingGraphics.lineStyle(2, 0x800080, 0.6).strokeCircle(player.x, player.y, r);
        }
    }

    private updateSkillCooldownUI() {
        if (!this.skillCooldownText) return;
        const config = this.skillConfigs.get("slowdown");
        if (!config) return;
        const diff = Date.now() - this.skillCooldown;
        if (diff >= config.cooldownMs) {
            this.skillCooldownText.setText("Q: READY").setColor("#00ff00");
        } else {
            this.skillCooldownText.setText(`Q: ${Math.ceil((config.cooldownMs - diff) / 1000)}s`).setColor("#ff0000");
        }
    }

    private createNetworkDiagnosticsUI() {
        if (!this.isMultiplayerMode) return;
        const text = this.add.text(10, 50, "", { fontSize: "14px", color: "#00ff00", backgroundColor: "#000000aa", padding: { x: 5, y: 5 } }).setScrollFactor(0).setDepth(10000);
        this.time.addEvent({ delay: 500, loop: true, callback: () => {
            const ping = useUiStore.getState().ping || 0;
            const tick = this.ball?.targetPos?.t || 0;
            text.setText([`Ping: ${ping}ms`, `Sim Tick: ${tick}`].join("\n"));
        }});
    }

    private applySkillVisuals(activatorId: string, visualConfig: any) {
        this.activeSkillPlayerId = activatorId;
        this.activeSkillVisualConfig = visualConfig;
        if (visualConfig.enableSpeedTrail) this.players.get(activatorId)?.teamGlow?.setVisible(false);
        if (visualConfig.enableGrayscale) {
            [this.floorLayer, this.floorMarkingsLayer, this.goalsLayer, this.circleLayer, this.ball].forEach(go => {
                if (go?.postFX) this.grayscaleEffects.set(go, go.postFX.addColorMatrix().grayscale());
            });
            for (const [pid, p] of this.players.entries()) {
                if (pid !== activatorId) {
                    if (p.postFX) this.grayscaleEffects.set(p, p.postFX.addColorMatrix().grayscale());
                    if (p.teamGlow?.postFX) this.grayscaleEffects.set(p.teamGlow, p.teamGlow.postFX.addColorMatrix().grayscale());
                }
            }
        }
    }

    private removeSkillVisuals() {
        if (this.activeSkillId === "power_shot" && this.time.now < this.powerShotBuffEndTime) return;
        for (const p of this.players.values()) p.teamGlow?.setVisible(true);
        this.activeSkillPlayerId = null; this.activeSkillId = null;
        this.clearSpeedTrail();
        for (const [go, fx] of this.grayscaleEffects.entries()) (go as any).postFX?.remove(fx);
        this.grayscaleEffects.clear();
    }

    private createSpeedTrail(time: number) {
        if (!this.activeSkillPlayerId || !this.activeSkillVisualConfig?.enableSpeedTrail) return;
        const p = this.players.get(this.activeSkillPlayerId);
        if (!p || time - this.trailTimer < (this.activeSkillVisualConfig.trailInterval || 30)) return;
        this.trailTimer = time;
        const trail = this.add.sprite(p.x, p.y, p.texture.key, p.frame.name).setScale(p.scaleX, p.scaleY).setFlipX(p.flipX).setDepth(p.depth - 1).setTintFill(this.activeSkillVisualConfig.trailColor || 0x00ffff).setAlpha(0.7);
        this.trailSprites.push(trail);
        this.tweens.add({ targets: trail, alpha: 0, duration: this.activeSkillVisualConfig.trailFadeDuration || 300, onComplete: () => { trail.destroy(); this.trailSprites.splice(this.trailSprites.indexOf(trail), 1); }});
    }

    private clearSpeedTrail() {
        this.trailSprites.forEach(t => t.destroy());
        this.trailSprites = []; this.trailTimer = 0;
    }

    private createBlinkEffect(pid: string, fx: number, fy: number, tx: number, ty: number, config: any) {
        const p = this.players.get(pid);
        if (!p) return;
        const dist = Phaser.Math.Distance.Between(fx, fy, tx, ty), steps = 40;
        if (dist < steps) return;
        const n = Math.floor(dist / steps);
        for (let i = 0; i < n; i++) {
            const g = this.add.sprite(fx + ((tx - fx) / n) * i, fy + ((ty - fy) / n) * i, p.texture.key, p.frame.name).setOrigin(p.originX, p.originY).setScale(p.scaleX, p.scaleY).setFlip(p.flipX, p.flipY).setDepth(p.depth - 1).setTint(config.tint || 0x00ffff).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({ targets: g, alpha: 0, scaleX: p.scaleX * 0.6, scaleY: p.scaleY * 0.6, duration: config.trailFadeDuration || 200, delay: i * 5, onComplete: () => g.destroy() });
        }
        const r = this.add.circle(tx, ty, 10).setStrokeStyle(3, config.tint || 0x00ffff);
        this.tweens.add({ targets: r, radius: 40, alpha: 0, duration: 300, ease: "Quad.out", onComplete: () => r.destroy() });
    }

    private addKickGlow(player: Player) {
        player.setTint(0xffffff);
        const o = this.add.sprite(player.x, player.y, player.texture.key).setFrame(player.frame.name).setTint(0xffffff).setAlpha(0.8).setScale(player.scaleX * 1.2, player.scaleY * 1.2).setDepth(player.depth - 1).setFlipX(player.flipX);
        const c = this.add.circle(player.x, player.y, 30, 0xffffff, 0).setStrokeStyle(4, 0xffffff, 1).setDepth(player.depth - 1);
        this.tweens.add({ targets: o, alpha: 0, scale: player.scaleX * 1.3, duration: 200, onComplete: () => o.destroy() });
        this.tweens.add({ targets: c, alpha: 0, scale: 1.5, duration: 200, onComplete: () => c.destroy() });
        this.time.delayedCall(150, () => player.clearTint());
    }

    private renderBallFlames() {
        if (!this.ballFlameActive || !this.ballFlameGraphics) return;
        if (this.time.now - this.ballFlameStartTime > 3000) { this.ballFlameActive = false; this.ballFlameGraphics.clear(); this.clearBallTrail(); return; }
        this.ballFlameGraphics.clear();
        const t = this.time.now / 100;
        for (let i = 0; i < 3; i++) {
            const r = 30 + Math.sin(t + i * 0.5) * 5, a = 0.6 - i * 0.15;
            this.ballFlameGraphics.fillStyle(0xff6600, a).fillCircle(this.ball.x, this.ball.y, r + 10 - i * 3);
            this.ballFlameGraphics.fillStyle(0xffaa00, a + 0.2).fillCircle(this.ball.x, this.ball.y, r - i * 5);
        }
        const body = this.ball.body as Phaser.Physics.Arcade.Body;
        if (body?.velocity) {
            const ang = Math.atan2(body.velocity.y, body.velocity.x);
            for (let i = 0; i < 5; i++) {
                const d = 20 + i * 8;
                this.ballFlameGraphics.fillStyle(0xff3300, 0.8 - i * 0.15).fillCircle(this.ball.x - Math.cos(ang) * d, this.ball.y - Math.sin(ang) * d, 4 - i * 0.6);
            }
        }
    }

    private createBallTrail(time: number) {
        if (!this.ballTrailActive || time - this.ballTrailTimer < 1) return;
        this.ballTrailTimer = time;
        const ts = this.add.sprite(this.ball.x, this.ball.y, "ball").setScale(this.ball.scaleX, this.ball.scaleY).setDepth(99).setAlpha(0.3).setTintFill(0xff6600);
        this.ballTrailSprites.push(ts);
        this.tweens.add({ targets: ts, alpha: 0, duration: 300, onComplete: () => { ts.destroy(); this.ballTrailSprites.splice(this.ballTrailSprites.indexOf(ts), 1); }});
    }

    private clearBallTrail() {
        this.ballTrailSprites.forEach(s => s.destroy());
        this.ballTrailSprites = []; this.ballTrailActive = false;
    }

    private async checkSoccerStats() {
        try {
            if (this.soccerStats) return;
            const localPlayer = this.players.get(this.localPlayerId);
            if (localPlayer?.soccerStats) {
                this.soccerStats = localPlayer.soccerStats;
                return;
            }

            const stats = await getSoccerStats();
            if (!stats) {
                useUiStore.getState().openSoccerStatsModal();
            } else {
                // API stats are only a fallback before socket-synced player data arrives.
                this.soccerStats = stats;
                if (localPlayer && !localPlayer.soccerStats) {
                    localPlayer.soccerStats = stats;
                }
            }
        } catch (e) { console.error(e); }
    }

    private processPendingTeams() {
        if (this.pendingTeams.size === 0) return;
        for (const [pid, team] of this.pendingTeams.entries()) {
            const p = this.players.get(pid);
            if (p) { p.setTeam(team); this.pendingTeams.delete(pid); }
        }
    }

    private createBall() {
        this.ball = new Ball(this, PHYSICS_CONSTANTS.WORLD_WIDTH / 2, PHYSICS_CONSTANTS.WORLD_HEIGHT / 2, this.isMultiplayerMode);
    }

    private updateTeamGlows() {
        for (const p of this.players.values()) {
            if (p.teamGlow && p.team) {
                p.teamGlow.setPosition(p.visualSprite.x, p.visualSprite.y);
                p.teamGlow.setFrame(p.visualSprite.frame.name);
                p.teamGlow.setFlipX(p.visualSprite.flipX);
                p.teamGlow.setDepth(p.visualSprite.depth - 1);
                p.teamGlow.setScale(p.visualSprite.scaleX * 1.15, p.visualSprite.scaleY * 1.15);
            }
        }
    }

    protected createLayers(map: Phaser.Tilemaps.Tilemap): Map<string, Phaser.Tilemaps.TilemapLayer> {
        const layers = new Map<string, Phaser.Tilemaps.TilemapLayer>();
        const s = map.addTilesetImage("soccer", "soccer"), g = map.addTilesetImage("goal", "goal"), g2 = map.addTilesetImage("goal_2", "goal_2"), c = map.addTilesetImage("circle", "circle");
        const ts = [g!, g2!, c!, s!];
        this.floorLayer = map.createLayer("Floor", ts, 0, 0);
        this.floorMarkingsLayer = map.createLayer("FloorMarkings", ts, 0, 0);
        this.floorMarkings2Layer = map.createLayer("FloorMarkings2", ts, 0, 0);
        this.goalsLayer = map.createLayer("Goals", ts, 0, 0);
        this.circleLayer = map.createLayer("Circle", ts, 0, 0);
        this.goalsLayer?.setDepth(100);
        if (this.floorMarkingsLayer) layers.set("Floor_Markings_Layer", this.floorMarkingsLayer);
        return layers;
    }

    protected setupCollisions(layers: Map<string, Phaser.Tilemaps.TilemapLayer>): void {
        layers.get("Floor_Markings_Layer")?.setCollisionBetween(0, 100000, true);
        this.setupDoorCollisions();
    }

    protected createAnimatedObjects() {}
    protected createDoors() { this.doors = []; }
    protected setupAudio() {}
    protected setupCamera() {}

    protected setupLocalPlayer(p: Player): void {
        this.localPlayerId = p.id;
        usePlayersStore.getState().setLocalPlayerId(p.id);
        p.setPosition(this.spawnX, this.spawnY).setScale(2).setSize(40, 40).setOffset(0, 20);
        p.moveSpeed *= 0.5;
        p.setExternalSpeedMultiplier(this.localSpeedMultiplier);
    }

    protected setupRemotePlayer(p: Player): void {
        p.setScale(2).destroyNameTag();
        p.moveSpeed *= 1.5;
        p.setSize(40, 40).setOffset(0, 20);
    }

    private centerCamera() {
        const z = Math.min(this.scale.width / 3520, this.scale.height / 1600);
        const w = 3520 * z, h = 1600 * z;
        this.cameras.main.setViewport((this.scale.width - w) / 2, (this.scale.height - h) / 2, w, h).setZoom(z).setScroll(0, 0);
    }

    private setupLocalPhysics() {
        this.physics.add.collider(this.playersLayer, this.playersLayer, (p1: any, p2: any) => p1.team !== "spectator" && p2.team !== "spectator");
        this.physics.add.collider(this.playersLayer, this.ball, (b: any, p: any) => {
            if (p.team === "spectator") return;
            const vel = b.body.velocity;
            if (vel.length() > 150) vel.normalize().scale(150);
        }, (b: any, p: any) => p.team !== "spectator", this);
        if (this.floorMarkingsLayer) this.physics.add.collider(this.ball, this.floorMarkingsLayer);
    }
}
