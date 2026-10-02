import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADAM_PATH, AMELIA_LOUNGE, BOB_PATH, FAR_FRIEND, PRIVATE_PAIR } from "./content";
import { along } from "./timeline";

// The film draws sprites on a half-scale render of map1.json (16 px per
// 32 px tile). These layers block players in the game (MainMap.setupCollisions),
// so a sprite walking across one of them is walking through a wall.
const COLLIDES = ["Wall", "Furniture", "Trees", "Trees2"];
const HALF_TILE = 16;

interface Layer {
    name: string;
    type: string;
    data?: number[];
    objects?: Array<{ name: string; x: number; y: number; width: number; height: number }>;
}

const map = JSON.parse(readFileSync(join(process.cwd(), "public/assets/map1.json"), "utf8")) as {
    width: number;
    layers: Layer[];
};
const blocking = map.layers.filter((l) => l.type === "tilelayer" && COLLIDES.includes(l.name));
const zones = map.layers.find((l) => l.name === "AudioZones")?.objects ?? [];

/** The voice zone a half-scale point is in, as the game decides it (any rect with that name). */
function zoneAt(px: number, py: number): string | null {
    const hit = zones.find((z) => px * 2 >= z.x && px * 2 < z.x + z.width && py * 2 >= z.y && py * 2 < z.y + z.height);
    return hit?.name ?? null;
}

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

const sample = (path: ReadonlyArray<readonly [number, number]>) =>
    Array.from({ length: 201 }, (_, i) => along(path, i / 200));

describe("walk-in sprite paths", () => {
    it("has the collision layers it checks against", () => {
        expect(blocking.map((l) => l.name).sort()).toEqual([...COLLIDES].sort());
    });

    it("turns to face the way each leg of the route goes", () => {
        expect(along(BOB_PATH, 0.05)[2]).toBe("left");
        expect(along(BOB_PATH, 0.9)[2]).toBe("down");
        expect(along(BOB_PATH, 1).slice(0, 2)).toEqual([...BOB_PATH[BOB_PATH.length - 1]]);
    });

    it("walks Adam to the lounge without crossing anything solid", () => {
        for (const [x, y] of sample(ADAM_PATH)) {
            for (const [fx, fy] of feet(x, y)) expect(solidAt(fx, fy), `Adam blocked at (${fx}, ${fy})`).toBe(false);
        }
    });

    it("only shows someone in a room's voice while they stand inside that zone", () => {
        const inMain: Array<readonly [number, number]> = [
            ...sample(ADAM_PATH).map(([x, y]) => [x, y] as const),
            AMELIA_LOUNGE,
            FAR_FRIEND,
            BOB_PATH[0],
        ];
        for (const [x, y] of inMain) expect(zoneAt(x + 8, y + 30), `(${x}, ${y})`).toBe("main_office");
        const inPrivate = [...PRIVATE_PAIR.map(([x, y]) => [x, y] as const), BOB_PATH[BOB_PATH.length - 1]];
        for (const [x, y] of inPrivate) expect(zoneAt(x + 8, y + 30), `(${x}, ${y})`).toBe("private_office");
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
