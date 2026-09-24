/** Axis-aligned box in world pixels. */
export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** A scene that can report the solid (colliding) tiles inside a box. */
export interface SolidMap {
    getSolidRects(area: Rect): Rect[];
}

/** The player's collision box when its sprite centre is at (x, y). */
export type FeetBoxAt = (x: number, y: number) => Rect;

const overlaps = (a: Rect, b: Rect) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function stepAxis(
    x: number,
    y: number,
    delta: number,
    axis: "x" | "y",
    feetAt: FeetBoxAt,
    solidsIn: (area: Rect) => Rect[],
): { x: number; y: number; blocked: boolean } {
    if (delta === 0) return { x, y, blocked: false };

    const before = feetAt(x, y);
    const after = axis === "x" ? feetAt(x + delta, y) : feetAt(x, y + delta);
    // Solids the feet already overlap don't block, so a player saved inside a
    // wall can still walk out of it.
    const hits = solidsIn(after).filter((s) => overlaps(after, s) && !overlaps(before, s));
    if (hits.length === 0) {
        return axis === "x"
            ? { x: x + delta, y, blocked: false }
            : { x, y: y + delta, blocked: false };
    }

    // Stop flush against the nearest solid in the direction of travel
    let allowed: number;
    if (axis === "x") {
        allowed = delta > 0
            ? Math.min(...hits.map((s) => s.left)) - before.right
            : Math.max(...hits.map((s) => s.right)) - before.left;
    } else {
        allowed = delta > 0
            ? Math.min(...hits.map((s) => s.top)) - before.bottom
            : Math.max(...hits.map((s) => s.bottom)) - before.top;
    }
    allowed = delta > 0 ? Math.max(0, Math.min(allowed, delta)) : Math.min(0, Math.max(allowed, delta));

    return axis === "x"
        ? { x: x + allowed, y, blocked: true }
        : { x, y: y + allowed, blocked: true };
}

/**
 * Move from (x, y) by (dx, dy) without entering solid tiles. Each axis is
 * resolved separately so the player slides along a wall instead of sticking
 * to it when moving diagonally.
 */
export function moveWithCollisions(
    x: number,
    y: number,
    dx: number,
    dy: number,
    feetAt: FeetBoxAt,
    solidsIn: (area: Rect) => Rect[],
): { x: number; y: number; blockedX: boolean; blockedY: boolean } {
    const stepX = stepAxis(x, y, dx, "x", feetAt, solidsIn);
    const stepY = stepAxis(stepX.x, stepX.y, dy, "y", feetAt, solidsIn);
    return { x: stepY.x, y: stepY.y, blockedX: stepX.blocked, blockedY: stepY.blocked };
}
