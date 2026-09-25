import { depthForGroundY } from "../tallProps/groundDepth";
import type { FrontRect } from "./seatLayer";

/**
 * Redraws the furniture under each "front" rectangle as sprites depth-sorted
 * by the rectangle's bottom edge, so a chair back or desk covers a player
 * sitting (or walking) behind it and not one in front. The tiles stay in
 * their layers, hidden, so collision is unchanged.
 */
export function liftFronts(
    scene: Phaser.Scene,
    layers: Map<string, Phaser.Tilemaps.TilemapLayer>,
    fronts: FrontRect[],
) {
    for (const front of fronts) {
        const depth = depthForGroundY(front.y + front.height);
        for (const name of front.layers) {
            const layer = layers.get(name);
            if (!layer) continue;
            // Inset by a pixel so only tiles inside the rectangle are taken
            const tiles = layer.getTilesWithinWorldXY(front.x + 1, front.y + 1, front.width - 2, front.height - 2);
            for (const tile of tiles) {
                const tileset = tile.tileset;
                const key = tileset?.image?.key;
                if (tile.index <= 0 || !tile.visible || tile.rotation || !tileset || !key) continue;
                const texture = scene.textures.get(key);
                const frame = `tile:${tile.index}`;
                if (!texture.has(frame)) {
                    const corner = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number };
                    texture.add(frame, 0, corner.x, corner.y, tileset.tileWidth, tileset.tileHeight);
                }
                const left = tile.getLeft();
                const top = tile.getTop();
                const image = scene.add
                    .image(left, top, key, frame)
                    .setOrigin(0, 0)
                    .setFlip(tile.flipX, tile.flipY)
                    .setDepth(depth);
                const part = frontPart(front, { left, top, right: tile.getRight(), bottom: tile.getBottom() });
                if (part) {
                    // Only part of the tile draws in front (e.g. a band at knee height,
                    // below a sitter's face); the tile itself stays in its layer
                    image.setCrop(part.x, part.y, part.width, part.height);
                } else {
                    tile.setVisible(false);
                }
            }
        }
    }
}

/**
 * The part of a tile (world px) inside a front rectangle, in the tile's own
 * pixels; null when the whole tile is inside.
 */
export function frontPart(
    front: FrontRect,
    tile: { left: number; top: number; right: number; bottom: number },
) {
    const x0 = Math.max(front.x, tile.left);
    const y0 = Math.max(front.y, tile.top);
    const x1 = Math.min(front.x + front.width, tile.right);
    const y1 = Math.min(front.y + front.height, tile.bottom);
    if (x0 === tile.left && y0 === tile.top && x1 === tile.right && y1 === tile.bottom) return null;
    return { x: x0 - tile.left, y: y0 - tile.top, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) };
}
