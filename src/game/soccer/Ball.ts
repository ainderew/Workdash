import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";

export class Ball extends Phaser.Physics.Arcade.Sprite {
    private isMultiplayer: boolean = false;

    // NEW: Timestamp to track when we should stop ignoring server updates
    private ignoreServerUpdatesUntil: number = 0;

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
            this.setCircle(30);
            this.setImmovable(true);

            if (this.body) {
                (this.body as Phaser.Physics.Arcade.Body).moves = false;
            }

            this.targetPos = { x, y, vx: 0, vy: 0, t: Date.now() };
        } else {
            this.setMass(0.5);
            this.setCircle(30);
            this.setDrag(50);
            this.setCollideWorldBounds(true);
        }
    }

    /**
     * Called immediately when the local player kicks.
     * Starts moving the ball instantly and blocks laggy server updates for 150ms.
     */
    public predictKick(vx: number, vy: number) {
        if (!this.isMultiplayer) return;

        // 1. Instant local update
        this.targetPos = {
            x: this.x,
            y: this.y,
            vx: vx,
            vy: vy,
            t: Date.now(),
        };

        // 2. Set Authority Window: Ignore incoming server packets for 150ms
        // This prevents the "rewind" effect where the ball jumps back to the start of the kick.
        this.ignoreServerUpdatesUntil = Date.now() + 150;
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        // 3. Check Authority Window
        if (Date.now() < this.ignoreServerUpdatesUntil) {
            // SAFETY CHECK: If the server says the ball is doing something wildly different
            // (e.g., we predicted a kick, but it actually hit a wall or was blocked),
            // we MUST break the lock and accept the update.

            const predMag = Math.sqrt(
                this.targetPos.vx ** 2 + this.targetPos.vy ** 2,
            );
            const serverMag = Math.sqrt(state.vx ** 2 + state.vy ** 2);

            // Case A: We predicted movement, but server says it stopped (blocked/stunned)
            const isUnexpectedStop = predMag > 100 && serverMag < 10;

            // Case B: Direction mismatch (e.g. hit a player we didn't account for)
            let isDirectionMismatch = false;
            if (predMag > 0 && serverMag > 0) {
                const dot =
                    (this.targetPos.vx * state.vx +
                        this.targetPos.vy * state.vy) /
                    (predMag * serverMag);
                if (dot < 0.5) isDirectionMismatch = true; // Angle diff > 60 degrees
            }

            if (isUnexpectedStop || isDirectionMismatch) {
                // Break the lock early
                this.ignoreServerUpdatesUntil = 0;
            } else {
                // Ignore this update to prevent stutter
                return;
            }
        }

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

        const now = Date.now();
        const timeSinceUpdate = now - this.targetPos.t;

        let predictedX = this.targetPos.x;
        let predictedY = this.targetPos.y;

        // Extrapolate position based on velocity
        if (timeSinceUpdate < 500) {
            const dt = timeSinceUpdate / 1000;
            predictedX = this.targetPos.x + this.targetPos.vx * dt;
            predictedY = this.targetPos.y + this.targetPos.vy * dt;
        }

        const distance = Math.sqrt(
            Math.pow(predictedX - this.x, 2) + Math.pow(predictedY - this.y, 2),
        );

        const speed = Math.sqrt(
            Math.pow(this.targetPos.vx, 2) + Math.pow(this.targetPos.vy, 2),
        );

        // Dynamic Snap Threshold:
        // High speed (kicked) -> Allow larger gap (400px) to smooth out latency
        // Low speed (dribble) -> Keep tight gap (200px) for precision
        const snapThreshold = speed > 500 ? 400 : 200;

        if (distance > snapThreshold) {
            this.x = predictedX;
            this.y = predictedY;
        } else {
            // Smooth lerp
            const baseLerp = 0.2;
            const dynamicLerp = speed > 500 ? 0.35 : baseLerp;
            const lerpFactor = Math.min(dynamicLerp + distance / 500, 0.6);

            this.x += (predictedX - this.x) * lerpFactor;
            this.y += (predictedY - this.y) * lerpFactor;
        }

        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
        }
    }
}
