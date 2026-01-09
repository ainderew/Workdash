export const SoccerPhysics = {
    // World
    DRAG: 1,
    BOUNCE: 0.7,
    BALL_RADIUS: 30,
    PLAYER_RADIUS: 30,
    WORLD_WIDTH: 3520,
    WORLD_HEIGHT: 1600,

    // Timing
    PHYSICS_RATE_MS: 16.66, // 60Hz
    NETWORK_RATE_MS: 16, // High frequency updates

    // Thresholds
    VELOCITY_THRESHOLD: 10,
    KICK_COOLDOWN_MS: 300,
    MAX_DRIBBLE_DISTANCE: 300,

    // Forces
    PUSH_DAMPING: 1.5,
    BALL_KNOCKBACK: 0.6,
    KICK_KNOCKBACK: 400,
    BASE_KICK_POWER: 1000,

    // Player Movement (Standardized)
    BASE_MOVE_SPEED: 600,
    BASE_ACCEL: 1600,
    MAX_SPEED: 600,
};
