import type { Rect } from "./wallCollision";
import footprintData from "./propFootprints.json";

/**
 * Drawn part of each prop tile, in tile px, keyed by gid; null = draws nothing.
 * Measured ahead of time by scripts/build-prop-footprints.swift, because
 * reading pixels from the huge exterior tileset in the browser stalls the game.
 */
const FOOTPRINTS: Record<string, number[] | null> = footprintData;

/** A prop tile's drawn bounds; null if it draws nothing; undefined if never measured. */
export function propFootprint(gid: number): Rect | null | undefined {
    const bounds = FOOTPRINTS[gid];
    if (bounds === undefined) return undefined;
    if (bounds === null) return null;
    const [left, top, right, bottom] = bounds;
    return { left, top, right, bottom };
}

/**
 * The solid part of a placed tile in world px: its drawn pixels, scaled from
 * the tileset's tile size to the tile's world size and mirrored when flipped.
 */
export function footprintRect(
    tile: Rect,
    local: Rect,
    tileSize: { width: number; height: number },
    flip: { x: boolean; y: boolean },
): Rect {
    const sx = (tile.right - tile.left) / tileSize.width;
    const sy = (tile.bottom - tile.top) / tileSize.height;
    const [l, r] = flip.x ? [tileSize.width - local.right, tileSize.width - local.left] : [local.left, local.right];
    const [t, b] = flip.y ? [tileSize.height - local.bottom, tileSize.height - local.top] : [local.top, local.bottom];
    return {
        left: tile.left + l * sx,
        right: tile.left + r * sx,
        top: tile.top + t * sy,
        bottom: tile.top + b * sy,
    };
}

