export const PHYSICS_CONSTANTS = {
  DRAG: 1, // exponential drag v(t) = v0 * e^(-DRAG * t)
  BOUNCE: 0.7,
  BALL_RADIUS: 30,
  WORLD_WIDTH: 3520,
  WORLD_HEIGHT: 1600,
  // 60Hz Fixed Timestep
  FIXED_TIMESTEP_MS: 16.666,
  FIXED_TIMESTEP_SEC: 16.666 / 1000,
};

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function integrateBall(state: PhysicsState, dt: number): void {
  // 1. Drag (Exponential, frame-rate independent)
  const dragFactor = Math.exp(-PHYSICS_CONSTANTS.DRAG * dt);
  state.vx *= dragFactor;
  state.vy *= dragFactor;

  // 2. Movement
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  // 3. Wall Collisions
  // Left
  if (state.x - PHYSICS_CONSTANTS.BALL_RADIUS < 0) {
    state.x = PHYSICS_CONSTANTS.BALL_RADIUS;
    state.vx = -state.vx * PHYSICS_CONSTANTS.BOUNCE;
  }
  // Right
  else if (
    state.x + PHYSICS_CONSTANTS.BALL_RADIUS >
    PHYSICS_CONSTANTS.WORLD_WIDTH
  ) {
    state.x = PHYSICS_CONSTANTS.WORLD_WIDTH - PHYSICS_CONSTANTS.BALL_RADIUS;
    state.vx = -state.vx * PHYSICS_CONSTANTS.BOUNCE;
  }

  // Top
  if (state.y - PHYSICS_CONSTANTS.BALL_RADIUS < 0) {
    state.y = PHYSICS_CONSTANTS.BALL_RADIUS;
    state.vy = -state.vy * PHYSICS_CONSTANTS.BOUNCE;
  }
  // Bottom
  else if (
    state.y + PHYSICS_CONSTANTS.BALL_RADIUS >
    PHYSICS_CONSTANTS.WORLD_HEIGHT
  ) {
    state.y = PHYSICS_CONSTANTS.WORLD_HEIGHT - PHYSICS_CONSTANTS.BALL_RADIUS;
    state.vy = -state.vy * PHYSICS_CONSTANTS.BOUNCE;
  }
}
