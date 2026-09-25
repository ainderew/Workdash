import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { footprintRect, propFootprint } from "./tileFootprint";
import { moveWithCollisions } from "./wallCollision";

const exterior = (col: number, row: number) => row * 176 + col + 1;

describe("propFootprint", () => {
    it("knows the drawn part of the park planter's tiles", () => {
        expect(propFootprint(exterior(15, 10))).toBeNull(); // top-left: draws nothing
        expect(propFootprint(exterior(16, 10))).toEqual({ left: 4, top: 26, right: 10, bottom: 32 }); // grass tuft
        expect(propFootprint(exterior(16, 12))).toEqual({ left: 0, top: 0, right: 32, bottom: 24 }); // box
    });

    it("has a measurement for every prop tile on the world map (rerun build-prop-footprints.swift)", () => {
        const map = JSON.parse(
            readFileSync(resolve(__dirname, "../../../public/assets/map1.json"), "utf8"),
        );
        const missing = new Set<number>();
        for (const layer of map.layers) {
            if (!["Furniture", "Trees", "Trees2"].includes(layer.name)) continue;
            for (const raw of layer.data as number[]) {
                const gid = raw & 0x1fffffff;
                if (gid && propFootprint(gid) === undefined) missing.add(gid);
            }
        }
        expect([...missing]).toEqual([]);
    });
});

describe("footprintRect", () => {
    const tile = { left: 1728, top: 2048, right: 1760, bottom: 2080 };
    const size = { width: 32, height: 32 };
    const tuft = { left: 4, top: 26, right: 10, bottom: 32 };

    it("places the drawn part in the world", () => {
        expect(footprintRect(tile, tuft, size, { x: false, y: false })).toEqual({
            left: 1732,
            top: 2074,
            right: 1738,
            bottom: 2080,
        });
    });

    it("mirrors the drawn part for flipped tiles", () => {
        expect(footprintRect(tile, tuft, size, { x: true, y: false })).toEqual({
            left: 1750,
            top: 2074,
            right: 1756,
            bottom: 2080,
        });
    });

    it("lets feet walk right up to a planter instead of stopping a tile early", () => {
        const feetAt = (x: number, y: number) => ({ left: x - 10, right: x + 10, top: y - 12, bottom: y });
        const solids = [footprintRect(tile, tuft, size, { x: false, y: false })];

        // Feet just above the planter's top row (tile top is y=2048); one step down.
        // Beside the tuft, the row is open grass: no longer blocked
        const clear = moveWithCollisions(1750, 2046, 0, 8, feetAt, () => solids);
        expect(clear).toMatchObject({ y: 2054, blockedY: false });

        // Over the tuft, the feet stop at the grass itself, not the tile edge
        const blocked = moveWithCollisions(1735, 2070, 0, 8, feetAt, () => solids);
        expect(blocked).toMatchObject({ y: 2074, blockedY: true });
    });
});
