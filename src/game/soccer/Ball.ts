/**
 * Ball.ts - Client-side ball with proper prediction and reconciliation
 *
 * Architecture:
 * 1. Client predicts kicks immediately for responsiveness
 * 2. Client runs local physics simulation
 * 3. Server sends authoritative state at 20Hz
 * 4. Client reconciles: if no pending kicks, snap to server; if pending, wait
 */

import { Scene } from "phaser";
import {
    integrateBall,
    PHYSICS_CONSTANTS,
    PhysicsState,
} from "./shared-physics";

// What the server sends us
interface ServerBallState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    sequence: number; // Authoritative kick counter
    tick: number; // Server's physics tick
    timestamp: number; // Server wall clock (for latency estimation)
    lastTouchId: string | null;
}

// A kick we've predicted but server hasn't acknowledged
interface PendingKick {
    localId: number; // Client-generated ID for tracking
    vx: number;
    vy: number;
    predictedAt: number; // Timestamp when we predicted this
    sequenceBefore: number; // Server sequence when we sent this kick
}

export class Ball extends Phaser.GameObjects.Sprite {
    // === Physics State ===
    private simState: PhysicsState = { x: 0, y: 0, vx: 0, vy: 0 };
    private currentTick: number = 0;
    private accumulator: number = 0;

    // === Rendering State (separate from physics for smoothing) ===
    private renderX: number = 0;
    private renderY: number = 0;

    // === Server Reconciliation ===
    private lastServerSequence: number = 0;
    private lastServerTick: number = 0;
    private lastServerTimestamp: number = 0;
    private lastAuthoritativeState: ServerBallState | null = null;

    // === Pending Kicks (client predictions awaiting server confirmation) ===
    private pendingKicks: PendingKick[] = [];
    private nextLocalKickId: number = 1;

    // === Configuration ===
    private isMultiplayer: boolean;

    // Thresholds
    private readonly SNAP_THRESHOLD = PHYSICS_CONSTANTS.POSITION_SNAP_THRESHOLD;
    private readonly CORRECT_THRESHOLD =
        PHYSICS_CONSTANTS.POSITION_CORRECT_THRESHOLD;
    private readonly PENDING_KICK_TIMEOUT = 700; // ms - avoids long-lived divergent kick prediction
    private readonly KICK_REJECT_FALLBACK_MS = 320;
    private readonly KICK_REJECT_HARD_SNAP_DIST = 90;
    private readonly DEBUG_LOGS = false;

    constructor(
        scene: Scene,
        x: number,
        y: number,
        isMultiplayer: boolean = false,
    ) {
        // Create ball texture procedurally
        const graphics = scene.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(30, 30, 27);
        graphics.lineStyle(3, 0x000000, 1);
        graphics.strokeCircle(30, 30, 27);
        graphics.generateTexture("ball", 60, 60);
        graphics.destroy();

        super(scene, x, y, "ball");

        this.isMultiplayer = isMultiplayer;

        // Initialize physics state
        this.simState = { x, y, vx: 0, vy: 0 };
        this.renderX = x;
        this.renderY = y;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        if (this.body) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.setCircle(30);
            // CRITICAL: Disable Phaser's automatic body movement
            // We handle physics ourselves in fixedUpdate() using shared-physics
            body.moves = false;
        }
    }

    // === Public Accessors ===

    /** Get current simulation state (for trajectory preview, etc.) */
    public get targetPos() {
        return {
            x: this.simState.x,
            y: this.simState.y,
            vx: this.simState.vx,
            vy: this.simState.vy,
            t: this.currentTick,
        };
    }

    /** Check if ball is currently moving */
    public get isMoving(): boolean {
        const speed = Math.sqrt(this.simState.vx ** 2 + this.simState.vy ** 2);
        return speed > PHYSICS_CONSTANTS.VELOCITY_STOP_THRESHOLD;
    }

    /** Check if we have unacknowledged kicks */
    public get hasPendingKicks(): boolean {
        return this.pendingKicks.length > 0;
    }

    // Phaser compatibility shim
    public setBounce(): void {}

    // === Main Update Loop ===

    public update(_time: number, delta: number): void {
        // 1. Accumulate frame time
        this.accumulator += delta;

        // Safety cap - prevents spiral of death if tab is backgrounded
        const maxAccumulator = PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS * 10;
        if (this.accumulator > maxAccumulator) {
            this.accumulator = maxAccumulator;
        }

        // 2. Run fixed timestep physics
        while (this.accumulator >= PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS) {
            this.fixedUpdate();
            this.accumulator -= PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS;
        }

        // 3. Clean up stale pending kicks
        this.cleanupStalePendingKicks();
        this.resolveRejectedPendingKick();

        // 4. Update visual representation (smooth interpolation)
        this.updateVisuals();
    }

    /** Fixed timestep physics update */
    private fixedUpdate(): void {
        this.currentTick++;

        // Run deterministic physics simulation
        integrateBall(this.simState, PHYSICS_CONSTANTS.FIXED_TIMESTEP_SEC);
    }

    /** Remove pending kicks that have timed out without server acknowledgment */
    private cleanupStalePendingKicks(): void {
        const now = Date.now();
        const beforeCount = this.pendingKicks.length;

        this.pendingKicks = this.pendingKicks.filter((kick) => {
            const age = now - kick.predictedAt;
            return age < this.PENDING_KICK_TIMEOUT;
        });

        if (this.pendingKicks.length < beforeCount) {
            this.debugWarn(
                `[Ball] Dropped ${beforeCount - this.pendingKicks.length} stale pending kick(s)`,
            );
        }
    }

    /**
     * If a predicted kick is still pending and the server never advanced the
     * kick sequence, treat it as rejected and converge quickly.
     */
    private resolveRejectedPendingKick(): void {
        if (!this.lastAuthoritativeState) return;
        if (this.pendingKicks.length === 0) return;

        const oldestPending = this.pendingKicks[0];
        if (!oldestPending) return;

        const ageMs = Date.now() - oldestPending.predictedAt;
        const serverDidNotAdvance =
            this.lastServerSequence <= oldestPending.sequenceBefore;
        if (ageMs < this.KICK_REJECT_FALLBACK_MS || !serverDidNotAdvance) {
            return;
        }

        this.pendingKicks.shift();
        const dx = this.simState.x - this.lastAuthoritativeState.x;
        const dy = this.simState.y - this.lastAuthoritativeState.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.KICK_REJECT_HARD_SNAP_DIST) {
            this.hardSnapToServer(this.lastAuthoritativeState);
        } else {
            this.correctToServer(this.lastAuthoritativeState);
        }

        this.debugWarn(
            `[Ball] Kick #${oldestPending.localId} rolled back after ${ageMs.toFixed(0)}ms (no server ack)`,
        );
    }

    // === Server Reconciliation ===

    /**
     * Handle authoritative state update from server.
     * This is the CORE reconciliation logic.
     */
    public onServerUpdate(packet: ServerBallState): void {
        if (!packet || packet.tick === undefined) {
            console.warn("[Ball] Received invalid server packet");
            return;
        }

        // Track server state
        this.lastServerSequence = packet.sequence;
        this.lastServerTick = packet.tick;
        this.lastServerTimestamp = packet.timestamp;
        this.lastAuthoritativeState = { ...packet };

        // Calculate prediction error
        const errorX = this.simState.x - packet.x;
        const errorY = this.simState.y - packet.y;
        const errorVx = this.simState.vx - packet.vx;
        const errorVy = this.simState.vy - packet.vy;
        const positionError = Math.sqrt(errorX * errorX + errorY * errorY);
        const velocityError = Math.sqrt(errorVx * errorVx + errorVy * errorVy);

        // DEBUG: Log every server update when ball is moving
        const speed = Math.sqrt(packet.vx * packet.vx + packet.vy * packet.vy);
        if (speed > 10 || positionError > 5) {
            this.debugLog(`[Ball] Server update:`, {
                serverPos: { x: packet.x.toFixed(0), y: packet.y.toFixed(0) },
                serverVel: { vx: packet.vx.toFixed(0), vy: packet.vy.toFixed(0) },
                clientPos: { x: this.simState.x.toFixed(0), y: this.simState.y.toFixed(0) },
                clientVel: { vx: this.simState.vx.toFixed(0), vy: this.simState.vy.toFixed(0) },
                posErr: positionError.toFixed(1),
                velErr: velocityError.toFixed(1),
                pending: this.pendingKicks.length,
                seq: packet.sequence,
            });
        }

        // === Reconciliation Strategy ===

        if (this.pendingKicks.length > 0) {
            // We have unacknowledged kicks - be careful about corrections
            // The server hasn't seen our kick yet, so of course positions differ

            if (positionError > this.SNAP_THRESHOLD) {
                // Massive error even with pending kicks - something is very wrong
                // This could be a goal reset, teleport, or severe desync
                this.debugWarn(
                    `[Ball] Large error (${positionError.toFixed(0)}px) with pending kicks - hard snap`,
                );
                this.hardSnapToServer(packet);
            } else if (positionError > 50) {
                // Moderate error - gentle blend toward server
                // This prevents visual drift while waiting for kick acknowledgment
                this.softBlendToServer(packet, 0.1);
            }
            // Small error with pending kicks - trust our prediction
        } else {
            // No pending kicks - we should match server closely

            if (positionError > this.SNAP_THRESHOLD) {
                // Large error - teleport (goal reset, etc.)
                this.hardSnapToServer(packet);
            } else if (
                positionError > this.CORRECT_THRESHOLD ||
                velocityError > PHYSICS_CONSTANTS.VELOCITY_CORRECT_THRESHOLD
            ) {
                // Medium error - snap physics, smooth visuals
                this.correctToServer(packet);
            }
            // Small error - trust our prediction (deterministic physics should match)
        }

        // Sync tick to prevent long-term drift
        // Use a blend to avoid jarring tick jumps
        const tickDiff = packet.tick - this.currentTick;
        if (Math.abs(tickDiff) > 60) {
            // More than 1 second off - hard sync
            this.currentTick = packet.tick;
        } else if (Math.abs(tickDiff) > 5) {
            // Slight drift - nudge toward server tick
            this.currentTick += Math.sign(tickDiff);
        }
    }

    /** Hard snap both physics and visuals to server state */
    private hardSnapToServer(packet: ServerBallState): void {
        this.debugLog(`[Ball] HARD SNAP to server: (${packet.x.toFixed(0)}, ${packet.y.toFixed(0)})`);
        this.simState.x = packet.x;
        this.simState.y = packet.y;
        this.simState.vx = packet.vx;
        this.simState.vy = packet.vy;

        // Also snap render position to avoid lerping across the map
        this.renderX = packet.x;
        this.renderY = packet.y;

        // Clear pending kicks - they're clearly invalid
        this.pendingKicks = [];

        this.currentTick = packet.tick;
    }

    /** Snap physics to server but let visuals smooth */
    private correctToServer(packet: ServerBallState): void {
        this.debugLog(`[Ball] CORRECT to server: (${packet.x.toFixed(0)}, ${packet.y.toFixed(0)}) from (${this.simState.x.toFixed(0)}, ${this.simState.y.toFixed(0)})`);
        this.simState.x = packet.x;
        this.simState.y = packet.y;
        this.simState.vx = packet.vx;
        this.simState.vy = packet.vy;
        // renderX/renderY will smoothly interpolate in updateVisuals()
    }

    /** Gently blend physics toward server (for when we have pending kicks) */
    private softBlendToServer(packet: ServerBallState, factor: number): void {
        this.debugLog(`[Ball] SOFT BLEND (${factor}): toward (${packet.x.toFixed(0)}, ${packet.y.toFixed(0)})`);
        this.simState.x += (packet.x - this.simState.x) * factor;
        this.simState.y += (packet.y - this.simState.y) * factor;
        // Don't blend velocity - keep our predicted velocity
    }

    // === Client-Side Prediction ===

    /**
     * Predict a kick locally for immediate responsiveness.
     * Called when local player kicks the ball.
     *
     * @returns Local kick ID (for debugging/tracking)
     */
    public predictKick(vx: number, vy: number): number {
        const localId = this.nextLocalKickId++;

        // Record pending kick
        this.pendingKicks.push({
            localId,
            vx,
            vy,
            predictedAt: Date.now(),
            sequenceBefore: this.lastServerSequence,
        });

        // Apply immediately to simulation
        this.simState.vx = vx;
        this.simState.vy = vy;

        // Limit pending kicks (shouldn't have many in flight)
        while (this.pendingKicks.length > 3) {
            const dropped = this.pendingKicks.shift();
            this.debugWarn(
                `[Ball] Too many pending kicks, dropped #${dropped?.localId}`,
            );
        }

        return localId;
    }

    /**
     * Convenience method matching Phaser's API.
     * Internally calls predictKick.
     */
    public setVelocity(vx: number, vy: number): void {
        this.predictKick(vx, vy);
    }

    /**
     * Teleport ball to position (used for resets, goals, etc.)
     */
    public setPosition(x?: number, y?: number, z?: number, w?: number): this {
        super.setPosition(x, y, z, w);

        // Guard: simState doesn't exist yet during parent constructor
        if (!this.simState) {
            return this;
        }

        if (x !== undefined && y !== undefined) {
            // Hard set physics state
            this.simState.x = x;
            this.simState.y = y;
            this.simState.vx = 0;
            this.simState.vy = 0;

            // Hard set render position
            this.renderX = x;
            this.renderY = y;

            // Clear any pending kicks - they're now invalid
            this.pendingKicks = [];
        }

        return this;
    }
    // === Visual Smoothing ===

    /** Interpolate render position toward simulation position */
    private updateVisuals(): void {
        const dist = Phaser.Math.Distance.Between(
            this.renderX,
            this.renderY,
            this.simState.x,
            this.simState.y,
        );

        // DEBUG: Log when there's significant render/sim divergence
        if (dist > 20) {
            const body = this.body as Phaser.Physics.Arcade.Body | null;
            this.debugLog(`[Ball] Position check:`, {
                spriteXY: { x: this.x.toFixed(0), y: this.y.toFixed(0) },
                renderXY: { x: this.renderX.toFixed(0), y: this.renderY.toFixed(0) },
                simXY: { x: this.simState.x.toFixed(0), y: this.simState.y.toFixed(0) },
                bodyXY: body ? { x: (body.x + body.halfWidth).toFixed(0), y: (body.y + body.halfHeight).toFixed(0) } : 'no body',
                dist: dist.toFixed(0),
            });
        }

        if (dist > this.SNAP_THRESHOLD) {
            // Teleport - don't interpolate across large distances
            this.renderX = this.simState.x;
            this.renderY = this.simState.y;
        } else if (dist > 0.5) {
            // Smooth interpolation
            // Use frame-rate independent lerp
            const smoothFactor = 0.2; // Adjust for feel (higher = snappier)
            this.renderX = Phaser.Math.Linear(
                this.renderX,
                this.simState.x,
                smoothFactor,
            );
            this.renderY = Phaser.Math.Linear(
                this.renderY,
                this.simState.y,
                smoothFactor,
            );
        }

        // Update sprite position
        super.setPosition(this.renderX, this.renderY);

        // Sync physics body (for collision detection)
        if (this.body) {
            const body = this.body as Phaser.Physics.Arcade.Body;
            body.x = this.renderX - body.halfWidth;
            body.y = this.renderY - body.halfHeight;
            body.updateCenter();
        }
    }

    // === Debug Helpers ===

    public getDebugInfo(): object {
        return {
            sim: { ...this.simState },
            render: { x: this.renderX, y: this.renderY },
            tick: this.currentTick,
            serverTick: this.lastServerTick,
            serverSequence: this.lastServerSequence,
            pendingKicks: this.pendingKicks.length,
            pendingKickIds: this.pendingKicks.map((k) => k.localId),
        };
    }

    /**
     * Acknowledge a predicted kick when the authoritative "ball:kicked" event arrives.
     * This avoids false acks from global ball sequence increments created by other players' kicks.
     */
    public acknowledgeKick(localKickId?: number): void {
        if (this.pendingKicks.length === 0) return;

        if (typeof localKickId === "number") {
            const index = this.pendingKicks.findIndex(
                (kick) => kick.localId === localKickId,
            );
            if (index !== -1) {
                this.pendingKicks.splice(index, 1);
                return;
            }
        }

        // Fallback: if server didn't echo local ID, drop oldest pending kick.
        this.pendingKicks.shift();
    }

    private debugLog(message?: unknown, ...optionalParams: unknown[]) {
        if (!this.DEBUG_LOGS) return;
        console.log(message, ...optionalParams);
    }

    private debugWarn(message?: unknown, ...optionalParams: unknown[]) {
        if (!this.DEBUG_LOGS) return;
        console.warn(message, ...optionalParams);
    }
}
