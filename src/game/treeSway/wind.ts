/** How far a canopy leans either way, in world pixels (1 keeps the pixel art crisp). */
export const SWAY_PX = 1;
/** One full lean left and right. */
export const SWAY_PERIOD_MS = 3400;

/**
 * Phase for the tree at tile (x, y). Neighbours are offset along a diagonal,
 * so gusts roll across the forest instead of every tree moving in lockstep;
 * a small per-tree jitter keeps rows from looking combed.
 */
export function treePhase(x: number, y: number) {
    const jitter = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000;
    return x * 0.5 - y * 0.18 + (jitter / 1000) * 0.8;
}

/** Canopy offset in whole pixels: rests centred, leans left, leans right. */
export function swayOffset(timeMs: number, phase: number) {
    return Math.round(Math.sin((timeMs / SWAY_PERIOD_MS) * Math.PI * 2 + phase) * SWAY_PX);
}
