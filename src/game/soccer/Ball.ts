import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";

import { SoccerPhysics } from "../soccer/physicsConfig";

interface ServerSnapshot {
    x: number;
    y: number;
    vx: number;
    vy: number;
    timestamp: number;
    localReceiveTime: number;
}

export class Ball extends Phaser.Physics.Arcade.Sprite {
    private isMultiplayer: boolean = false;
    private ignoreServerUpdatesUntil: number = 0;

    private serverSnapshots: ServerSnapshot[] = [];
    private readonly MAX_SNAPSHOTS = 30;

    private interpolationDelayMs: number = 100;
    private serverTimeOffset: number = 0;
    private lastServerTimestamp: number = 0;

    private readonly DRAG = 1;
    private readonly BALL_RADIUS = 30;
    private readonly WORLD_WIDTH = 3520;
    private readonly WORLD_HEIGHT = 1600;
    private readonly BOUNCE = 0.7;

    private phyState = { x: 0, y: 0, vx: 0, vy: 0 };
    private isInterpolating: boolean = false;

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
        this.phyState = { x, y, vx: 0, vy: 0 };

        if (isMultiplayer) {
            // We manage body manually
            this.body!.enable = false; 
        } else {
            this.setMass(0.5);
            this.setCircle(30);
            this.setDrag(50);
            this.setCollideWorldBounds(true);
        }
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        // "Error Decay" Logic:
        // 1. Update the Physics State (The Truth) to match Server
        this.phyState.x = state.x;
        this.phyState.y = state.y;
        this.phyState.vx = state.vx;
        this.phyState.vy = state.vy;

        // 2. Do NOT snap 'this.x' (Visual). 
        // We let the update loop gently pull 'this.x' towards 'phyState.x'
        
        // Exception: If error is huge (teleport), snap immediately
        const dist = Phaser.Math.Distance.Between(this.x, this.y, state.x, state.y);
        if (dist > 200) {
            this.x = state.x;
            this.y = state.y;
        }
    }

    public update() {
        if (!this.isMultiplayer) return;

        // 1. Run Physics on phyState (Prediction)
        const dt = 0.0166; // 60Hz
        
        // Drag
        const dragFactor = Math.exp(-SoccerPhysics.DRAG * dt);
        this.phyState.vx *= dragFactor;
        this.phyState.vy *= dragFactor;

        // Move
        this.phyState.x += this.phyState.vx * dt;
        this.phyState.y += this.phyState.vy * dt;

        // Bounce (World Bounds)
        if (this.phyState.x - SoccerPhysics.BALL_RADIUS < 0) {
            this.phyState.x = SoccerPhysics.BALL_RADIUS;
            this.phyState.vx = -this.phyState.vx * SoccerPhysics.BOUNCE;
        } else if (this.phyState.x + SoccerPhysics.BALL_RADIUS > SoccerPhysics.WORLD_WIDTH) {
            this.phyState.x = SoccerPhysics.WORLD_WIDTH - SoccerPhysics.BALL_RADIUS;
            this.phyState.vx = -this.phyState.vx * SoccerPhysics.BOUNCE;
        }

        if (this.phyState.y - SoccerPhysics.BALL_RADIUS < 0) {
            this.phyState.y = SoccerPhysics.BALL_RADIUS;
            this.phyState.vy = -this.phyState.vy * SoccerPhysics.BOUNCE;
        } else if (this.phyState.y + SoccerPhysics.BALL_RADIUS > SoccerPhysics.WORLD_HEIGHT) {
            this.phyState.y = SoccerPhysics.WORLD_HEIGHT - SoccerPhysics.BALL_RADIUS;
            this.phyState.vy = -this.phyState.vy * SoccerPhysics.BOUNCE;
        }

        // 2. Smoothly pull Visual (this.x) towards Physics (phyState.x)
        // Error Decay: 10% correction per frame
        const LERP_FACTOR = 0.15;
        
        this.x += (this.phyState.x - this.x) * LERP_FACTOR;
        this.y += (this.phyState.y - this.y) * LERP_FACTOR;

        // If very close, snap to stop micro-jitter
        if (Phaser.Math.Distance.Between(this.x, this.y, this.phyState.x, this.phyState.y) < 1) {
            this.x = this.phyState.x;
            this.y = this.phyState.y;
        }
        
        // Manually update the Phaser Body to match Visuals (for local collisions if enabled, though server handles them)
        // Actually, for local prediction (e.g. wall bounces), body should match phyState?
        // Let's keep body disabled or synced to visuals for debugging
        // this.body!.reset(this.x, this.y);
    }

    public setNetworkConditions(pingMs: number) {
        // No-op: Visual interpolation (Error Decay) is robust against latency
    }

    public get targetPos() {
        return {
            x: this.phyState.x,
            y: this.phyState.y,
            vx: this.phyState.vx,
            vy: this.phyState.vy,
            t: Date.now()
        };
    }

    public predictKick(vx: number, vy: number) {
        // Apply instant kick velocity to physics state for immediate feedback
        this.phyState.vx = vx;
        this.phyState.vy = vy;
    }


    private findBracketingSnapshots(renderTime: number): {
        before: ServerSnapshot | null;
        after: ServerSnapshot | null;
    } {
        let before: ServerSnapshot | null = null;
        let after: ServerSnapshot | null = null;

        for (let i = 0; i < this.serverSnapshots.length; i++) {
            const snap = this.serverSnapshots[i];
            const adjustedTimestamp = snap.timestamp + this.serverTimeOffset;

            if (adjustedTimestamp <= renderTime) {
                before = snap;
            } else {
                after = snap;
                break;
            }
        }

        return { before, after };
    }

    private interpolateBetween(
        before: ServerSnapshot,
        after: ServerSnapshot,
        renderTime: number,
    ): { x: number; y: number } {
        const beforeTime = before.timestamp + this.serverTimeOffset;
        const afterTime = after.timestamp + this.serverTimeOffset;
        const totalTime = afterTime - beforeTime;

        if (totalTime <= 0) {
            return { x: after.x, y: after.y };
        }

        const t = Math.min(
            1,
            Math.max(0, (renderTime - beforeTime) / totalTime),
        );

        const easedT = t;

        const x = before.x + (after.x - before.x) * easedT;
        const y = before.y + (after.y - before.y) * easedT;

        return { x, y };
    }

    private extrapolateFrom(
        snapshot: ServerSnapshot,
        renderTime: number,
    ): { x: number; y: number } {
        const snapshotTime = snapshot.timestamp + this.serverTimeOffset;
        const elapsed = (renderTime - snapshotTime) / 1000;

        const maxExtrapolation = 0.1;
        const clampedElapsed = Math.min(Math.max(0, elapsed), maxExtrapolation);

        if (clampedElapsed <= 0) {
            return { x: snapshot.x, y: snapshot.y };
        }

        const dragFactor = Math.exp(-this.DRAG * clampedElapsed);
        const avgVx = (snapshot.vx * (1 + dragFactor)) / 2;
        const avgVy = (snapshot.vy * (1 + dragFactor)) / 2;

        let x = snapshot.x + avgVx * clampedElapsed;
        let y = snapshot.y + avgVy * clampedElapsed;

        x = Math.max(
            this.BALL_RADIUS,
            Math.min(x, this.WORLD_WIDTH - this.BALL_RADIUS),
        );
        y = Math.max(
            this.BALL_RADIUS,
            Math.min(y, this.WORLD_HEIGHT - this.BALL_RADIUS),
        );

        return { x, y };
    }

    private cleanOldSnapshots(renderTime: number) {
        const keepTime = renderTime - 500;

        while (
            this.serverSnapshots.length > 2 &&
            this.serverSnapshots[0].timestamp + this.serverTimeOffset < keepTime
        ) {
            this.serverSnapshots.shift();
        }
    }

    public getInterpolatedVelocity(): { vx: number; vy: number } {
        if (this.serverSnapshots.length > 0) {
            const latest =
                this.serverSnapshots[this.serverSnapshots.length - 1];
            return { vx: latest.vx, vy: latest.vy };
        }
        return { vx: this.targetPos.vx, vy: this.targetPos.vy };
    }

    public clearSnapshots() {
        this.serverSnapshots = [];
    }

    public getDebugInfo(): string {
        return `Snapshots: ${this.serverSnapshots.length}, Delay: ${this.interpolationDelayMs}ms, Offset: ${this.serverTimeOffset.toFixed(0)}ms`;
    }
}
