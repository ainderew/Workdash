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
            this.setDrag(50);
            this.setBounce(0.7);

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

        // 1. Apply velocity instantly for immediate feedback
        this.setVelocity(vx, vy);

        // 2. Update local target data so we don't think we are desynced
        this.targetPos.vx = vx;
        this.targetPos.vy = vy;

        // 3. Ignore incoming server packets for 150ms to prevent "rubberbanding"
        this.ignoreServerUpdatesUntil = Date.now() + 150;
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        // Update stored state
        this.targetPos = {
            x: state.x,
            y: state.y,
            vx: state.vx,
            vy: state.vy,
            t: state.timestamp,
        };

        // Authority Window: Don't snap back if we just kicked locally
        if (Date.now() < this.ignoreServerUpdatesUntil) return;

        if (this.body) {
            const dist = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                state.x,
                state.y,
            );

            // 1. HARD SNAP: If desync is massive (e.g. goal reset), teleport
            if (dist > 200) {
                this.setPosition(state.x, state.y);
                this.setVelocity(state.vx, state.vy);
            }
            // 2. SMOOTH CORRECTION
            else {
                // Blend positions slightly to close the gap without snapping
                // We use a small factor (0.1) to gently pull it towards server pos
                const newX = Phaser.Math.Interpolation.Linear(
                    [this.x, state.x],
                    0.1,
                );
                const newY = Phaser.Math.Interpolation.Linear(
                    [this.y, state.y],
                    0.1,
                );

                this.setPosition(newX, newY);

                // Trust server velocity for the physics engine trajectory
                this.setVelocity(state.vx, state.vy);
            }
        }
    }

    public update() {
        // No manual position updates needed.
        // Phaser's physics engine handles movement based on the velocity we set.
    }
}
