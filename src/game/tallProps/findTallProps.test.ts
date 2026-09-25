import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { TALL_PROPS, findTallProps, propGid, type TallPropType } from "./findTallProps";
import { depthForGroundY } from "./groundDepth";
import { swayOffset, treePhase, SWAY_PERIOD_MS } from "./wind";

const byName = (name: string) => TALL_PROPS.find((t) => t.name === name) as TallPropType;

function grid(width: number, height: number) {
    return new Array<number>(width * height).fill(-1);
}

function plant(gids: number[], width: number, type: TallPropType, x: number, y: number) {
    for (let dy = 0; dy < type.h; dy++) {
        for (let dx = 0; dx < type.w; dx++) gids[(y + dy) * width + x + dx] = propGid(type, dx, dy);
    }
}

describe("findTallProps", () => {
    it("finds whole props of each kind where they stand", () => {
        const gids = grid(12, 6);
        plant(gids, 12, byName("oak"), 0, 0);
        plant(gids, 12, byName("pine-small"), 5, 2);
        plant(gids, 12, byName("planter"), 8, 1);

        const found = findTallProps(gids, 12, 6).map((t) => [t.type.name, t.x, t.y]);

        expect(found).toEqual([
            ["oak", 0, 0],
            ["planter", 8, 1],
            ["pine-small", 5, 2],
        ]);
    });

    it("leaves a prop that is cut off or has a stray tile alone", () => {
        const gids = grid(8, 8);
        const pine = byName("pine-medium");
        plant(gids, 8, pine, 0, 0);
        gids[3 * 8 + 1] = -1; // trunk tile missing
        plant(gids, 8, pine, 5, 5); // runs off the bottom edge

        expect(findTallProps(gids, 8, 8)).toEqual([]);
    });

    it("finds every tree, planter and bush on the real map, none cut off", () => {
        const map = JSON.parse(
            readFileSync(resolve(__dirname, "../../../public/assets/map1.json"), "utf8"),
        );
        const layer = (name: string) =>
            map.layers.find((l: { name: string }) => l.name === name).data as number[];
        const propArt = new Set(
            TALL_PROPS.flatMap((t) => Array.from({ length: t.w * t.h }, (_, i) => propGid(t, i % t.w, Math.floor(i / t.w)))),
        );

        const counts: Record<string, number> = {};
        for (const name of ["Trees", "Trees2"]) {
            const found = findTallProps(layer(name), map.width, map.height);
            found.forEach(({ type }) => (counts[type.name] = (counts[type.name] ?? 0) + 1));
            const covered = new Set(
                found.flatMap(({ type, x, y }) =>
                    Array.from({ length: type.w * type.h }, (_, i) => (y + Math.floor(i / type.w)) * map.width + x + (i % type.w)),
                ),
            );
            const stray = layer(name).flatMap((gid, i) => (propArt.has(gid) && !covered.has(i) ? [i] : []));
            expect(stray, `${name} has partial props at cells ${stray.slice(0, 5)}`).toEqual([]);
        }
        expect(counts).toMatchObject({ planter: 4, "box-hedge": 1, "round-bush": 2, "potted-cypress": 2, leafy: 4 });
        const trees = TALL_PROPS.filter((t) => t.sway).reduce((n, t) => n + (counts[t.name] ?? 0), 0);
        expect(trees).toBeGreaterThan(250);
    });
});

describe("depthForGroundY", () => {
    it("draws whatever stands further south in front", () => {
        const treeBase = 2144;
        expect(depthForGroundY(treeBase - 32)).toBeLessThan(depthForGroundY(treeBase)); // player behind
        expect(depthForGroundY(treeBase + 12)).toBeGreaterThan(depthForGroundY(treeBase)); // player in front
    });

    it("stays above the tile layers and below doors across the whole world", () => {
        expect(depthForGroundY(0)).toBeGreaterThan(0);
        expect(depthForGroundY(3520)).toBeLessThan(100);
    });
});

describe("wind", () => {
    it("leans a canopy at most one pixel either way and comes back", () => {
        const offsets = Array.from({ length: 34 }, (_, i) => swayOffset(i * 100, 0));
        expect(new Set(offsets)).toEqual(new Set([-1, 0, 1]));
        expect(swayOffset(SWAY_PERIOD_MS * 3, 1.2)).toBe(swayOffset(0, 1.2));
    });

    it("gives neighbouring trees different timing so gusts roll across", () => {
        expect(treePhase(10, 10)).not.toBe(treePhase(11, 10));
        expect(treePhase(10, 10)).toBe(treePhase(10, 10));
    });
});
