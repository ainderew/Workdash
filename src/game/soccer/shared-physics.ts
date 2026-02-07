/**
 * shared-physics.ts
 *
 * CRITICAL: This file MUST be byte-for-byte identical on client and server.
 * Any difference will cause desync.
 *
 * Copy this file to:
 * - Server: /server/src/services/shared-physics.ts (or .js)
 * - Client: /client/src/game/soccer/shared-physics.ts
 */

export const PHYSICS_CONSTANTS = {
  // Ball physics
  BALL_DRAG: 1, // Exponential drag coefficient
  BALL_BOUNCE: 0.7, // Wall bounce retention
  BALL_RADIUS: 30,

  // Player physics
  PLAYER_DRAG: 4, // Higher = snappier stops
  PLAYER_ACCEL: 1600, // Base acceleration
  PLAYER_MAX_SPEED: 600, // Base max speed
  PLAYER_RADIUS: 30,

  // World
  WORLD_WIDTH: 3520,
  WORLD_HEIGHT: 1600,

  // Timing - USE INTEGERS to prevent floating point drift
  FIXED_TIMESTEP_MS: 16, // ~62.5 Hz (close to 60Hz but integer)
  FIXED_TIMESTEP_SEC: 0.016, // Exactly 16/1000

  // Network
  NETWORK_TICK_MS: 25, // 40 Hz broadcast rate

  // Thresholds
  VELOCITY_STOP_THRESHOLD: 10, // Ball considered stopped below this
  POSITION_SNAP_THRESHOLD: 200, // Teleport if error exceeds this
  POSITION_CORRECT_THRESHOLD: 10, // Ignore errors below this
  VELOCITY_CORRECT_THRESHOLD: 40, // Ignore velocity errors below this
} as const;

// Type definitions
export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface BallState extends PhysicsState {
  sequence: number; // Incremented on every kick/touch (server authoritative)
  lastTouchId: string | null;
  lastTouchTimestamp: number;
  isMoving: boolean;
}

export interface PlayerPhysicsInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Deterministic ball physics integration.
 *
 * @param state - Ball physics state (mutated in place)
 * @param dt - Delta time in SECONDS
 */
export function integrateBall(state: PhysicsState, dt: number): void {
  const { BALL_DRAG, BALL_BOUNCE, BALL_RADIUS, WORLD_WIDTH, WORLD_HEIGHT } =
    PHYSICS_CONSTANTS;

  // 1. Apply exponential drag (frame-rate independent)
  // v(t) = v0 * e^(-drag * t)
  const dragFactor = Math.exp(-BALL_DRAG * dt);
  state.vx *= dragFactor;
  state.vy *= dragFactor;

  // 2. Integrate position
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  // 3. Wall collisions (order matters for determinism - always check in same order)

  // Left wall
  if (state.x < BALL_RADIUS) {
    state.x = BALL_RADIUS;
    state.vx = Math.abs(state.vx) * BALL_BOUNCE;
  }

  // Right wall
  if (state.x > WORLD_WIDTH - BALL_RADIUS) {
    state.x = WORLD_WIDTH - BALL_RADIUS;
    state.vx = -Math.abs(state.vx) * BALL_BOUNCE;
  }

  // Top wall
  if (state.y < BALL_RADIUS) {
    state.y = BALL_RADIUS;
    state.vy = Math.abs(state.vy) * BALL_BOUNCE;
  }

  // Bottom wall
  if (state.y > WORLD_HEIGHT - BALL_RADIUS) {
    state.y = WORLD_HEIGHT - BALL_RADIUS;
    state.vy = -Math.abs(state.vy) * BALL_BOUNCE;
  }
}

/**
 * Deterministic player physics integration.
 *
 * @param state - Player physics state (mutated in place)
 * @param input - Current input state
 * @param dt - Delta time in SECONDS
 * @param dragMultiplier - From dribbling stat (1.0 = normal, 0.5 = half drag)
 * @param speedMultiplier - From speed stat (1.0 = normal, 2.0 = double)
 */
export function integratePlayer(
  state: PhysicsState,
  input: PlayerPhysicsInput,
  dt: number,
  dragMultiplier: number = 1.0,
  speedMultiplier: number = 1.0,
): void {
  const {
    PLAYER_DRAG,
    PLAYER_ACCEL,
    PLAYER_MAX_SPEED,
    PLAYER_RADIUS,
    WORLD_WIDTH,
    WORLD_HEIGHT,
  } = PHYSICS_CONSTANTS;

  const accel = PLAYER_ACCEL * speedMultiplier;
  const maxSpeed = PLAYER_MAX_SPEED * speedMultiplier;

  // 1. Apply acceleration from input
  if (input.up) state.vy -= accel * dt;
  if (input.down) state.vy += accel * dt;
  if (input.left) state.vx -= accel * dt;
  if (input.right) state.vx += accel * dt;

  // 2. Apply exponential drag
  const effectiveDrag = PLAYER_DRAG * dragMultiplier;
  const dragFactor = Math.exp(-effectiveDrag * dt);
  state.vx *= dragFactor;
  state.vy *= dragFactor;

  // 3. Clamp to max speed
  const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    state.vx *= scale;
    state.vy *= scale;
  }

  // 4. Integrate position
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  // 5. World boundary clamping
  if (state.x < PLAYER_RADIUS) {
    state.x = PLAYER_RADIUS;
    state.vx = 0;
  }
  if (state.x > WORLD_WIDTH - PLAYER_RADIUS) {
    state.x = WORLD_WIDTH - PLAYER_RADIUS;
    state.vx = 0;
  }
  if (state.y < PLAYER_RADIUS) {
    state.y = PLAYER_RADIUS;
    state.vy = 0;
  }
  if (state.y > WORLD_HEIGHT - PLAYER_RADIUS) {
    state.y = WORLD_HEIGHT - PLAYER_RADIUS;
    state.vy = 0;
  }
}

/**
 * Calculate stat multipliers consistently.
 * Use this on BOTH client and server to ensure same calculation.
 */
export function calculateSpeedMultiplier(speedStat: number): number {
  return 1.0 + speedStat * 0.1;
}

export function calculateKickPowerMultiplier(kickPowerStat: number): number {
  return 1.0 + kickPowerStat * 0.1;
}

export function calculateDragMultiplier(dribblingStat: number): number {
  // Higher dribbling = lower drag = faster direction changes
  return Math.max(0.5, 1.0 - dribblingStat * 0.05);
}

/**
 * Calculate final kick velocity.
 * IMPORTANT: Use this on both client (for prediction) and server (for authority).
 */
export function calculateKickVelocity(
  angle: number,
  basePower: number,
  kickPowerStat: number,
  hasMetavision: boolean = false,
): { vx: number; vy: number } {
  let multiplier = calculateKickPowerMultiplier(kickPowerStat);

  if (hasMetavision) {
    multiplier *= 1.2;
  }

  const power = basePower * multiplier;

  return {
    vx: Math.cos(angle) * power,
    vy: Math.sin(angle) * power,
  };
}
