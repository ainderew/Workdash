/** A tree drawn as one rectangle of the Exterior atlas; its bottom row is the trunk. */
export interface TreeType {
    name: string;
    /** Top-left of the tree in the atlas, in tiles */
    col: number;
    row: number;
    /** Size in tiles */
    w: number;
    h: number;
}

export interface FoundTree {
    type: TreeType;
    /** Top-left tile on the map */
    x: number;
    y: number;
}

const EXTERIOR_COLUMNS = 176;
const EXTERIOR_FIRST_GID = 1;

// Every tree on map1.json's tree layers (see scripts/render-map-preview.swift
// for a picture). Rows above the last are canopy; the last holds the trunk.
export const TREE_TYPES: TreeType[] = [
    { name: "oak", col: 158, row: 9, w: 4, h: 4 },
    { name: "round", col: 57, row: 11, w: 3, h: 4 },
    { name: "pine-tall", col: 166, row: 9, w: 2, h: 4 },
    { name: "pine-medium", col: 164, row: 9, w: 2, h: 4 },
    { name: "pine-small", col: 162, row: 10, w: 2, h: 3 },
    { name: "leafy", col: 150, row: 23, w: 2, h: 3 },
];

export function treeGid(type: TreeType, dx: number, dy: number) {
    return (type.row + dy) * EXTERIOR_COLUMNS + type.col + dx + EXTERIOR_FIRST_GID;
}

/**
 * Finds whole trees in a tile layer. `gids` is the layer row by row; pass
 * anything that must not match (empty, flipped, other tilesets) as -1.
 * Trees never share tiles, so the first match claims its cells.
 */
export function findTrees(
    gids: ArrayLike<number>,
    width: number,
    height: number,
    types: TreeType[] = TREE_TYPES,
): FoundTree[] {
    const byTopLeft = new Map<number, TreeType[]>();
    for (const type of [...types].sort((a, b) => b.w * b.h - a.w * a.h)) {
        const key = treeGid(type, 0, 0);
        byTopLeft.set(key, [...(byTopLeft.get(key) ?? []), type]);
    }

    const claimed = new Set<number>();
    const found: FoundTree[] = [];
    const matches = (type: TreeType, x: number, y: number) => {
        if (x + type.w > width || y + type.h > height) return false;
        for (let dy = 0; dy < type.h; dy++) {
            for (let dx = 0; dx < type.w; dx++) {
                const i = (y + dy) * width + x + dx;
                if (claimed.has(i) || gids[i] !== treeGid(type, dx, dy)) return false;
            }
        }
        return true;
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const candidates = byTopLeft.get(gids[y * width + x]);
            const type = candidates?.find((t) => matches(t, x, y));
            if (!type) continue;
            for (let dy = 0; dy < type.h; dy++) {
                for (let dx = 0; dx < type.w; dx++) claimed.add((y + dy) * width + x + dx);
            }
            found.push({ type, x, y });
        }
    }
    return found;
}
