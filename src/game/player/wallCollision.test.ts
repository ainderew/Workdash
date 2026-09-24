import { describe, it, expect } from "vitest";
import { moveWithCollisions, type Rect } from "./wallCollision";

// 20x12 feet box whose top-left sits at (x, y) — keeps the arithmetic obvious.
const feetAt = (x: number, y: number): Rect => ({ left: x, top: y, right: x + 20, bottom: y + 12 });

const tile = (tx: number, ty: number): Rect => ({
    left: tx * 32,
    top: ty * 32,
    right: tx * 32 + 32,
    bottom: ty * 32 + 32,
});

function world(...solids: Rect[]) {
    const overlapsOrTouches = (a: Rect, b: Rect) =>
        a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
    return (area: Rect) => solids.filter((s) => overlapsOrTouches(area, s));
}

describe("moveWithCollisions", () => {
    it("moves freely through open space", () => {
        const result = moveWithCollisions(0, 0, 5, 7, feetAt, world());
        expect(result).toEqual({ x: 5, y: 7, blockedX: false, blockedY: false });
    });

    it("stops flush against a wall instead of entering it", () => {
        // Wall tile starts at x=64; feet right edge is x+20, so it must stop at x=44
        const result = moveWithCollisions(40, 0, 10, 0, feetAt, world(tile(2, 0)));
        expect(result.x).toBe(44);
        expect(result.blockedX).toBe(true);
    });

    it("stops flush when moving up into a wall above", () => {
        // Wall tile bottom is y=32
        const result = moveWithCollisions(0, 36, 0, -10, feetAt, world(tile(0, 0)));
        expect(result.y).toBe(32);
        expect(result.blockedY).toBe(true);
    });

    it("slides along a wall when moving diagonally into it", () => {
        // Wall above; moving up-right keeps the x movement and blocks y
        const result = moveWithCollisions(0, 32, 6, -6, feetAt, world(tile(0, 0), tile(1, 0)));
        expect(result).toEqual({ x: 6, y: 32, blockedX: false, blockedY: true });
    });

    it("stays put when already flush and pushing further", () => {
        const result = moveWithCollisions(44, 0, 10, 0, feetAt, world(tile(2, 0)));
        expect(result.x).toBe(44);
    });

    it("passes through a gap exactly as wide as the feet", () => {
        // Solids at x<32 and x>=52 leave a 20px corridor; feet are 20px wide
        const left: Rect = { left: 0, top: 0, right: 32, bottom: 64 };
        const right: Rect = { left: 52, top: 0, right: 84, bottom: 64 };
        const result = moveWithCollisions(32, 80, 0, -60, feetAt, world(left, right));
        expect(result.y).toBe(20);
        expect(result.blockedY).toBe(false);
    });

    it("lets a player that starts inside a wall walk out of it", () => {
        // Saved position overlaps tile (0,0); moving right must not be blocked by it
        const result = moveWithCollisions(10, 10, 8, 0, feetAt, world(tile(0, 0)));
        expect(result.x).toBe(18);
        expect(result.blockedX).toBe(false);
    });

    it("never moves backwards when blocked", () => {
        const result = moveWithCollisions(44, 0, 3, 0, feetAt, world(tile(2, 0)));
        expect(result.x).toBeGreaterThanOrEqual(44);
    });
});
