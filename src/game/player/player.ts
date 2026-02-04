import Phaser, { Scene } from "phaser";
import {
    AttackAnimationKeys,
    IdleAnimationKeys,
    WalkAnimationKeys,
} from "../commmon/enums";
import { ReactionData } from "@/communication/reaction/_types";
import { AvailabilityStatus } from "./_enums";
import { CharacterCustomization } from "../character/_types";
import { CharacterCompositor } from "../character/CharacterCompositor";
import { CharacterAnimationManager } from "../character/CharacterAnimationManager";
import { EVENT_TYPES } from "../character/_enums";
import useUiStore from "@/common/store/uiStore";
import {
    integratePlayer,
    calculateSpeedMultiplier,
    calculateDragMultiplier,
    PHYSICS_CONSTANTS,
    PhysicsState,
    PlayerPhysicsInput,
} from "../soccer/shared-physics";

export enum FacingDirection {
    UP = "UP",
    DOWN = "DOWN",
    LEFT = "LEFT",
    RIGHT = "RIGHT",
}

// Input with sequence number for reconciliation
interface RecordedInput extends PlayerPhysicsInput {
    sequence: number;
}

// Snapshot for remote player interpolation
interface RemoteSnapshot {
    x: number;
    y: number;
    vx: number;
    vy: number;
    timestamp: number;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
    public id: string;
    public name: string;
    private sprite: string;
    public scene: Scene;
    private isChangingSprite: boolean = false;
    public lastFacingDirection: FacingDirection = FacingDirection.DOWN;

    // === Physics State (authoritative for local, interpolated for remote) ===
    public physicsState: PhysicsState = { x: 0, y: 0, vx: 0, vy: 0 };

    // === Visual State (smoothed, what we actually render) ===
    public visualSprite: Phaser.GameObjects.Sprite;
    private visualOffsetX: number = 0;
    private visualOffsetY: number = 0;

    // === Input Tracking (for client-side prediction) ===
    private inputHistory: RecordedInput[] = [];
    public currentSequence: number = 0;
    private currentInput: PlayerPhysicsInput = {
        up: false,
        down: false,
        left: false,
        right: false,
    };
    private previousInput: PlayerPhysicsInput | null = null;
    private movementStartSequence: number = 0;
    private externalSpeedMultiplier: number = 1.0;

    // === Remote Player Interpolation ===
    private snapshotBuffer: RemoteSnapshot[] = [];
    private readonly INTERPOLATION_DELAY_MS = 100; // Render 100ms behind

    // === Fixed Timestep Accumulator ===
    private physicsAccumulator: number = 0;

    public availabilityStatus: AvailabilityStatus = AvailabilityStatus.ONLINE;
    private statusCircle!: Phaser.GameObjects.Graphics;

    // The Outline Sprite
    public teamGlow: Phaser.GameObjects.Sprite | null = null;
    public team: "red" | "blue" | "spectator" | null = null;

    public isAttacking: boolean = false;
    public isRaisingHand: boolean = false;
    private raisHandGraphics: {
        bubble: Phaser.GameObjects.Graphics;
        emojiText: Phaser.GameObjects.Text;
    } | null = null;

    public playerProducerIds: string[] = [];
    private nameText!: Phaser.GameObjects.Text;
    voiceIndicator!: Phaser.GameObjects.Image;
    uiContainer!: Phaser.GameObjects.Container;

    public soccerStats: {
        speed: number;
        kickPower: number;
        dribbling: number;
    } | null = null;

    moveSpeed: number;
    private baseMoveSpeed: number = 600;
    private kartSpeedMultiplier: number = 1.5;
    isLocal: boolean = true;

    // Keyboard
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd?: {
        up: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };
    kartKey?: Phaser.Input.Keyboard.Key;

    public isKartMode: boolean = false;
    public isGhosted: boolean = false;
    public isSpectator: boolean = false;

    constructor(
        scene: Scene,
        name: string | undefined,
        id: string,
        x: number,
        y: number,
        availabilityStatus: AvailabilityStatus,
        sprite: string,
        customization: CharacterCustomization | null,
        ops: { isLocal: boolean },
    ) {
        super(scene, x, y, sprite);

        this.id = id;
        this.name = name as string;
        this.availabilityStatus = availabilityStatus;
        this.isLocal = ops.isLocal;
        this.sprite = sprite;
        this.scene = scene;

        // Initialize physics state
        this.physicsState = { x, y, vx: 0, vy: 0 };

        // Make physics sprite invisible - we render visualSprite instead
        this.setAlpha(0);

        // Create visible sprite
        this.visualSprite = scene.add.sprite(x, y, sprite);
        this.visualSprite.setDepth(10);

        // Add to physics
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setPushable(false);

        const w = Math.round(this.width * 1);
        const h = Math.round(this.height * 0.5);
        if (this.body) {
            this.body.setSize(w, h, true);
            this.body.setOffset(0, this.height - h);
            this.body.moves = false;
        }

        this.moveSpeed = this.baseMoveSpeed;

        if (this.isLocal) {
            this.cursors = scene.input.keyboard!.createCursorKeys();
            this.wasd = {
                up: scene.input.keyboard!.addKey("W"),
                left: scene.input.keyboard!.addKey("A"),
                down: scene.input.keyboard!.addKey("S"),
                right: scene.input.keyboard!.addKey("D"),
            };
            this.kartKey = scene.input.keyboard!.addKey("K");
        }

        this.initializeNameTag();
        this.setDepth(10);

        if (customization) {
            this.changeSprite(customization);
        } else {
            this.idleAnimation();
        }

        this.setupUiEventListener();
    }

    // ============================================================================
    // MAIN UPDATE - Called every frame
    // ============================================================================

    public update(time: number, delta: number) {
        if (this.isLocal) {
            this.updateLocalPlayer(delta);
        } else {
            this.updateRemotePlayer();
        }

        // Visual smoothing - decay offset over time
        this.decayVisualOffset();

        // Update visual sprite position
        this.visualSprite.x = this.physicsState.x + this.visualOffsetX;
        this.visualSprite.y = this.physicsState.y + this.visualOffsetY;

        // Sync Phaser physics body (for collisions and internal systems)
        super.setPosition(this.physicsState.x, this.physicsState.y);
        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocity(
                this.physicsState.vx,
                this.physicsState.vy,
            );
        }

        // Update UI
        if (this.uiContainer) {
            this.uiContainer.setPosition(
                this.visualSprite.x,
                this.visualSprite.y - 40,
            );
        }

        // Handle visual effects (Ghost, Team Glow)
        this.handleVisualEffects();

        // Animation logic
        this.handleAnimations();
    }

    private handleVisualEffects() {
        // --- GHOST EFFECT ---
        if (this.isGhosted || this.isSpectator) {
            this.visualSprite.setAlpha(this.isGhosted ? 0.4 : 0.5);
            if (this.isGhosted) {
                this.visualSprite.setTint(0x000000);
            } else {
                this.visualSprite.clearTint();
            }
        } else {
            this.visualSprite.setAlpha(1.0);
            this.visualSprite.clearTint();
        }

        // --- GLOW UPDATE LOOP ---
        if (this.teamGlow && this.team) {
            this.teamGlow.setPosition(this.visualSprite.x, this.visualSprite.y);
            this.teamGlow.setFrame(this.visualSprite.frame.name);
            this.teamGlow.setFlipX(this.visualSprite.flipX);
            this.teamGlow.setDepth(this.visualSprite.depth - 1);
            this.teamGlow.setScale(
                this.visualSprite.scaleX * 1.15,
                this.visualSprite.scaleY * 1.15,
            );
        }
    }

    private handleAnimations() {
        const isSoccerMap = this.scene.scene.key === "SoccerMap";

        // Don't override attack animations
        const attackAnimKey = AttackAnimationKeys[this.sprite];
        const isAnimateAttacking =
            this.visualSprite.anims.currentAnim?.key === attackAnimKey;

        if (isAnimateAttacking && this.visualSprite.anims.isPlaying) {
            return;
        }

        if (this.isAttacking && !this.visualSprite.anims.isPlaying) {
            this.isAttacking = false;
        }

        // Input-based animation (Local)
        if (this.isLocal) {
            const { up, down, left, right } = this.currentInput;
            const space = this.cursors?.space.isDown;

            if (left || right || up || down) {
                if (up) {
                    this.visualSprite.setFlipX(false);
                    this.lastFacingDirection = FacingDirection.UP;
                    this.playWalkAnimation(
                        `${this.sprite}_UP`,
                        this.isKartMode,
                    );
                } else if (down) {
                    this.visualSprite.setFlipX(false);
                    this.lastFacingDirection = FacingDirection.DOWN;
                    this.playWalkAnimation(
                        `${this.sprite}_DOWN`,
                        this.isKartMode,
                    );
                } else if (left) {
                    this.visualSprite.setFlipX(false);
                    this.lastFacingDirection = FacingDirection.LEFT;
                    this.playWalkAnimation(
                        `${this.sprite}_LEFT`,
                        this.isKartMode,
                    );
                } else if (right) {
                    this.visualSprite.setFlipX(false);
                    this.lastFacingDirection = FacingDirection.RIGHT;
                    this.playWalkAnimation(
                        `${this.sprite}_RIGHT`,
                        this.isKartMode,
                    );
                }
            } else if (space && !isSoccerMap) {
                // Space is only attack in non-soccer maps
                this.isAttacking = true;
                this.attackAnimation();
            } else {
                this.idleAnimation();
            }
        } else {
            // Remote player animation based on velocity
            const vx = this.physicsState.vx;
            const vy = this.physicsState.vy;
            const isMoving = Math.abs(vx) > 10 || Math.abs(vy) > 10;

            if (isMoving) {
                this.visualSprite.setFlipX(false);
                if (Math.abs(vx) > Math.abs(vy)) {
                    if (vx > 0) {
                        this.lastFacingDirection = FacingDirection.RIGHT;
                        this.playWalkAnimation(
                            `${this.sprite}_RIGHT`,
                            this.isKartMode,
                        );
                    } else {
                        this.lastFacingDirection = FacingDirection.LEFT;
                        this.playWalkAnimation(
                            `${this.sprite}_LEFT`,
                            this.isKartMode,
                        );
                    }
                } else {
                    if (vy > 0) {
                        this.lastFacingDirection = FacingDirection.DOWN;
                        this.playWalkAnimation(
                            `${this.sprite}_DOWN`,
                            this.isKartMode,
                        );
                    } else {
                        this.lastFacingDirection = FacingDirection.UP;
                        this.playWalkAnimation(
                            `${this.sprite}_UP`,
                            this.isKartMode,
                        );
                    }
                }
            } else {
                this.idleAnimation();
            }
        }
    }

    // ============================================================================
    // LOCAL PLAYER - Client-side prediction
    // ============================================================================

    private updateLocalPlayer(delta: number) {
        // 1. Sample input
        this.sampleInput();

        // 2. Handle Kart Mode Toggle
        if (
            this.isLocal &&
            this.kartKey &&
            Phaser.Input.Keyboard.JustDown(this.kartKey)
        ) {
            this.isKartMode = !this.isKartMode;
            this.moveSpeed = this.isKartMode
                ? this.baseMoveSpeed * this.kartSpeedMultiplier
                : this.baseMoveSpeed;

            if (this.isKartMode) {
                this.scene.sound.play("kart_start", { volume: 0.1 });
            }
            this.idleAnimation();
        }

        // 3. Fixed timestep physics
        this.physicsAccumulator += delta;

        // Cap accumulator
        const maxAccumulator = PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS * 5;
        if (this.physicsAccumulator > maxAccumulator) {
            this.physicsAccumulator = maxAccumulator;
        }

        while (this.physicsAccumulator >= PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS) {
            // Increment sequence
            this.currentSequence++;

            // Record input for this tick
            this.inputHistory.push({
                ...this.currentInput,
                sequence: this.currentSequence,
            });

            // Run physics
            this.runPhysicsTick();

            this.physicsAccumulator -= PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS;
        }

        // 4. Trim old input history (keep ~1 second)
        while (this.inputHistory.length > 60) {
            this.inputHistory.shift();
        }
    }

    private sampleInput() {
        const isCommandPaletteOpen = useUiStore.getState().isCommandPaletteOpen;
        if (isCommandPaletteOpen || !this.cursors || !this.wasd) {
            this.currentInput = {
                up: false,
                down: false,
                left: false,
                right: false,
            };
            return;
        }

        this.currentInput = {
            up: this.cursors.up.isDown || this.wasd.up.isDown,
            down: this.cursors.down.isDown || this.wasd.down.isDown,
            left: this.cursors.left.isDown || this.wasd.left.isDown,
            right: this.cursors.right.isDown || this.wasd.right.isDown,
        };

        // Detect when movement starts (was stationary, now moving)
        const wasMoving = this.previousInput && (
            this.previousInput.up || this.previousInput.down ||
            this.previousInput.left || this.previousInput.right
        );
        const isMoving = this.currentInput.up || this.currentInput.down ||
                         this.currentInput.left || this.currentInput.right;

        if (!wasMoving && isMoving) {
            this.movementStartSequence = this.currentSequence;
        }
        this.previousInput = { ...this.currentInput };
    }

    private runPhysicsTick() {
        const isSoccerMap = this.scene.scene.key === "SoccerMap";

        if (isSoccerMap) {
            // Calculate stat multipliers
            const speedStat = this.soccerStats?.speed ?? 0;
            const dribblingStat = this.soccerStats?.dribbling ?? 0;
            const speedMultiplier =
                calculateSpeedMultiplier(speedStat) * this.externalSpeedMultiplier;
            const dragMultiplier = calculateDragMultiplier(dribblingStat);

            // Run deterministic physics (MUST match server exactly)
            integratePlayer(
                this.physicsState,
                this.currentInput,
                PHYSICS_CONSTANTS.FIXED_TIMESTEP_SEC,
                dragMultiplier,
                speedMultiplier,
            );
        } else {
            // Simple non-soccer physics
            let vx = 0;
            let vy = 0;
            const speed = this.moveSpeed;

            if (this.currentInput.left) vx -= speed;
            if (this.currentInput.right) vx += speed;
            if (this.currentInput.up) vy -= speed;
            if (this.currentInput.down) vy += speed;

            if (vx !== 0 && vy !== 0) {
                vx *= Math.SQRT1_2;
                vy *= Math.SQRT1_2;
            }

            this.physicsState.vx = vx;
            this.physicsState.vy = vy;
            this.physicsState.x += vx * PHYSICS_CONSTANTS.FIXED_TIMESTEP_SEC;
            this.physicsState.y += vy * PHYSICS_CONSTANTS.FIXED_TIMESTEP_SEC;
        }
    }

    /**
     * Get current input state to send to server.
     * Called by the scene's network tick.
     */
    public getCurrentInput(): PlayerPhysicsInput & { sequence: number } {
        return {
            ...this.currentInput,
            sequence: this.currentSequence,
        };
    }

    // ============================================================================
    // SERVER RECONCILIATION
    // ============================================================================

    /**
     * Called when we receive authoritative state from server.
     * Compares our prediction to server truth and corrects if needed.
     */
    public reconcile(
        serverX: number,
        serverY: number,
        serverVX: number,
        serverVY: number,
        lastServerSequence: number,
    ) {
        if (!this.isLocal) return;

        // 1. Remove acknowledged inputs from history
        this.inputHistory = this.inputHistory.filter(
            (input) => input.sequence > lastServerSequence,
        );

        // 2. Re-simulate from server state with remaining unacknowledged inputs
        const predictedState: PhysicsState = {
            x: serverX,
            y: serverY,
            vx: serverVX,
            vy: serverVY,
        };

        const speedStat = this.soccerStats?.speed ?? 0;
        const dribblingStat = this.soccerStats?.dribbling ?? 0;
        const speedMultiplier =
            calculateSpeedMultiplier(speedStat) * this.externalSpeedMultiplier;
        const dragMultiplier = calculateDragMultiplier(dribblingStat);

        for (const input of this.inputHistory) {
            integratePlayer(
                predictedState,
                input,
                PHYSICS_CONSTANTS.FIXED_TIMESTEP_SEC,
                dragMultiplier,
                speedMultiplier,
            );
        }

        // 3. Calculate error between our current state and re-simulated state
        const errorX = this.physicsState.x - predictedState.x;
        const errorY = this.physicsState.y - predictedState.y;
        const errorDist = Math.sqrt(errorX * errorX + errorY * errorY);

        // 4. Decide how to correct
        if (errorDist < PHYSICS_CONSTANTS.POSITION_CORRECT_THRESHOLD) {
            // Close enough - no correction needed
            // Just sync velocity to prevent drift
            this.physicsState.vx = predictedState.vx;
            this.physicsState.vy = predictedState.vy;
            return;
        }

        if (errorDist > PHYSICS_CONSTANTS.POSITION_SNAP_THRESHOLD) {
            // Large error (teleport case) - hard snap
            this.physicsState.x = predictedState.x;
            this.physicsState.y = predictedState.y;
            this.physicsState.vx = predictedState.vx;
            this.physicsState.vy = predictedState.vy;

            // Also snap visual to prevent lerping across map
            this.visualOffsetX = 0;
            this.visualOffsetY = 0;

            console.log(
                `[Player] Hard snap: error was ${errorDist.toFixed(1)}px`,
            );
            return;
        }

        // During movement startup phase, skip reconciliation entirely
        // Trust client prediction until server has caught up with our inputs
        const STARTUP_GRACE_TICKS = 10;
        const inStartupPhase = this.movementStartSequence > 0 &&
            (this.currentSequence - this.movementStartSequence) < STARTUP_GRACE_TICKS &&
            lastServerSequence < this.movementStartSequence + STARTUP_GRACE_TICKS;

        if (inStartupPhase) {
            // Only sync velocity, don't touch position during startup
            this.physicsState.vx = predictedState.vx;
            this.physicsState.vy = predictedState.vy;
            return;
        }

        // Medium error - snap physics, smooth visuals (original behavior)
        // Store visual position before snap
        const oldVisualX = this.visualSprite.x;
        const oldVisualY = this.visualSprite.y;

        // Snap physics to re-simulated state
        this.physicsState.x = predictedState.x;
        this.physicsState.y = predictedState.y;
        this.physicsState.vx = predictedState.vx;
        this.physicsState.vy = predictedState.vy;

        // Calculate visual offset (where sprite WAS relative to where it SHOULD BE)
        this.visualOffsetX = oldVisualX - this.physicsState.x;
        this.visualOffsetY = oldVisualY - this.physicsState.y;
    }

    // ============================================================================
    // REMOTE PLAYER - Snapshot Interpolation
    // ============================================================================

    private updateRemotePlayer() {
        if (this.snapshotBuffer.length < 2) {
            // Not enough data to interpolate - just use latest
            if (this.snapshotBuffer.length === 1) {
                const snap = this.snapshotBuffer[0];
                this.physicsState.x = snap.x;
                this.physicsState.y = snap.y;
                this.physicsState.vx = snap.vx;
                this.physicsState.vy = snap.vy;
            }
            return;
        }

        // Render time is INTERPOLATION_DELAY_MS behind real time
        const renderTime = Date.now() - this.INTERPOLATION_DELAY_MS;

        // Find the two snapshots to interpolate between
        let snap0 = this.snapshotBuffer[0];
        let snap1 = this.snapshotBuffer[1];

        // Drop old snapshots until we find the right pair
        while (
            this.snapshotBuffer.length > 2 &&
            this.snapshotBuffer[1].timestamp < renderTime
        ) {
            this.snapshotBuffer.shift();
            snap0 = this.snapshotBuffer[0];
            snap1 = this.snapshotBuffer[1];
        }

        // Interpolate
        if (renderTime <= snap0.timestamp) {
            // We're behind even the oldest snapshot - use it directly
            this.physicsState.x = snap0.x;
            this.physicsState.y = snap0.y;
            this.physicsState.vx = snap0.vx;
            this.physicsState.vy = snap0.vy;
        } else if (renderTime >= snap1.timestamp) {
            // We're ahead of latest snapshot - extrapolate slightly
            const dt = (renderTime - snap1.timestamp) / 1000;
            const maxExtrapolate = 0.1; // Max 100ms extrapolation
            const clampedDt = Math.min(dt, maxExtrapolate);

            this.physicsState.x = snap1.x + snap1.vx * clampedDt;
            this.physicsState.y = snap1.y + snap1.vy * clampedDt;
            this.physicsState.vx = snap1.vx;
            this.physicsState.vy = snap1.vy;
        } else {
            // Normal interpolation
            const total = snap1.timestamp - snap0.timestamp;
            const t = (renderTime - snap0.timestamp) / total;

            this.physicsState.x = Phaser.Math.Linear(snap0.x, snap1.x, t);
            this.physicsState.y = Phaser.Math.Linear(snap0.y, snap1.y, t);
            this.physicsState.vx = Phaser.Math.Linear(snap0.vx, snap1.vx, t);
            this.physicsState.vy = Phaser.Math.Linear(snap0.vy, snap1.vy, t);
        }
    }

    /**
     * Push a new snapshot from server (for remote players)
     */
    public pushSnapshot(snapshot: RemoteSnapshot) {
        this.snapshotBuffer.push(snapshot);
        while (this.snapshotBuffer.length > 20) {
            this.snapshotBuffer.shift();
        }
    }

    // ============================================================================
    // VISUAL SMOOTHING
    // ============================================================================

    private decayVisualOffset() {
        const errorMag = Math.sqrt(
            this.visualOffsetX * this.visualOffsetX +
                this.visualOffsetY * this.visualOffsetY,
        );

        // Adaptive decay: faster for small errors, slower for large
        let decay: number;
        if (errorMag > 50) {
            decay = 0.92; // Slow decay for big corrections
        } else if (errorMag > 20) {
            decay = 0.88;
        } else if (errorMag > 5) {
            decay = 0.82;
        } else {
            decay = 0.7; // Fast decay when close
        }

        this.visualOffsetX *= decay;
        this.visualOffsetY *= decay;

        // Snap to zero when very small
        if (Math.abs(this.visualOffsetX) < 0.5) this.visualOffsetX = 0;
        if (Math.abs(this.visualOffsetY) < 0.5) this.visualOffsetY = 0;
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    public setScale(x: number, y?: number): this {
        super.setScale(x, y);
        if (this.visualSprite) {
            this.visualSprite.setScale(x, y);
        }
        return this;
    }

    public setFlipX(value: boolean): this {
        if (this.visualSprite) {
            this.visualSprite.setFlipX(value);
        }
        return this;
    }

    public setAlpha(value?: number): this {
        // Keep the physics body alpha 0
        super.setAlpha(0);
        if (this.visualSprite && value !== undefined) {
            this.visualSprite.setAlpha(value);
        }
        return this;
    }

    public setTint(color: number): this {
        if (this.visualSprite) {
            this.visualSprite.setTint(color);
        }
        return this;
    }

    public clearTint(): this {
        if (this.visualSprite) {
            this.visualSprite.clearTint();
        }
        return this;
    }

    public setDepth(value: number): this {
        super.setDepth(value);
        if (this.visualSprite) {
            this.visualSprite.setDepth(value);
        }
        return this;
    }

    public changePlayerAvailabilityStatus(status: AvailabilityStatus) {
        this.availabilityStatus = status;
        if (this.statusCircle) {
            this.updateStatusCircle();
        }
    }

    public showReactionTag(data: ReactionData) {
        if (!data.reaction) return;
        if (data.playerId && data.playerId !== this.id) return;

        if (data.reaction === "stop-raise-hand") {
            if (this.raisHandGraphics) {
                this.destroyReactionTagInstantly(
                    this.raisHandGraphics.bubble,
                    this.raisHandGraphics.emojiText,
                );
            }
            return;
        }

        const emojiText = this.scene.add
            .text(0, -70, data.reaction, {
                font: "25px Arial",
                color: "#000000",
            })
            .setOrigin(0.5, 0.5);

        const textBounds = emojiText.getBounds();
        const padding = 12;
        const bubbleWidth = textBounds.width + padding * 2;
        const bubbleHeight = textBounds.height + padding * 2;
        const tailHeight = 10;

        const bubble = this.scene.add.graphics();
        this.createBubble(
            bubble,
            bubbleWidth,
            bubbleHeight,
            tailHeight,
            emojiText.x,
            emojiText.y,
        );

        if (this.uiContainer) {
            this.uiContainer.add([bubble, emojiText]);
        }

        bubble.setScale(0);
        emojiText.setScale(0);

        this.scene.tweens.add({
            targets: [bubble, emojiText],
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: "Back.easeOut",
        });

        if (data.reaction === "🤚") {
            this.isRaisingHand = true;
            this.raisHandGraphics = { bubble, emojiText };
        } else {
            this.destroyReactionTag(bubble, emojiText);
        }
    }

    private destroyReactionTag(
        bubble: Phaser.GameObjects.Graphics,
        emojiText: Phaser.GameObjects.Text,
    ) {
        this.scene.time.delayedCall(3000, () => {
            this.scene?.tweens?.add({
                targets: [bubble, emojiText],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    bubble.destroy();
                    emojiText.destroy();
                },
            });
        });
    }

    public destroyReactionTagInstantly(
        bubble: Phaser.GameObjects.Graphics,
        emojiText: Phaser.GameObjects.Text,
    ) {
        this.scene?.tweens?.add({
            targets: [bubble, emojiText],
            alpha: 0,
            duration: 500,
            onComplete: () => {
                bubble.destroy();
                emojiText.destroy();
            },
        });
    }

    private createBubble(
        graphics: Phaser.GameObjects.Graphics,
        width: number,
        height: number,
        tailHeight: number,
        x: number,
        y: number,
    ) {
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        const cornerRadius = 8;
        const bubbleX = x - width / 2;
        const bubbleY = y - height / 2;

        graphics.fillRoundedRect(bubbleX, bubbleY, width, height, cornerRadius);
        graphics.strokeRoundedRect(
            bubbleX,
            bubbleY,
            width,
            height,
            cornerRadius,
        );

        const tailX = x;
        const tailY = bubbleY + height;

        graphics.fillTriangle(
            tailX - 8,
            tailY,
            tailX + 8,
            tailY,
            tailX,
            tailY + tailHeight,
        );
        graphics.strokeTriangle(
            tailX - 8,
            tailY,
            tailX + 8,
            tailY,
            tailX,
            tailY + tailHeight,
        );
    }

    public destroyNameTag() {
        if (this.uiContainer) {
            this.uiContainer.destroy();
        }
    }

    public initializeNameTag() {
        let color = "#ffffff";
        if (this.uiContainer) {
            this.uiContainer.destroy();
        }

        if (this.isLocal) {
            color = "#00f55a";
        }

        this.nameText = this.scene.add
            .text(0, 0, this.name, {
                font: "16px Arial",
                color,
                stroke: "#000000",
                strokeThickness: 3,
            })
            .setOrigin(0.5, 0.5);

        this.statusCircle = this.scene.add.graphics();
        this.updateStatusCircle();

        const nameWidth = this.nameText.width;
        const nameHeight = this.nameText.height;
        const circleRadius = 4;
        const padding = 8;
        const gap = 6;
        const totalWidth = circleRadius * 2 + gap + nameWidth;
        const bgWidth = totalWidth + padding * 2;
        const bgHeight = nameHeight + padding * 2;

        const background = this.scene.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRoundedRect(
            -bgWidth / 2,
            -bgHeight / 2,
            bgWidth,
            bgHeight,
            8,
        );

        const circleX = -totalWidth / 2 + circleRadius;
        const nameX = circleX + circleRadius + gap + nameWidth / 2;

        this.statusCircle.setPosition(circleX, 0);
        this.nameText.setPosition(nameX, 0);

        this.uiContainer = this.scene.add.container(this.x, this.y - 50, [
            background,
            this.statusCircle,
            this.nameText,
        ]);

        this.uiContainer.setDepth(200);
    }

    private updateStatusCircle() {
        const displayRadius = 4;
        const drawRadius = 44;
        let statusColor: number;
        switch (this.availabilityStatus) {
            case AvailabilityStatus.ONLINE:
                statusColor = 0x00ff00;
                break;
            case AvailabilityStatus.FOCUS:
                statusColor = 0xff9500;
                break;
            default:
                statusColor = 0x00ff00;
        }

        this.statusCircle.clear();
        this.statusCircle.fillStyle(statusColor, 1);
        this.statusCircle.fillCircle(0, 0, drawRadius);
        this.statusCircle.setScale(displayRadius / drawRadius);
    }

    public setTeam(team: "red" | "blue" | "spectator" | null) {
        this.team = team;

        if (team === "spectator") {
            this.setAlpha(0.5);
        } else {
            this.setAlpha(1.0);
        }

        this.updateTeamGlow();
    }

    private updateTeamGlow() {
        if (this.teamGlow) {
            this.teamGlow.destroy();
            this.teamGlow = null;
        }

        if (this.team === "red" || this.team === "blue") {
            this.teamGlow = this.scene.add.sprite(
                this.x,
                this.y,
                this.texture.key,
                this.frame.name,
            );

            const glowColor = this.team === "red" ? 0xff0000 : 0x0066ff;
            this.teamGlow.setTintFill(glowColor);
            this.teamGlow.setAlpha(0.6);
            this.teamGlow.setDepth(this.depth - 1);
        }
    }

    public showVoiceIndicator() {
        if (this.voiceIndicator) this.voiceIndicator.setVisible(true);
    }

    public hideVoiceIndicator() {
        if (this.voiceIndicator) this.voiceIndicator.setVisible(false);
    }

    public idleAnimation(direction?: FacingDirection) {
        const dir = direction || this.lastFacingDirection;

        if (this.isKartMode) {
            const kartDirection = dir.toLowerCase();
            const kartAnimKey = `${this.sprite}-kart-${kartDirection}`;
            if (this.scene.anims.exists(kartAnimKey)) {
                this.visualSprite.anims.play(kartAnimKey, true);
                return;
            }
        }

        const directionKey = `${this.sprite}_${dir}`;
        const animKey = IdleAnimationKeys[directionKey];

        if (animKey && this.scene.anims.exists(animKey)) {
            this.visualSprite.anims.play(animKey, true);
        } else {
            const fallbackKey = IdleAnimationKeys[this.sprite];
            if (fallbackKey && this.scene.anims.exists(fallbackKey)) {
                this.visualSprite.anims.play(fallbackKey, true);
            }
        }
    }

    private playWalkAnimation(
        directionKey?: string,
        useKartMode: boolean = false,
    ) {
        if (useKartMode) {
            let direction = "down";
            if (directionKey) {
                const parts = directionKey.split("_");
                if (parts.length > 1) {
                    direction = parts[parts.length - 1].toLowerCase();
                }
            }
            const kartAnimKey = `${this.sprite}-kart-${direction}`;
            if (this.scene.anims.exists(kartAnimKey)) {
                this.visualSprite.anims.play(kartAnimKey, true);
                return;
            }
        }

        if (!directionKey) {
            const animKey = WalkAnimationKeys[this.sprite];
            if (animKey && this.scene.anims.exists(animKey)) {
                this.visualSprite.anims.play(animKey, true);
            }
            return;
        }

        const animKey = WalkAnimationKeys[directionKey];
        if (animKey && this.scene.anims.exists(animKey)) {
            this.visualSprite.anims.play(animKey, true);
        } else {
            const fallbackKey = WalkAnimationKeys[this.sprite];
            if (fallbackKey && this.scene.anims.exists(fallbackKey)) {
                this.visualSprite.anims.play(fallbackKey, true);
            }
        }
    }

    private attackAnimation() {
        const animKey = AttackAnimationKeys[this.sprite];
        if (animKey && this.scene.anims.exists(animKey)) {
            this.visualSprite.anims.play(animKey, true);
        }
    }

    public async changeSprite(
        newCustomization: CharacterCustomization,
    ): Promise<void> {
        if (this.isChangingSprite) return;
        this.isChangingSprite = true;

        try {
            const compositor = new CharacterCompositor(this.scene);
            const animManager = new CharacterAnimationManager(this.scene);
            const characterKey = `custom-${this.id}`;
            const spritesheetKey = `${characterKey}-spritesheet`;

            await compositor.createAnimatedSpritesheet(
                newCustomization,
                spritesheetKey,
                this.isLocal,
            );

            if (!this.scene.textures.exists(spritesheetKey)) {
                console.error(`Texture ${spritesheetKey} was not created`);
                return;
            }

            animManager.createCharacterAnimations(characterKey, spritesheetKey);
            animManager.updateAnimationKeys(characterKey);

            this.sprite = characterKey;
            this.setTexture(spritesheetKey);
            this.visualSprite.setTexture(spritesheetKey);
            this.visualSprite.setFrame(0);
            this.idleAnimation();

            if (this.teamGlow) {
                this.teamGlow.setTexture(spritesheetKey);
            }
        } catch (error) {
            console.error("Error changing sprite:", error);
        } finally {
            this.isChangingSprite = false;
        }
    }

    private setupUiEventListener() {
        window.addEventListener(
            EVENT_TYPES.UPDATE_CHARACTER,
            (event: Event) => {
                const customEvent =
                    event as CustomEvent<CharacterCustomization>;
                if (this.isLocal && customEvent.detail) {
                    this.changeSprite(customEvent.detail);
                }
            },
        );

        window.addEventListener(EVENT_TYPES.UPDATE_NAME, (event: Event) => {
            const customEvent = event as CustomEvent<{ newName: string }>;
            if (this.isLocal && customEvent.detail) {
                this.name = customEvent.detail.newName;
                this.initializeNameTag();
            }
        });
    }

    // ============================================================================
    // POSITION SETTERS (for teleports, respawns, etc.)
    // ============================================================================

    public setPosition(x?: number, y?: number, z?: number, w?: number): this {
        super.setPosition(x, y, z, w);

        // Guard: physicsState doesn't exist yet during parent constructor
        if (!this.physicsState) {
            return this;
        }

        if (x !== undefined && y !== undefined) {
            this.physicsState.x = x;
            this.physicsState.y = y;
            this.physicsState.vx = 0;
            this.physicsState.vy = 0;

            // Clear visual offset on teleport
            this.visualOffsetX = 0;
            this.visualOffsetY = 0;

            // Clear input history - predictions are now invalid
            this.inputHistory = [];
        }

        return this;
    }
    public setVelocity(vx: number, vy: number): this {
        this.physicsState.vx = vx;
        this.physicsState.vy = vy;

        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
        }

        return this;
    }

    public setExternalSpeedMultiplier(multiplier: number) {
        this.externalSpeedMultiplier = multiplier;
    }

    public destroy() {
        if (this.teamGlow) this.teamGlow.destroy();
        if (this.visualSprite) this.visualSprite.destroy();
        if (this.uiContainer) this.uiContainer.destroy();
        super.destroy();
    }
}
