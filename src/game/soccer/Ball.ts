import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";

interface ServerSnapshot {
    x: number;
    y: number;
    vx: number;
    vy: number;
    timestamp: number;
}

export class Ball extends Phaser.Physics.Arcade.Sprite {
    private isMultiplayer: boolean = false;
    private ignoreServerUpdatesUntil: number = 0;

    private serverSnapshots: ServerSnapshot[] = [];
    private readonly MAX_SNAPSHOTS = 20;
    private readonly INTERPOLATION_DELAY_MS = 100;

    private readonly DRAG = 1;
    private readonly BALL_RADIUS = 30;

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
            this.setImmovable(true);
            this.body!.enable = false;
            this.targetPos = { x, y, vx: 0, vy: 0, t: Date.now() };
        } else {
            this.setMass(0.5);
            this.setCircle(30);
            this.setDrag(50);
            this.setCollideWorldBounds(true);
        }
    }

    public predictKick(vx: number, vy: number) {
        if (!this.isMultiplayer) return;

        this.targetPos.vx = vx;
        this.targetPos.vy = vy;
        this.targetPos.t = Date.now();

        this.ignoreServerUpdatesUntil = Date.now() + 150;
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        this.targetPos = {
            x: state.x,
            y: state.y,
            vx: state.vx,
            vy: state.vy,
            t: state.timestamp,
        };

        if (Date.now() < this.ignoreServerUpdatesUntil) {
            return;
        }

        const snapshot: ServerSnapshot = {
            x: state.x,
            y: state.y,
            vx: state.vx,
            vy: state.vy,
            timestamp: state.timestamp,
        };

        this.serverSnapshots.push(snapshot);

        while (this.serverSnapshots.length > this.MAX_SNAPSHOTS) {
            this.serverSnapshots.shift();
        }

        const dist = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            state.x,
            state.y,
        );

        if (dist > 300) {
            this.setPosition(state.x, state.y);
            this.serverSnapshots = [snapshot];
        }
    }

    public update() {
        if (!this.isMultiplayer) return;

        if (Date.now() < this.ignoreServerUpdatesUntil) {
            this.runLocalPrediction();
            return;
        }

        if (this.serverSnapshots.length < 2) {
            if (this.serverSnapshots.length === 1) {
                const snap = this.serverSnapshots[0];
                this.extrapolateFrom(snap);
            }
            return;
        }

        const renderTime = Date.now() - this.INTERPOLATION_DELAY_MS;

        const { before, after } = this.findBracketingSnapshots(renderTime);

        if (before && after) {
            this.interpolateBetween(before, after, renderTime);
        } else if (before) {
            this.extrapolateFrom(before);
        } else if (after) {
            this.setPosition(after.x, after.y);
        }
    }

    private runLocalPrediction() {
        const dt = 0.016;
        const dragFactor = Math.exp(-this.DRAG * dt);

        this.targetPos.vx *= dragFactor;
        this.targetPos.vy *= dragFactor;

        const newX = this.x + this.targetPos.vx * dt;
        const newY = this.y + this.targetPos.vy * dt;

        this.setPosition(newX, newY);
    }

    private findBracketingSnapshots(renderTime: number): {
        before: ServerSnapshot | null;
        after: ServerSnapshot | null;
    } {
        let before: ServerSnapshot | null = null;
        let after: ServerSnapshot | null = null;

        for (let i = 0; i < this.serverSnapshots.length; i++) {
            const snap = this.serverSnapshots[i];
            if (snap.timestamp <= renderTime) {
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
    ) {
        const totalTime = after.timestamp - before.timestamp;

        if (totalTime <= 0) {
            this.setPosition(after.x, after.y);
            return;
        }

        const t = Math.min(
            1,
            Math.max(0, (renderTime - before.timestamp) / totalTime),
        );

        const x = before.x + (after.x - before.x) * t;
        const y = before.y + (after.y - before.y) * t;

        this.setPosition(x, y);
    }

    private extrapolateFrom(snapshot: ServerSnapshot) {
        const elapsed = (Date.now() - snapshot.timestamp) / 1000;
        const maxExtrapolation = 0.2;
        const clampedElapsed = Math.min(elapsed, maxExtrapolation);

        let vx = snapshot.vx;
        let vy = snapshot.vy;
        const dragFactor = Math.exp(-this.DRAG * clampedElapsed);
        vx *= dragFactor;
        vy *= dragFactor;

        const avgVx = (snapshot.vx + vx) / 2;
        const avgVy = (snapshot.vy + vy) / 2;

        const x = snapshot.x + avgVx * clampedElapsed;
        const y = snapshot.y + avgVy * clampedElapsed;

        this.setPosition(x, y);
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
}
