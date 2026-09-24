import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { TREE_TYPES, findTrees, treeGid, type TreeType } from "./findTrees";
import { swayOffset, treePhase, SWAY_PERIOD_MS } from "./wind";

const byName = (name: string) => TREE_TYPES.find((t) => t.name === name) as TreeType;

function grid(width: number, height: number) {
    return new Array<number>(width * height).fill(-1);
}

function plant(gids: number[], width: number, type: TreeType, x: number, y: number) {
    for (let dy = 0; dy < type.h; dy++) {
        for (let dx = 0; dx < type.w; dx++) gids[(y + dy) * width + x + dx] = treeGid(type, dx, dy);
    }
}

describe("findTrees", () => {
    it("finds whole trees of each kind where they stand", () => {
        const gids = grid(12, 6);
        plant(gids, 12, byName("oak"), 0, 0);
        plant(gids, 12, byName("pine-small"), 5, 2);
        plant(gids, 12, byName("round"), 8, 1);

        const found = findTrees(gids, 12, 6).map((t) => [t.type.name, t.x, t.y]);

        expect(found).toEqual([
            ["oak", 0, 0],
            ["round", 8, 1],
            ["pine-small", 5, 2],
        ]);
    });

    it("leaves a tree that is cut off or has a stray tile alone", () => {
        const gids = grid(8, 8);
        const pine = byName("pine-medium");
        plant(gids, 8, pine, 0, 0);
        gids[3 * 8 + 1] = -1; // trunk tile missing
        plant(gids, 8, pine, 5, 5); // runs off the bottom edge

        expect(findTrees(gids, 8, 8)).toEqual([]);
    });

    it("finds every tree on the real map, and no tree is left cut off", () => {
        const map = JSON.parse(
            readFileSync(resolve(__dirname, "../../../public/assets/map1.json"), "utf8"),
        );
        const layer = (name: string) =>
            map.layers.find((l: { name: string }) => l.name === name).data as number[];
        const count = (name: string) => findTrees(layer(name), map.width, map.height).length;

        // Every tree-art tile belongs to a whole tree
        for (const name of ["Trees", "Trees2"]) {
            const found = findTrees(layer(name), map.width, map.height);
            const covered = new Set(
                found.flatMap(({ type, x, y }) =>
                    Array.from({ length: type.w * type.h }, (_, i) => (y + Math.floor(i / type.w)) * map.width + x + (i % type.w)),
                ),
            );
            const treeArt = new Set(TREE_TYPES.flatMap((t) => Array.from({ length: t.w * t.h }, (_, i) => treeGid(t, i % t.w, Math.floor(i / t.w)))));
            const stray = layer(name).flatMap((gid, i) => (treeArt.has(gid) && !covered.has(i) ? [i] : []));
            expect(stray, `${name} has partial trees at cells ${stray.slice(0, 5)}`).toEqual([]);
        }
        expect(count("Trees2")).toBeGreaterThan(250);
        expect(count("Trees")).toBe(4);
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
