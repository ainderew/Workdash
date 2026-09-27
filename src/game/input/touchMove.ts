/**
 * Walking from the on-screen joystick (phones and tablets). The joystick
 * writes a direction here and the local player reads it alongside the arrow
 * keys and WASD, so a touch walk sends the same four-key input packets the
 * server already simulates.
 */
export interface MoveDirection {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
}

export const NO_DIRECTION: MoveDirection = Object.freeze({
    up: false,
    down: false,
    left: false,
    right: false,
});

/**
 * How strong the weaker axis must be, relative to the stronger one, to count.
 * 0.5 (about 27°) gives straight walks a wider band than a strict 8-way split
 * (22.5°), so a thumb drifting off a straight line down a corridor doesn't
 * turn the walk diagonal.
 */
const DIAGONAL_RATIO = 0.5;

let current: MoveDirection = NO_DIRECTION;

export function setTouchDirection(direction: MoveDirection): void {
    current = direction;
}

export function touchDirection(): MoveDirection {
    return current;
}

/** The direction for a joystick pulled (dx, dy) px from its centre. */
export function directionFromPull(
    dx: number,
    dy: number,
    deadZone: number,
): MoveDirection {
    if (Math.hypot(dx, dy) < deadZone) return NO_DIRECTION;
    const floor = Math.max(Math.abs(dx), Math.abs(dy)) * DIAGONAL_RATIO;
    return {
        up: dy < 0 && -dy >= floor,
        down: dy > 0 && dy >= floor,
        left: dx < 0 && -dx >= floor,
        right: dx > 0 && dx >= floor,
    };
}
