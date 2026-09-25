/**
 * A tall prop drawn as one rectangle of the Exterior atlas. Its bottom row is
 * where it meets the ground (trunk, pot, planter box) and is the only solid
 * part; the rows above can be walked behind.
 */
export interface TallPropType {
    name: string;
    /** Top-left of the prop in the atlas, in tiles */
    col: number;
    row: number;
    /** Size in tiles */
    w: number;
    h: number;
    /** Leans in the wind */
    sway: boolean;
}

export interface FoundProp {
    type: TallPropType;
    /** Top-left tile on the map */
    x: number;
    y: number;
}

const EXTERIOR_COLUMNS = 176;
const EXTERIOR_FIRST_GID = 1;

// Every tree, planter and bush on map1.json's tree layers.
export const TALL_PROPS: TallPropType[] = [
    { name: "oak", col: 158, row: 9, w: 4, h: 4, sway: true },
    { name: "round", col: 57, row: 11, w: 3, h: 4, sway: true },
    { name: "pine-tall", col: 166, row: 9, w: 2, h: 4, sway: true },
    { name: "pine-medium", col: 164, row: 9, w: 2, h: 4, sway: true },
    { name: "pine-small", col: 162, row: 10, w: 2, h: 3, sway: true },
    { name: "leafy", col: 150, row: 23, w: 2, h: 3, sway: true },
    { name: "planter", col: 15, row: 10, w: 3, h: 3, sway: false },
    { name: "box-hedge", col: 11, row: 11, w: 2, h: 2, sway: false },
    { name: "round-bush", col: 115, row: 125, w: 2, h: 2, sway: false },
    { name: "potted-cypress", col: 56, row: 13, w: 1, h: 2, sway: false },
];

export function propGid(type: TallPropType, dx: number, dy: number) {
    return (type.row + dy) * EXTERIOR_COLUMNS + type.col + dx + EXTERIOR_FIRST_GID;
}

/**
 * Finds whole tall props in a tile layer. `gids` is the layer row by row;
 * pass anything that must not match (empty, flipped, other tilesets) as -1.
 * Props never share tiles, so the first match claims its cells.
 */
export function findTallProps(
    gids: ArrayLike<number>,
    width: number,
    height: number,
    types: TallPropType[] = TALL_PROPS,
): FoundProp[] {
    const byTopLeft = new Map<number, TallPropType[]>();
    for (const type of [...types].sort((a, b) => b.w * b.h - a.w * a.h)) {
        const key = propGid(type, 0, 0);
        byTopLeft.set(key, [...(byTopLeft.get(key) ?? []), type]);
    }

    const claimed = new Set<number>();
    const found: FoundProp[] = [];
    const matches = (type: TallPropType, x: number, y: number) => {
        if (x + type.w > width || y + type.h > height) return false;
        for (let dy = 0; dy < type.h; dy++) {
            for (let dx = 0; dx < type.w; dx++) {
                const i = (y + dy) * width + x + dx;
                if (claimed.has(i) || gids[i] !== propGid(type, dx, dy)) return false;
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
