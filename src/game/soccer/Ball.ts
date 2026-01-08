import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";

export class Ball extends Phaser.Physics.Arcade.Sprite {
    private isMultiplayer: boolean = false;
    private ignoreServerUpdatesUntil: number = 0;

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
            // Allow physics engine to drive movement, we steer it via velocity
            this.setImmovable(false);
            this.setMass(0.5);
            // Disable Phaser's linear drag - we apply exponential drag manually in update()
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

    public predictKick(vx: number, vy: number, rtt: number = 100) {
        if (!this.isMultiplayer) return;

        // 1. Apply velocity instantly for immediate feedback
        this.setVelocity(vx, vy);

        // 2. Update local target data so we don't think we are desynced
        this.targetPos.vx = vx;
        this.targetPos.vy = vy;

        // 3. Dynamic authority window: RTT * 2 (minimum 150ms, max 400ms)
        // Extended to give more time for physics reconciliation
        const authorityWindow = Math.min(400, Math.max(150, rtt * 2));
        this.ignoreServerUpdatesUntil = Date.now() + authorityWindow;

        console.log(
            `[Ball] Kick predicted, authority window: ${authorityWindow}ms (RTT: ${rtt}ms)`,
        );
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        // Calculate update age (how old is this data?)
        const updateAge = Date.now() - state.timestamp;

        // Extrapolate position based on velocity and age
        // This compensates for network latency by predicting where the ball is NOW
        const extrapolatedX = state.x + state.vx * (updateAge / 1000);
        const extrapolatedY = state.y + state.vy * (updateAge / 1000);

        // Store extrapolated state
        this.targetPos = {
            x: extrapolatedX,
            y: extrapolatedY,
            vx: state.vx,
            vy: state.vy,
            t: state.timestamp,
        };

        // Authority Window: Don't snap back if we just kicked locally
        if (Date.now() < this.ignoreServerUpdatesUntil) {
            console.log(`[Ball] Ignoring server update (authority window active)`);
            return;
        }

        if (this.body) {
            const dist = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                extrapolatedX,
                extrapolatedY,
            );

            // Log diagnostics for stale updates
            if (updateAge > 150) {
                console.warn(
                    `[Ball] Stale update: ${updateAge}ms old, dist: ${dist.toFixed(1)}px`,
                );
            }

            // Hard snap threshold (increased to tolerate prediction error)
            const snapThreshold = 250; // Increased from 150px to handle physics mismatch
            if (dist > snapThreshold) {
                console.log(
                    `[Ball] Hard snap (${dist.toFixed(1)}px > ${snapThreshold}px)`,
                );
                this.setPosition(extrapolatedX, extrapolatedY);
                this.setVelocity(state.vx, state.vy);
            }
            // Smooth correction
            else {
                // Blend positions to close the gap without snapping
                const newX = Phaser.Math.Interpolation.Linear(
                    [this.x, extrapolatedX],
                    0.25,
                );
                const newY = Phaser.Math.Interpolation.Linear(
                    [this.y, extrapolatedY],
                    0.25,
                );

                this.setPosition(newX, newY);

                // Trust server velocity for the physics engine trajectory
                this.setVelocity(state.vx, state.vy);
            }
        }
    }

    private applyExponentialDrag(dt: number) {
        if (!this.body) return;

        // Match server's exponential drag: DRAG = 1 (from soccer.service.ts:95)
        const DRAG = 1;
        const dragFactor = Math.exp(-DRAG * dt);

        const vx = this.body.velocity.x * dragFactor;
        const vy = this.body.velocity.y * dragFactor;

        this.setVelocity(vx, vy);
    }

    public update() {
        // Apply server-matching exponential drag every frame in multiplayer
        // This matches server physics (DRAG=1) and prevents prediction overshoot
        if (this.isMultiplayer && this.body) {
            const dt = 1 / 60; // Assume 60fps (16.6ms per frame)
            this.applyExponentialDrag(dt);
        }
    }
}
