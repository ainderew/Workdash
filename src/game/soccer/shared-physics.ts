

export const PHYSICS_CONSTANTS = {
  
  BALL_DRAG: 1, 
  BALL_BOUNCE: 0.7, 
  BALL_RADIUS: 30,

  
  PLAYER_DRAG: 4.5, 
  PLAYER_ACCEL: 2600, 
  PLAYER_MAX_SPEED: 600, 
  PLAYER_RADIUS: 30,

  
  WORLD_WIDTH: 3520,
  WORLD_HEIGHT: 1600,

  
  FIXED_TIMESTEP_MS: 16, 
  FIXED_TIMESTEP_SEC: 0.016, 

  
  NETWORK_TICK_MS: 16, 

  
  VELOCITY_STOP_THRESHOLD: 10, 
  POSITION_SNAP_THRESHOLD: 280, 
  POSITION_CORRECT_THRESHOLD: 14, 
  VELOCITY_CORRECT_THRESHOLD: 60, 
} as const;


export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface BallState extends PhysicsState {
  sequence: number; 
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


export function integrateBall(state: PhysicsState, dt: number): void {
  const { BALL_DRAG, BALL_BOUNCE, BALL_RADIUS, WORLD_WIDTH, WORLD_HEIGHT } =
    PHYSICS_CONSTANTS;

  
  
  const dragFactor = Math.exp(-BALL_DRAG * dt);
  state.vx *= dragFactor;
  state.vy *= dragFactor;

  
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  

  
  if (state.x < BALL_RADIUS) {
    state.x = BALL_RADIUS;
    state.vx = Math.abs(state.vx) * BALL_BOUNCE;
  }

  
  if (state.x > WORLD_WIDTH - BALL_RADIUS) {
    state.x = WORLD_WIDTH - BALL_RADIUS;
    state.vx = -Math.abs(state.vx) * BALL_BOUNCE;
  }

  
  if (state.y < BALL_RADIUS) {
    state.y = BALL_RADIUS;
    state.vy = Math.abs(state.vy) * BALL_BOUNCE;
  }

  
  if (state.y > WORLD_HEIGHT - BALL_RADIUS) {
    state.y = WORLD_HEIGHT - BALL_RADIUS;
    state.vy = -Math.abs(state.vy) * BALL_BOUNCE;
  }
}


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

  
  if (input.up) state.vy -= accel * dt;
  if (input.down) state.vy += accel * dt;
  if (input.left) state.vx -= accel * dt;
  if (input.right) state.vx += accel * dt;

  
  const effectiveDrag = PLAYER_DRAG * dragMultiplier;
  const dragFactor = Math.exp(-effectiveDrag * dt);
  state.vx *= dragFactor;
  state.vy *= dragFactor;

  
  const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    state.vx *= scale;
    state.vy *= scale;
  }

  
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  
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


export function calculateSpeedMultiplier(speedStat: number): number {
  return 1.0 + speedStat * 0.1;
}

export function calculateKickPowerMultiplier(kickPowerStat: number): number {
  return 1.0 + kickPowerStat * 0.1;
}

export function calculateDragMultiplier(dribblingStat: number): number {
  
  return Math.max(0.5, 1.0 - dribblingStat * 0.05);
}


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
