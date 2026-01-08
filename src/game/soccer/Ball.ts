import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";

export class Ball extends Phaser.Physics.Arcade.Sprite {
    private isMultiplayer: boolean = false;

    // Network state for multiplayer interpolation
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
            // In multiplayer, ball is solid but position is server-controlled
            // body.moves = false prevents physics engine from updating position
            // We manually update position in update() method from server state
            this.setCircle(30);

            // Make ball immovable so players can't pass through
            this.setImmovable(true);

            // Disable automatic physics updates - we control position manually
            if (this.body) {
                (this.body as Phaser.Physics.Arcade.Body).moves = false;
            }

            this.targetPos = { x, y, vx: 0, vy: 0, t: Date.now() };
        } else {
            // Local physics for single-player mode
            this.setMass(0.5);
            this.setCircle(30);
            this.setDrag(50);
            this.setCollideWorldBounds(true);
        }
    }

    /**
     * NEW: Called by Client when Spacebar/Kick is pressed.
     * This moves the ball instantly on your screen while waiting for the server.
     */
    public predictKick(vx: number, vy: number) {
        if (!this.isMultiplayer) return;

        // Reset the target state based on CURRENT position + NEW velocity
        this.targetPos = {
            x: this.x,
            y: this.y,
            vx: vx,
            vy: vy,
            t: Date.now(),
        };
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
    }

    public update() {
        if (!this.isMultiplayer) return;

        // Calculate how much time has passed since last update
        const now = Date.now();
        const timeSinceUpdate = now - this.targetPos.t;

        let predictedX = this.targetPos.x;
        let predictedY = this.targetPos.y;

        // Apply extrapolation (predict where ball is NOW based on last known data)
        // We cap extrapolation at 500ms to prevent ball flying off infinitely during lag spikes
        if (timeSinceUpdate < 500) {
            const dt = timeSinceUpdate / 1000;
            predictedX = this.targetPos.x + this.targetPos.vx * dt;
            predictedY = this.targetPos.y + this.targetPos.vy * dt;
        }

        // Calculate distance between where we are vs where we should be
        const distance = Math.sqrt(
            Math.pow(predictedX - this.x, 2) + Math.pow(predictedY - this.y, 2),
        );

        // Calculate speed to determine context
        const speed = Math.sqrt(
            Math.pow(this.targetPos.vx, 2) + Math.pow(this.targetPos.vy, 2),
        );

        // Dynamic Teleport Threshold:
        // If ball is moving fast (e.g. > 500), allow more drift (400px) before snapping.
        // If ball is slow/stopped, keep tight (200px) to ensure precision.
        const snapThreshold = speed > 500 ? 400 : 200;

        // Teleport if too far (desync recovery)
        if (distance > snapThreshold) {
            this.x = predictedX;
            this.y = predictedY;
        } else {
            // Smooth lerp correction
            // We increase the lerp factor slightly if moving fast to catch up quicker without snapping
            const baseLerp = 0.2;
            const dynamicLerp = speed > 500 ? 0.35 : baseLerp;

            // Lerp factor increases if distance is large
            const lerpFactor = Math.min(dynamicLerp + distance / 500, 0.6);

            this.x += (predictedX - this.x) * lerpFactor;
            this.y += (predictedY - this.y) * lerpFactor;
        }

        // Update physics body position to match sprite position
        // (body.moves is false, so we must manually sync)
        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
        }
    }
}
