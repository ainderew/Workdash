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

interface PendingKick {
  tick: number;
  sequence: number; // Use Sequence ID instead of Velocity matching
  vx: number;
  vy: number;
}

export class Ball extends Phaser.GameObjects.Sprite {
  // 1. Decouple Physics from Rendering
  public simState: PhysicsState = { x: 0, y: 0, vx: 0, vy: 0 };
  
  private accumulator: number = 0;
  private history: StateSnapshot[] = [];
  private currentTick: number = 0;
  
  // Track the last sequence processed by the server to avoid double-kicking during replays
  private lastServerSequence: number = 0;
  private nextClientSequence: number = 1; 

  private pendingKicks: PendingKick[] = [];
  private isMultiplayer: boolean = false;

  // Smoothing factor (0.1 = loose/smooth, 0.9 = tight/jittery)
   
  private readonly INTERPOLATION_FACTOR = 0.5;

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
    scene.physics.add.existing(this);
    
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setCircle(30);
    }
  }

  // Debug shim
  public get targetPos() {
    return {
      x: this.simState.x,
      y: this.simState.y,
      vx: this.simState.vx,
      vy: this.simState.vy,
      t: this.currentTick 
    };
  }

  // Physics shim
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setBounce(val: number) {}

  public update(time: number, delta: number) {
    // 1. Accumulate Time
    this.accumulator += delta;

    // Safety cap to prevent spiral of death if tab is backgrounded
    if (this.accumulator > 250) this.accumulator = 250;

    // 2. Consume Physics Steps (Fixed Update)
    while (this.accumulator >= PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS) {
      this.runPhysicsStep();
      this.accumulator -= PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS;
    }

    // 3. Render Interpolation (The Anti-Jitter)
    this.updateVisuals(delta);
  }

  private runPhysicsStep() {
    this.currentTick++;

    // Re-apply kicks that the server hasn't acknowledged yet
    // AND that belong to this specific tick timeframe
    const kick = this.pendingKicks.find(k => k.tick === this.currentTick);
    if (kick) {
        // Only apply if the server hasn't already processed this sequence
        if (kick.sequence > this.lastServerSequence) {
            this.simState.vx = kick.vx;
            this.simState.vy = kick.vy;
        }
    }

    // Shared Physics Kernel
    integrateBall(this.simState, PHYSICS_CONSTANTS.FIXED_TIMESTEP_SEC);

    // Record History
    this.history.push({
      tick: this.currentTick,
      state: { ...this.simState },
    });

    // Keep buffer manageable (2 seconds @ 60hz)
    if (this.history.length > 120) {
      this.history.shift();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onServerUpdate(serverPacket: any) {
    if (!serverPacket.tick) return; 

    const serverTick = serverPacket.tick;
    // Update the authoritative sequence from server
    if (serverPacket.sequence) {
        this.lastServerSequence = serverPacket.sequence;
    }

    const serverState = {
      x: serverPacket.x,
      y: serverPacket.y,
      vx: serverPacket.vx,
      vy: serverPacket.vy,
    };

    // --- STEP 1: Clean up Pending Kicks ---
    // Remove kicks that are older than this server tick
    // OR have been processed via sequence ID
    this.pendingKicks = this.pendingKicks.filter(kick => {
        if (kick.sequence <= this.lastServerSequence) return false; // Handled
        if (kick.tick < serverTick) {
            // Missed kick? Force it to next available tick to retry (Lag handling)
            kick.tick = serverTick + 1;
        }
        return true;
    });

    // --- STEP 2: Reconciliation ---
    const historyState = this.history.find((h) => h.tick === serverTick);

    // Tolerance check (pixels). If we are close, do not snap physics.
    // This reduces micro-stuttering when physics engines drift slightly.
    if (historyState) {
        const errorX = Math.abs(serverState.x - historyState.state.x);
        const errorY = Math.abs(serverState.y - historyState.state.y);
        const errorVx = Math.abs(serverState.vx - historyState.state.vx);
        const errorVy = Math.abs(serverState.vy - historyState.state.vy);

        // If position is close (< 5px) and velocity is close, trust client physics
        // This prevents the "vibrating ball" when resting
        if (errorX < 5 && errorY < 5 && errorVx < 10 && errorVy < 10) {
            // Prune old history, but don't rewind
            this.history = this.history.filter(h => h.tick >= serverTick);
            return; 
        }
    }

    // --- STEP 3: Rewind & Replay (Hard Correction) ---
    // Snap simulation to server truth
    this.simState = { ...serverState };
    
    // Find future frames to replay
    const ticksToReplay = this.history.filter((h) => h.tick > serverTick);
    
    // Reset simulation timeline
    this.history = []; 
    this.currentTick = serverTick;

    // Re-simulate
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _pastFrame of ticksToReplay) {
      this.runPhysicsStep(); 
    }
  }

  public predictKick(vx: number, vy: number) {
    const kickTick = this.currentTick + 1;
    
    // Ensure we don't assign a sequence ID that the server already considers "past"
    this.nextClientSequence = Math.max(this.nextClientSequence, this.lastServerSequence + 1);
    const sequence = this.nextClientSequence++;
    
    this.pendingKicks.push({
        tick: kickTick,
        sequence: sequence,
        vx, 
        vy
    });
  }

  public setVelocity(vx: number, vy: number) {
      this.predictKick(vx, vy);
  }
  
  public setPosition(x?: number, y?: number, z?: number, w?: number): this {
      super.setPosition(x, y, z, w);
      // If position is manually set (e.g. Respawn), hard reset sim state
      if (this.simState && x !== undefined && y !== undefined) {
        this.simState.x = x;
        this.simState.y = y;
        this.simState.vx = 0;
        this.simState.vy = 0;
        this.history = []; // Clear history on teleport to prevent lerping across map
      }
      return this;
  }

  private updateVisuals(dt: number) {
    // Calculate distance between Render Pos and Sim Pos
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.simState.x, this.simState.y);

    // If the distance is huge (teleport/respawn), snap instantly
    if (dist > 200) {
        super.setPosition(this.simState.x, this.simState.y);
    } else {
        // Otherwise, Interpolate (Lerp) for smoothness
        // We use a frame-rate independent lerp formula:
        // a = 1 - pow(f, dt)
        const t = 1 - Math.pow(0.001, dt / 1000); // Tuned for snappy but smooth
        
        const newX = Phaser.Math.Interpolation.Linear([this.x, this.simState.x], t);
        const newY = Phaser.Math.Interpolation.Linear([this.y, this.simState.y], t);
        
        super.setPosition(newX, newY);
    }
    
    // Sync Arcade Body (Hitbox) to Render Position (so collisions look right)
    if (this.body) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.x = this.x - body.halfWidth;
        body.y = this.y - body.halfHeight;
        body.updateCenter();
    }
  }
}
