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

    constructor(scene: Scene, x: number, y: number, isMultiplayer: boolean = false) {
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

        // If update is recent (< 100ms), extrapolate position
        if (timeSinceUpdate < 100) {
            const dt = timeSinceUpdate / 1000;
            predictedX = this.targetPos.x + this.targetPos.vx * dt;
            predictedY = this.targetPos.y + this.targetPos.vy * dt;
        }

        // Calculate distance to predicted position
        const distance = Math.sqrt(
            Math.pow(predictedX - this.x, 2) + Math.pow(predictedY - this.y, 2),
        );

        // Teleport if too far (desync recovery)
        if (distance > 200) {
            this.x = predictedX;
            this.y = predictedY;
        } else {
            // Smooth lerp
            const baseLerp = 0.2;
            const lerpFactor = Math.min(baseLerp + distance / 500, 0.5);

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
