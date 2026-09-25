import type { Rect } from "./wallCollision";

/** Pixels at least this opaque count as part of a prop (the art's alpha is all-or-nothing). */
const MIN_ALPHA = 128;

/**
 * Bounds of a tile's drawn pixels, in tile-local px (right/bottom exclusive),
 * or null when the tile draws nothing. `rgba` is the tile's pixels row by row.
 */
export function opaqueBounds(rgba: ArrayLike<number>, width: number, height: number): Rect | null {
    let left = width;
    let top = height;
    let right = 0;
    let bottom = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (rgba[(y * width + x) * 4 + 3] < MIN_ALPHA) continue;
            if (x < left) left = x;
            if (x + 1 > right) right = x + 1;
            if (y < top) top = y;
            if (y + 1 > bottom) bottom = y + 1;
        }
    }
    return right === 0 ? null : { left, top, right, bottom };
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

/** Measures, once per tile kind, which part of a tile's art is actually drawn. */
export class TileFootprintCache {
    private bounds = new Map<string, Rect | null>();
    private ctx: CanvasRenderingContext2D | null = null;

    /** Drawn bounds in tileset px; null if the tile draws nothing; undefined if it can't be measured. */
    boundsOf(tile: Phaser.Tilemaps.Tile): Rect | null | undefined {
        const tileset = tile.tileset;
        if (!tileset) return undefined;
        const key = `${tileset.name}:${tile.index}`;
        if (this.bounds.has(key)) return this.bounds.get(key);

        const source = tileset.image?.getSourceImage() as CanvasImageSource | undefined;
        const corner = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number } | null;
        const { tileWidth: w, tileHeight: h } = tileset;
        if (!source || !corner) return undefined;
        if (!this.ctx) {
            this.ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
            if (!this.ctx) return undefined;
        }
        const ctx = this.ctx;
        if (ctx.canvas.width !== w || ctx.canvas.height !== h) {
            ctx.canvas.width = w;
            ctx.canvas.height = h;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(source, corner.x, corner.y, w, h, 0, 0, w, h);
        const measured = opaqueBounds(ctx.getImageData(0, 0, w, h).data, w, h);
        this.bounds.set(key, measured);
        return measured;
    }
}
