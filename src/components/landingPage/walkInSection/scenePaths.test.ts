import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOB_PATH } from "./content";
import { along } from "./timeline";

// The film draws sprites on a half-scale render of map1.json (16 px per
// 32 px tile). These layers block players in the game (MainMap.setupCollisions),
// so a sprite walking across one of them is walking through a wall.
const COLLIDES = ["Wall", "Furniture", "Trees", "Trees2"];
const HALF_TILE = 16;

interface TileLayer {
    name: string;
    type: string;
    data?: number[];
}

const map = JSON.parse(readFileSync(join(process.cwd(), "public/assets/map1.json"), "utf8")) as {
    width: number;
    layers: TileLayer[];
};
const blocking = map.layers.filter((l) => l.type === "tilelayer" && COLLIDES.includes(l.name));

function solidAt(px: number, py: number): boolean {
    const tx = Math.floor(px / HALF_TILE);
    const ty = Math.floor(py / HALF_TILE);
    return blocking.some((l) => (l.data?.[ty * map.width + tx] ?? 0) !== 0);
}

/** Where a 16×32 walk sprite at (x, y) touches the floor: both sides of its feet. */
function feet(x: number, y: number): Array<[number, number]> {
    return [
        [x + 3, y + 30],
        [x + 13, y + 30],
    ];
}

describe("walk-in sprite paths", () => {
    it("has the collision layers it checks against", () => {
        expect(blocking.map((l) => l.name).sort()).toEqual([...COLLIDES].sort());
    });

    it("turns to face the way each leg of the route goes", () => {
        expect(along(BOB_PATH, 0.05)[2]).toBe("left");
        expect(along(BOB_PATH, 0.9)[2]).toBe("down");
        expect(along(BOB_PATH, 1).slice(0, 2)).toEqual([...BOB_PATH[BOB_PATH.length - 1]]);
    });

    it("walks Bob into the glass room through the door, not the wall", () => {
        for (let k = 0; k <= 1; k += 0.005) {
            const [x, y] = along(BOB_PATH, k);
            for (const [fx, fy] of feet(x, y)) {
                expect(solidAt(fx, fy), `blocked at k=${k.toFixed(3)} (${fx}, ${fy})`).toBe(false);
            }
        }
    });
});
