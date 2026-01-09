import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";

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
            if (this.body) {
                this.body.enable = false;
            }
            this.targetPos = { x, y, vx: 0, vy: 0, t: Date.now() };
        } else {
            this.setMass(0.5);
            this.setCircle(30);
            this.setDrag(50);
            this.setCollideWorldBounds(true);
        }
    }

    public setNetworkConditions(pingMs: number) {
        const oneWayLatency = pingMs / 2;
        const jitterBuffer = 20;
        this.interpolationDelayMs = Math.max(
            60,
            oneWayLatency + jitterBuffer + 50,
        );
    }

    public predictKick(vx: number, vy: number) {
        if (!this.isMultiplayer) return;

        this.targetPos.vx = vx;
        this.targetPos.vy = vy;
        this.targetPos.x = this.x;
        this.targetPos.y = this.y;
        this.targetPos.t = Date.now();

        this.serverSnapshots = [];
        this.ignoreServerUpdatesUntil = Date.now() + 120;
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        const localNow = Date.now();

        if (state.timestamp && state.timestamp > this.lastServerTimestamp) {
            const estimatedOneWayLatency = 25;
            const currentOffset =
                localNow - state.timestamp - estimatedOneWayLatency;

            console.log(`[Ball Update] Incoming TS: ${state.timestamp}, Local: ${localNow}, Offset: ${currentOffset}`);

            if (this.lastServerTimestamp === 0) {
                this.serverTimeOffset = currentOffset;
            } else {
                // If the new offset is smaller (more negative), it means the packet arrived "faster"
                // (relative to server time), implying less network delay. We adopt this "better" sync.
                // If it's larger, it's likely network jitter/lag, so we ignore it or adapt very slowly.
                if (currentOffset < this.serverTimeOffset) {
                    this.serverTimeOffset = currentOffset;
                } else {
                    // Very slow drift correction (0.5%) to handle clock drift
                    this.serverTimeOffset =
                        this.serverTimeOffset * 0.995 + currentOffset * 0.005;
                }
            }

            this.lastServerTimestamp = state.timestamp;
        }

        this.targetPos = {
            x: state.x,
            y: state.y,
            vx: state.vx,
            vy: state.vy,
            t: state.timestamp || localNow,
        };

        const snapshot: ServerSnapshot = {
            x: state.x,
            y: state.y,
            vx: state.vx,
            vy: state.vy,
            timestamp: state.timestamp || localNow,
            localReceiveTime: localNow,
        };

        this.insertSnapshot(snapshot);

        if (localNow < this.ignoreServerUpdatesUntil) {
            return;
        }

        const dist = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            state.x,
            state.y,
        );

        if (dist > 400) {
            this.setPosition(state.x, state.y);
            this.serverSnapshots = [snapshot];
        }
    }

    private insertSnapshot(snapshot: ServerSnapshot) {
        if (this.serverSnapshots.length > 0) {
            const lastSnapshot = this.serverSnapshots[this.serverSnapshots.length - 1];
            const gap = snapshot.timestamp - lastSnapshot.timestamp;
            console.log(`[Ball Snapshot] Gap: ${gap}ms`);
            if (gap > 70) {
                 console.warn(`[Packet Gap] ${gap}ms since last snapshot (Expected ~50ms)`);
            }
        }

        let insertIndex = this.serverSnapshots.length;
        for (let i = this.serverSnapshots.length - 1; i >= 0; i--) {
            if (this.serverSnapshots[i].timestamp <= snapshot.timestamp) {
                insertIndex = i + 1;
                break;
            }
            if (i === 0) {
                insertIndex = 0;
            }
        }

        this.serverSnapshots.splice(insertIndex, 0, snapshot);

        while (this.serverSnapshots.length > this.MAX_SNAPSHOTS) {
            this.serverSnapshots.shift();
        }
    }

    public update() {
        if (!this.isMultiplayer) return;

        const localNow = Date.now();

        if (localNow < this.ignoreServerUpdatesUntil) {
            this.runLocalPrediction();
            return;
        }

        if (this.serverSnapshots.length === 0) {
            return;
        }

        if (this.serverSnapshots.length < 3) {
            console.warn(`[Buffer Warning] Low snapshot count: ${this.serverSnapshots.length}`);
            console.log(`[Buffer Warning] Snapshots TS: ${this.serverSnapshots.map(s => s.timestamp).join(', ')}`);
        }

        const renderTime = localNow - this.interpolationDelayMs;
        const { before, after } = this.findBracketingSnapshots(renderTime);

        let newX = this.x;
        let newY = this.y;

        if (before && after && before !== after) {
            const result = this.interpolateBetween(before, after, renderTime);
            newX = result.x;
            newY = result.y;
        } else if (before) {
            const result = this.extrapolateFrom(before, renderTime);
            newX = result.x;
            newY = result.y;
        } else if (after) {
            newX = after.x;
            newY = after.y;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, newX, newY);

        if (dist > 200) {
            this.setPosition(newX, newY);
        } else if (dist > 0.5) {
            const smoothing = Math.min(0.3, dist / 100);
            this.x += (newX - this.x) * smoothing;
            this.y += (newY - this.y) * smoothing;
        }

        this.cleanOldSnapshots(renderTime);
    }

    private runLocalPrediction() {
        const dt = 1 / 60;
        const dragFactor = Math.exp(-this.DRAG * dt);

        this.targetPos.vx *= dragFactor;
        this.targetPos.vy *= dragFactor;

        let newX = this.x + this.targetPos.vx * dt;
        let newY = this.y + this.targetPos.vy * dt;

        if (newX - this.BALL_RADIUS < 0) {
            newX = this.BALL_RADIUS;
            this.targetPos.vx = -this.targetPos.vx * this.BOUNCE;
        } else if (newX + this.BALL_RADIUS > this.WORLD_WIDTH) {
            newX = this.WORLD_WIDTH - this.BALL_RADIUS;
            this.targetPos.vx = -this.targetPos.vx * this.BOUNCE;
        }

        if (newY - this.BALL_RADIUS < 0) {
            newY = this.BALL_RADIUS;
            this.targetPos.vy = -this.targetPos.vy * this.BOUNCE;
        } else if (newY + this.BALL_RADIUS > this.WORLD_HEIGHT) {
            newY = this.WORLD_HEIGHT - this.BALL_RADIUS;
            this.targetPos.vy = -this.targetPos.vy * this.BOUNCE;
        }

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
