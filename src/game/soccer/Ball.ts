import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";

export class Ball extends Phaser.Physics.Arcade.Sprite {
    private isMultiplayer: boolean = false;
    private lastLocalKickSequence: number = 0;
    private serverSequence: number = 0;

    // Snapshot buffer for interpolation
    private snapshotBuffer: BallStateUpdate[] = [];
    private readonly INTERPOLATION_OFFSET = 100; // 100ms render delay

    // Blending state for kick prediction handoff
    private isBlending: boolean = false;
    private blendStartTime: number = 0;
    private blendDuration: number = 200; // ms
    private blendStartPos = { x: 0, y: 0 };

    public targetPos = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        t: Date.now(),
    };

    constructor(
        scene: Scene,
        x: number,
        y: number,
        isMultiplayer: boolean = false,
    ) {
        const graphics = scene.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(30, 30, 27);
        graphics.lineStyle(3, 0x000000, 1);
        graphics.strokeCircle(30, 30, 27);
        graphics.generateTexture("ball", 60, 60);
        graphics.destroy();

        super(scene, x, y, "ball");

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.isMultiplayer = isMultiplayer;

        if (isMultiplayer) {
            this.setCircle(30);
            this.setImmovable(false);
            this.setMass(0.5);
            this.setDrag(0);
            this.setBounce(0.7);
            this.targetPos = { x, y, vx: 0, vy: 0, t: Date.now() };
        } else {
            this.setMass(0.5);
            this.setCircle(30);
            this.setDrag(50);
            this.setCollideWorldBounds(true);
        }
    }

    public predictKick(vx: number, vy: number, _rtt: number = 100) {
        if (!this.isMultiplayer) return;

        // Apply velocity instantly
        this.setVelocity(vx, vy);

        // Update target for trajectory preview
        this.targetPos.vx = vx;
        this.targetPos.vy = vy;

        // Increment sequence - ignore server updates until they catch up
        this.lastLocalKickSequence++;

        // Cancel any ongoing blend
        this.isBlending = false;

        console.log(
            `[Ball] Kick predicted, local seq: ${this.lastLocalKickSequence}`,
        );
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        const incomingSeq = state.sequence || 0;

        // If server hasn't processed our kick yet, ignore its position
        if (incomingSeq < this.lastLocalKickSequence) {
            // But still update targetPos for trajectory preview
            this.targetPos.vx = state.vx;
            this.targetPos.vy = state.vy;
            return;
        }

        // Server has caught up - start blending if we were predicting
        if (
            this.serverSequence < this.lastLocalKickSequence &&
            incomingSeq >= this.lastLocalKickSequence
        ) {
            // Transition from prediction to server authority
            this.isBlending = true;
            this.blendStartTime = Date.now();
            this.blendStartPos = { x: this.x, y: this.y };
            console.log(
                `[Ball] Server caught up, starting blend from (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`,
            );
        }

        this.serverSequence = incomingSeq;

        // Push to snapshot buffer
        this.snapshotBuffer.push(state);
        if (this.snapshotBuffer.length > 30) {
            this.snapshotBuffer.shift();
        }

        // Update targetPos with extrapolation
        const age = Date.now() - state.timestamp;
        const DRAG = 1;
        const dragFactor = Math.exp(-DRAG * (age / 1000));

        this.targetPos = {
            x: state.x + state.vx * (age / 1000) * dragFactor,
            y: state.y + state.vy * (age / 1000) * dragFactor,
            vx: state.vx * dragFactor,
            vy: state.vy * dragFactor,
            t: state.timestamp,
        };
    }

    private getInterpolatedState(): {
        x: number;
        y: number;
        vx: number;
        vy: number;
    } | null {
        if (this.snapshotBuffer.length < 2) {
            if (this.snapshotBuffer.length === 1) {
                const s = this.snapshotBuffer[0];
                return { x: s.x, y: s.y, vx: s.vx, vy: s.vy };
            }
            return null;
        }

        const renderTime = Date.now() - this.INTERPOLATION_OFFSET;

        // Drop old snapshots but keep at least 2
        while (
            this.snapshotBuffer.length > 2 &&
            this.snapshotBuffer[1].timestamp < renderTime
        ) {
            this.snapshotBuffer.shift();
        }

        const s0 = this.snapshotBuffer[0];
        const s1 = this.snapshotBuffer[1];

        if (renderTime <= s0.timestamp) {
            return { x: s0.x, y: s0.y, vx: s0.vx, vy: s0.vy };
        } else if (renderTime >= s1.timestamp) {
            // Extrapolate beyond latest snapshot
            const dt = (renderTime - s1.timestamp) / 1000;
            const DRAG = 1;
            const dragFactor = Math.exp(-DRAG * dt);
            return {
                x: s1.x + s1.vx * dt * dragFactor,
                y: s1.y + s1.vy * dt * dragFactor,
                vx: s1.vx * dragFactor,
                vy: s1.vy * dragFactor,
            };
        } else {
            // Interpolate between s0 and s1
            const total = s1.timestamp - s0.timestamp;
            const fraction = (renderTime - s0.timestamp) / total;

            return {
                x: Phaser.Math.Linear(s0.x, s1.x, fraction),
                y: Phaser.Math.Linear(s0.y, s1.y, fraction),
                vx: Phaser.Math.Linear(s0.vx, s1.vx, fraction),
                vy: Phaser.Math.Linear(s0.vy, s1.vy, fraction),
            };
        }
    }

    private applyExponentialDrag(dt: number) {
        if (!this.body) return;
        const DRAG = 1;
        const dragFactor = Math.exp(-DRAG * dt);
        this.setVelocity(
            this.body.velocity.x * dragFactor,
            this.body.velocity.y * dragFactor,
        );
    }

    public update() {
        if (!this.isMultiplayer) return;

        const isPredicting = this.serverSequence < this.lastLocalKickSequence;

        if (isPredicting) {
            // We kicked - use local physics
            this.applyExponentialDrag(1 / 60);
        } else if (this.isBlending) {
            // Transitioning from prediction to server
            const serverState = this.getInterpolatedState();
            if (!serverState) {
                this.applyExponentialDrag(1 / 60);
                return;
            }

            const elapsed = Date.now() - this.blendStartTime;
            const t = Math.min(1, elapsed / this.blendDuration);

            // Use smooth easing
            const eased = Phaser.Math.Easing.Quadratic.InOut(t);

            const blendedX = Phaser.Math.Linear(
                this.blendStartPos.x,
                serverState.x,
                eased,
            );
            const blendedY = Phaser.Math.Linear(
                this.blendStartPos.y,
                serverState.y,
                eased,
            );

            this.setPosition(blendedX, blendedY);
            this.setVelocity(serverState.vx, serverState.vy);

            if (t >= 1) {
                this.isBlending = false;
                console.log(
                    `[Ball] Blend complete at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`,
                );
            }
        } else {
            // Full server authority - use interpolation
            const serverState = this.getInterpolatedState();
            if (serverState) {
                this.setPosition(serverState.x, serverState.y);
                this.setVelocity(serverState.vx, serverState.vy);
            }
        }
    }
}
