export type BallStateUpdate = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    lastTouchId: string | null;
    timestamp: number;
    sequence?: number;
};

export type BallKickedEvent = {
    kickerId: string;
    kickPower: number;
    ballX: number;
    ballY: number;
};
