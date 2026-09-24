import { findTrees } from "./findTrees";
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
 * Lets the trees on the given layers sway in the wind. Each tree's canopy
 * (every row but the trunk) is hidden in the layer and redrawn as one image
 * that leans a pixel either way; the trunk stays put. The layer's tiles keep
 * their collision, so nothing changes for movement.
 */
export function addTreeSway(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    layers: Phaser.Tilemaps.TilemapLayer[],
) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const tileset = map.getTileset("Exterior");
    const textureKey = tileset?.image?.key;
    if (!tileset || !textureKey) return;
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

        // Keep the layers' draw order: each canopy sits right above its layer
        let above: Phaser.GameObjects.GameObject = layer;
        for (const { type, x, y } of findTrees(gids, width, height)) {
            const canopyRows = type.h - 1;
            const frame = `canopy:${type.name}`;
            if (!texture.has(frame)) {
                const corner = tileset.getTileTextureCoordinates(data[y][x].index) as { x: number; y: number };
                texture.add(frame, 0, corner.x, corner.y, type.w * tw, canopyRows * th);
            }
            const baseX = layer.x + x * tw;
            const image = scene.add.image(baseX, layer.y + y * th, textureKey, frame).setOrigin(0, 0);
            scene.children.moveAbove(image, above);
            above = image;
            for (let dy = 0; dy < canopyRows; dy++) {
                for (let dx = 0; dx < type.w; dx++) layer.getTileAt(x + dx, y + dy)?.setVisible(false);
            }
            canopies.push({ image, baseX, phase: treePhase(x, y) });
        }
    }
    if (canopies.length === 0) return;

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
}
