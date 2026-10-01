import { describe, expect, it } from "vitest";
import { BEATS } from "./content";
import {
    CARD_CLOSE,
    DURATION,
    INTRO_END,
    KNOTS,
    R_END,
    R_PRESENCE,
    WORLD_CAM,
    camAt,
    coverScale,
    portraitScale,
    timeAt,
} from "./timeline";

describe("timeAt", () => {
    it("runs the whole film from 0 to its duration", () => {
        expect(timeAt(0)).toBe(0);
        expect(timeAt(1)).toBe(DURATION);
        expect(timeAt(-0.5)).toBe(0);
        expect(timeAt(2)).toBe(DURATION);
    });

    it("never runs backwards as scroll moves forward", () => {
        let prev = -1;
        for (let i = 0; i <= 1000; i++) {
            const t = timeAt(i / 1000);
            expect(t).toBeGreaterThanOrEqual(prev);
            prev = t;
        }
    });

    it("hits every knot exactly", () => {
        for (const [p, t] of KNOTS) expect(timeAt(p)).toBeCloseTo(t, 9);
    });

    it("holds the film nearly still while each feature's copy is fully up", () => {
        for (const beat of BEATS) {
            const [, inEnd, outStart] = beat.range;
            expect(timeAt(outStart) - timeAt(inEnd)).toBeLessThan(2.5);
            expect(timeAt(inEnd)).toBeGreaterThan(INTRO_END);
        }
    });

    it("orders the copy so nothing overlaps", () => {
        const ranges = [...BEATS.map((b) => b.range), R_PRESENCE];
        for (let i = 1; i < ranges.length; i++) {
            expect(ranges[i][0]).toBeGreaterThanOrEqual(ranges[i - 1][3]);
        }
        expect(R_PRESENCE[3]).toBeLessThanOrEqual(CARD_CLOSE[0]);
        expect(R_END[0]).toBeGreaterThan(CARD_CLOSE[0]);
    });
});

describe("camAt", () => {
    it("starts the live map on the intro clip's last frame and lands on each key", () => {
        expect(WORLD_CAM[0][0]).toBe(INTRO_END);
        for (const [t, x, y, w] of WORLD_CAM) {
            const [cx, cy, vw] = camAt(WORLD_CAM, t);
            expect(cx).toBeCloseTo(x, 6);
            expect(cy).toBeCloseTo(y, 6);
            expect(vw).toBeCloseTo(w, 6);
        }
    });

    it("clamps outside the keyed range", () => {
        expect(camAt(WORLD_CAM, 0)).toEqual([1016, 880, 2400]);
        expect(camAt(WORLD_CAM, 99)).toEqual([1016, 880, 2300]);
    });
});

describe("framing", () => {
    it("covers the stage at any aspect", () => {
        expect(coverScale(1600, 900, 800)).toBeCloseTo(2, 9);
        expect(coverScale(1000, 900, 800)).toBeCloseTo(2, 9);
        expect(coverScale(390, 844, 800)).toBeGreaterThan(390 / 800);
    });

    it("matches the 16:9 cover crop on phones at the hand-off", () => {
        const [, , vw] = camAt(WORLD_CAM, INTRO_END);
        expect(portraitScale(390, 844, vw, INTRO_END)).toBeCloseTo(coverScale(390, 844, vw), 6);
    });
});
