import { findTallProps } from "./findTallProps";
import { depthForGroundY } from "./groundDepth";
import { swayOffset, treePhase } from "./wind";

const TICK_MS = 100;
/** Canopies this far outside the camera still update, so none pop at the edge. */
const VIEW_MARGIN_PX = 128;

interface Canopy {
    image: Phaser.GameObjects.Image;
    baseX: number;
    phase: number;
}

/**
 * Makes trees, planters and bushes on the given layers something you can walk
 * behind. Each prop's upper rows are hidden in the layer and redrawn as one
 * image, depth-sorted against players by where the prop meets the ground, so
 * it covers a player standing behind it and not one in front. Trees also sway
 * in the wind (a pixel either way; off under prefers-reduced-motion).
 *
 * Returns the hidden upper tiles: they don't block movement, only the prop's
 * bottom row does.
 */
export function addTallProps(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    layers: Phaser.Tilemaps.TilemapLayer[],
): Set<Phaser.Tilemaps.Tile> {
    const walkBehind = new Set<Phaser.Tilemaps.Tile>();
    const tileset = map.getTileset("Exterior");
    const textureKey = tileset?.image?.key;
    if (!tileset || !textureKey) return walkBehind;
    const texture = scene.textures.get(textureKey);
    const { tileWidth: tw, tileHeight: th } = map;

    const canopies: Canopy[] = [];
    for (const layer of layers) {
        const { width, height, data } = layer.layer;
        const gids = new Array<number>(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = data[y][x];
                const plain = tile && tile.index > 0 && !tile.flipX && !tile.flipY && !tile.rotation;
                gids[y * width + x] = plain && tile.tileset === tileset ? tile.index : -1;
            }
        }

        for (const { type, x, y } of findTallProps(gids, width, height)) {
            const upperRows = type.h - 1;
            const frame = `upper:${type.name}`;
            if (!texture.has(frame)) {
                const corner = tileset.getTileTextureCoordinates(data[y][x].index) as { x: number; y: number };
                texture.add(frame, 0, corner.x, corner.y, type.w * tw, upperRows * th);
            }
            const baseX = layer.x + x * tw;
            const groundY = layer.y + (y + type.h) * th;
            const image = scene.add
                .image(baseX, layer.y + y * th, textureKey, frame)
                .setOrigin(0, 0)
                .setDepth(depthForGroundY(groundY));
            for (let dy = 0; dy < upperRows; dy++) {
                for (let dx = 0; dx < type.w; dx++) {
                    const tile = layer.getTileAt(x + dx, y + dy);
                    if (!tile) continue;
                    tile.setVisible(false);
                    walkBehind.add(tile);
                }
            }
            if (type.sway) canopies.push({ image, baseX, phase: treePhase(x, y) });
        }
    }

    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (canopies.length === 0 || still) return walkBehind;

    // The scene clock stops with the scene, so desk mode costs nothing
    scene.time.addEvent({
        delay: TICK_MS,
        loop: true,
        callback: () => {
            const view = scene.cameras.main.worldView;
            const now = scene.time.now;
            for (const { image, baseX, phase } of canopies) {
                if (
                    baseX > view.right + VIEW_MARGIN_PX ||
                    baseX + image.width < view.x - VIEW_MARGIN_PX ||
                    image.y > view.bottom + VIEW_MARGIN_PX ||
                    image.y + image.height < view.y - VIEW_MARGIN_PX
                ) {
                    continue;
                }
                const x = baseX + swayOffset(now, phase);
                if (image.x !== x) image.x = x;
            }
        },
    });
    return walkBehind;
}
