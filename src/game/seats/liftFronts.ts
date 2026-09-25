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
                scene.add
                    .image(tile.getLeft(), tile.getTop(), key, frame)
                    .setOrigin(0, 0)
                    .setFlip(tile.flipX, tile.flipY)
                    .setDepth(depth);
                tile.setVisible(false);
            }
        }
    }
}
