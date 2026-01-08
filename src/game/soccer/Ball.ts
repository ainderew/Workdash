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
        // (The server will initially send back the old position before it processes the kick)
        this.ignoreServerUpdatesUntil = Date.now() + 150;
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        // Update stored state (useful for debug/trajectory logic elsewhere)
        this.targetPos = {
            x: state.x,
            y: state.y,
            vx: state.vx,
            vy: state.vy,
            t: state.timestamp,
        };

        // Authority Window: Don't snap back if we just kicked
        if (Date.now() < this.ignoreServerUpdatesUntil) return;

        if (this.body) {
            const dist = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                state.x,
                state.y,
            );

            // HARD SNAP: If desync is massive (e.g. goal reset), teleport
            if (dist > 250) {
                this.setPosition(state.x, state.y);
                this.setVelocity(state.vx, state.vy);
            }
            // SOFT CORRECTION: Velocity Steering
            else {
                // Calculate the difference between where we are and where server says we are
                const errorX = state.x - this.x;
                const errorY = state.y - this.y;

                // How aggressively to correct?
                // 5 means we try to close the gap quickly using velocity
                const correctionFactor = 5;

                // Set velocity to: Server Velocity + Nudge towards correct position
                this.setVelocity(
                    state.vx + errorX * correctionFactor,
                    state.vy + errorY * correctionFactor,
                );
            }
        }
    }

    public update() {
        // No manual position updates needed.
        // Phaser's physics engine handles movement based on the velocity we set above.
    }
}
