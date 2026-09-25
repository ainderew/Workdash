import { describe, it, expect } from "vitest";
import { footprintRect, opaqueBounds } from "./tileFootprint";
import { moveWithCollisions, type Rect } from "./wallCollision";

/** A w x h tile whose pixels inside `drawn` are opaque. */
function tilePixels(w: number, h: number, drawn: Rect | null) {
    const rgba = new Uint8ClampedArray(w * h * 4);
    if (drawn) {
        for (let y = drawn.top; y < drawn.bottom; y++) {
            for (let x = drawn.left; x < drawn.right; x++) rgba[(y * w + x) * 4 + 3] = 255;
        }
    }
    return rgba;
}

describe("opaqueBounds", () => {
    it("finds the drawn part of a tile", () => {
        // A planter's top row: just a tuft of grass at the bottom
        const tuft = { left: 4, top: 26, right: 10, bottom: 32 };
        expect(opaqueBounds(tilePixels(32, 32, tuft), 32, 32)).toEqual(tuft);
    });

    it("reports a tile that draws nothing", () => {
        expect(opaqueBounds(tilePixels(32, 32, null), 32, 32)).toBeNull();
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
