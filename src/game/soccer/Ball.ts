import { Scene } from "phaser";
import type { BallStateUpdate } from "./_types";

export class Ball extends Phaser.Physics.Arcade.Sprite {
    private isMultiplayer: boolean = false;
    private lastLocalKickSequence: number = 0;
    private currentSequence: number = 0;

    // Snapshot buffer for smooth remote movement
    private snapshotBuffer: BallStateUpdate[] = [];
    private readonly INTERPOLATION_OFFSET = 100; // 100ms render delay

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

        // 3. Sequence-based authority: ignore server until it acknowledges this kick
        this.currentSequence++;
        this.lastLocalKickSequence = this.currentSequence;

        console.log(
            `[Ball] Kick predicted, sequence: ${this.lastLocalKickSequence} (RTT: ${rtt}ms)`,
        );
    }

    public updateFromServer(state: BallStateUpdate) {
        if (!this.isMultiplayer) return;

        // Authority Check: If server hasn't seen our latest kick yet, ignore its old position
        if (state.sequence && state.sequence < this.lastLocalKickSequence) {
            return;
        }

        // Push to snapshot buffer
        this.snapshotBuffer.push(state);
        if (this.snapshotBuffer.length > 20) {
            this.snapshotBuffer.shift();
        }

        // Update targetPos for legacy/diagnostic reasons
        const updateAge = Date.now() - state.timestamp;
        const extrapolatedX = state.x + state.vx * (updateAge / 1000);
        const extrapolatedY = state.y + state.vy * (updateAge / 1000);

        this.targetPos = {
            x: extrapolatedX,
            y: extrapolatedY,
            vx: state.vx,
            vy: state.vy,
            t: state.timestamp,
        };
    }

    private interpolate() {
        if (this.snapshotBuffer.length < 2) return;

        const renderTime = Date.now() - this.INTERPOLATION_OFFSET;

        // Drop old snapshots
        while (
            this.snapshotBuffer.length > 2 &&
            this.snapshotBuffer[1].timestamp < renderTime
        ) {
            this.snapshotBuffer.shift();
        }

        const s0 = this.snapshotBuffer[0];
        const s1 = this.snapshotBuffer[1];

        if (renderTime < s0.timestamp) {
            this.setPosition(s0.x, s0.y);
            this.setVelocity(s0.vx, s0.vy);
        } else if (renderTime > s1.timestamp) {
            // Ahead of latest - stay at s1 or extrapolate
            this.setPosition(s1.x, s1.y);
            this.setVelocity(s1.vx, s1.vy);
        } else {
            const total = s1.timestamp - s0.timestamp;
            const fraction = (renderTime - s0.timestamp) / total;

            const x = Phaser.Math.Linear(s0.x, s1.x, fraction);
            const y = Phaser.Math.Linear(s0.y, s1.y, fraction);

            this.setPosition(x, y);
            this.setVelocity(
                Phaser.Math.Linear(s0.vx, s1.vx, fraction),
                Phaser.Math.Linear(s0.vy, s1.vy, fraction),
            );
        }
    }

    private applyExponentialDrag(dt: number) {
        if (!this.body) return;
        const DRAG = 1;
        const dragFactor = Math.exp(-DRAG * dt);
        const vx = this.body.velocity.x * dragFactor;
        const vy = this.body.velocity.y * dragFactor;
        this.setVelocity(vx, vy);
    }

    public update() {
        if (!this.isMultiplayer) return;

        // If we are currently ignoring server updates because of a local kick
        // we use physics to simulate. Once the server catches up, we switch back to interpolation.
        const isLocalPredicting =
            this.snapshotBuffer.length > 0 &&
            (this.snapshotBuffer[this.snapshotBuffer.length - 1].sequence || 0) <
                this.lastLocalKickSequence;

        if (isLocalPredicting) {
            // Use physics body + drag for local prediction
            const dt = 1 / 60;
            this.applyExponentialDrag(dt);
        } else {
            // Use snapshot interpolation for remote ground truth
            this.interpolate();
        }
    }
}
