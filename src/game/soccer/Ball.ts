import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";
import {
    integrateBall,
    PhysicsState,
} from "./shared-physics";

export class Ball extends Phaser.Physics.Arcade.Sprite {
    private isMultiplayer: boolean = false;
    private simState: PhysicsState = { x: 0, y: 0, vx: 0, vy: 0 };

    // Snapshot buffer for interpolation
    private snapshotBuffer: BallStateUpdate[] = [];
    private readonly INTERPOLATION_OFFSET = 100; // 100ms render delay

    // Blending state for kick prediction handoff
    private isBlending: boolean = false;
    private isPredicting: boolean = false;
    private lastLocalKickSequence: number = 0;
    private serverSequence: number = 0;

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
        this.simState = { x, y, vx: 0, vy: 0 };

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

    // Called by SoccerMap accumulator loop
    public tickPhysics(dt: number) {
        if (!this.isMultiplayer) {
            integrateBall(this.simState, dt);
            this.syncVisuals();
            return;
        }

        if (this.isBlending || this.isPredicting) {
            // We are predicting: Use shared kernel
            integrateBall(this.simState, dt);
        } else {
            // We are following server: Interpolate snapshot buffer
            const interpState = this.getInterpolatedState();
            if (interpState) {
                this.simState = { ...interpState };
            }
        }
        this.syncVisuals();
    }

    private syncVisuals() {
        // Render sprite at simulation position
        this.setPosition(this.simState.x, this.simState.y);

        // Sync Arcade Body for collisions
        if (this.body) {
            this.body.reset(this.simState.x, this.simState.y);
        }
    }

    public predictKick(vx: number, vy: number) {
        if (!this.isMultiplayer) return;

        // Apply kick immediately to local simulation
        this.simState.vx = vx;
        this.simState.vy = vy;
        this.isPredicting = true;

        // Update target for trajectory preview
        this.targetPos.vx = vx;
        this.targetPos.vy = vy;

        // Increment sequence - ignore server updates until they catch up
        this.lastLocalKickSequence++;
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

        // Server has caught up
        if (this.isPredicting && incomingSeq >= this.lastLocalKickSequence) {
            this.isPredicting = false;
            console.log(
                `[Ball] Server caught up, switching to server authority`,
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

    // Override update to do nothing (physics is now driven by tickPhysics)
    public update() {}
}
