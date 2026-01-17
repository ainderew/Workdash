import { Scene } from "phaser";
import {
  integrateBall,
  PHYSICS_CONSTANTS,
  PhysicsState,
} from "./shared-physics";

interface StateSnapshot {
  tick: number;
  state: PhysicsState;
}

export class Ball extends Phaser.GameObjects.Sprite {
  // 1. The "True" Simulation State (Client Prediction)
  public simState: PhysicsState = { x: 0, y: 0, vx: 0, vy: 0 };

  // 2. The Accumulator for Fixed Timestep
  private accumulator: number = 0;

  // 3. The History Buffer (for Rewinding)
  private history: StateSnapshot[] = [];
  private currentTick: number = 0;

  private isMultiplayer: boolean = false;

  constructor(
    scene: Scene,
    x: number,
    y: number,
    isMultiplayer: boolean = false
  ) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(30, 30, 27);
    graphics.lineStyle(3, 0x000000, 1);
    graphics.strokeCircle(30, 30, 27);
    graphics.generateTexture("ball", 60, 60);
    graphics.destroy();

    super(scene, x, y, "ball");
    this.simState = { x, y, vx: 0, vy: 0 };
    this.isMultiplayer = isMultiplayer;

    scene.add.existing(this);
    // NOTE: No scene.physics.add.existing(this)! We do physics manually.
    
    // Add a simple circular body for Arcade Physics overlap checks (like kick range)
    // We won't use it for movement, just for "is touching" checks if needed by SoccerMap
    scene.physics.add.existing(this);
    if (this.body) {
        (this.body as Phaser.Physics.Arcade.Body).setCircle(30);
    }
  }

  // Shim for SoccerMap compatibility
  public get targetPos() {
      return {
          x: this.simState.x,
          y: this.simState.y,
          vx: this.simState.vx,
          vy: this.simState.vy,
          t: Date.now() // rough approximation
      };
  }

  // Shim for SoccerMap compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setBounce(val: number) {
      // TODO: Feed this into shared-physics if needed.
      // Currently shared-physics uses PHYSICS_CONSTANTS.BOUNCE (0.7)
  }

  /**
   * Called every frame by SoccerMap update loop
   */
  public update(time: number, delta: number) {
    // Add frame time (converted to ms) to accumulator
    this.accumulator += delta;

    // Consume accumulator in fixed chunks (Exactly like Server)
    while (this.accumulator >= PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS) {
      this.runPhysicsStep();
      this.accumulator -= PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS;
    }

    // Render Interpolation (Optional, for buttery smooth 144hz)
    const alpha = this.accumulator / PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS;
    this.updateVisuals(alpha);
  }

  /**
   * Runs 1 tick of physics (16.66ms)
   */
  private runPhysicsStep() {
    this.currentTick++;

    // 1. Run the Shared Kernel
    integrateBall(this.simState, PHYSICS_CONSTANTS.FIXED_TIMESTEP_SEC);

    // 2. Store the result in history
    this.history.push({
      tick: this.currentTick,
      state: { ...this.simState }, // Clone the object!
    });

    // 3. Keep history small (max 1 second buffer)
    if (this.history.length > 60) {
      this.history.shift();
    }
  }

  /**
   * The Magic: Called when Socket.io receives "ball:state"
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onServerUpdate(serverPacket: any) {
    if (!serverPacket.tick) {
        // Fallback for packets without tick (shouldn't happen with updated server)
        // Or if it's the initial state
        this.simState.x = serverPacket.x;
        this.simState.y = serverPacket.y;
        this.simState.vx = serverPacket.vx;
        this.simState.vy = serverPacket.vy;
        return;
    }

    const serverTick = serverPacket.tick;
    const serverState = {
      x: serverPacket.x,
      y: serverPacket.y,
      vx: serverPacket.vx,
      vy: serverPacket.vy,
    };

    // 1. Find our local history for this specific tick
    const historyState = this.history.find((h) => h.tick === serverTick);

    // If we don't have history (too old or new connection), just snap
    if (!historyState) {
      this.simState = serverState;
      this.currentTick = serverTick;
      this.history = []; // Reset history
      return;
    }

    // 2. Check for Divergence (Did we predict wrong?)
    const errorX = Math.abs(serverState.x - historyState.state.x);
    const errorY = Math.abs(serverState.y - historyState.state.y);

    // Tolerance: 1 pixel. If < 1px, we assume our prediction was correct.
    if (errorX < 1 && errorY < 1) {
      // Perfect prediction! Do nothing.
      // (Optional) We can delete history older than this tick now.
      this.history = this.history.filter((h) => h.tick >= serverTick);
      return;
    }

    // 3. RECONCILIATION NEEDED
    // console.log(`Prediction Error: ${errorX.toFixed(2)}, Reconciling...`);

    // A. Rewind: Snap simulation to Server's Truth
    this.simState = { ...serverState };

    // B. Replay: Re-run physics for every tick since the server update up to NOW
    const ticksToReplay = this.history.filter((h) => h.tick > serverTick);

    // Remove old invalid history
    this.history = [];

    // Re-simulate
    for (const pastFrame of ticksToReplay) {
      // Note: If you had player inputs (kicks) stored, you would re-apply them here
      // based on the pastFrame.tick. For Ball, we rely on momentum.
      
      // We need to advance currentTick appropriately during replay? 
      // Actually runPhysicsStep increments currentTick. 
      // We are essentially re-building the history from serverTick + 1 to NOW.
      // So we should temporarily reset currentTick to serverTick, OR just realize runPhysicsStep relies on state.
      
      // FIX: runPhysicsStep increments currentTick. We need to preserve the sequence of ticks.
      // The simplest way is to just call runPhysicsStep() N times.
      // But we need to make sure `this.currentTick` ends up at the correct value.
      
      // Let's manually manage currentTick to match the replay
      this.currentTick = pastFrame.tick - 1; 
      this.runPhysicsStep();
    }
  }

  /**
   * Apply a local kick immediately (Prediction)
   */
  public predictKick(vx: number, vy: number) {
    this.simState.vx = vx;
    this.simState.vy = vy;
  }

  public setVelocity(vx: number, vy: number) {
      this.predictKick(vx, vy);
  }
  
  public setPosition(x?: number, y?: number, z?: number, w?: number): this {
      super.setPosition(x, y, z, w);
      if (x !== undefined && y !== undefined) {
        this.simState.x = x;
        this.simState.y = y;
        if(this.body) {
            (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
        }
      }
      return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private updateVisuals(alpha: number) {
    // Interpolate between previous physics state and current for visual smoothness
    // For now, just snap to simState (ignoring alpha)
    super.setPosition(this.simState.x, this.simState.y);
    
    // Sync Arcade Body for overlaps (SoccerMap uses overlaps for kick range etc)
    if (this.body) {
        (this.body as Phaser.Physics.Arcade.Body).reset(this.simState.x, this.simState.y);
    }
  }
}
