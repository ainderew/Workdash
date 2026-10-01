import { describe, expect, it } from "vitest";
import { placeTip } from "./placeTip";
import type { TipAnchor } from "./_types";

const desktop = { viewportWidth: 1440, viewportHeight: 900, radius: 8 };

describe("placeTip", () => {
    it("hangs above a dock button, centred on it", () => {
        const anchor: TipAnchor = { ...desktop, left: 964, top: 830, width: 36, height: 36 };

        const place = placeTip(anchor);

        expect(place.side).toBe("above");
        expect(place.offset).toBe(900 - 830 + 14);
        expect(place.width).toBe(320);
        expect(place.left + place.caretX).toBe(982);
        expect(place.squareCorner).toBeNull();
    });

    it("drops below a header button and keeps the card inside the gutter", () => {
        const anchor: TipAnchor = {
            viewportWidth: 390,
            viewportHeight: 844,
            radius: 0,
            left: 348,
            top: 0,
            width: 42,
            height: 36,
        };

        const place = placeTip(anchor);

        expect(place.side).toBe("below");
        expect(place.offset).toBe(36 + 14);
        expect(place.left).toBe(16);
        expect(place.width).toBe(358);
        // the caret can't reach the button's centre, so it sits at the corner
        expect(place.left + place.caretX).toBeGreaterThanOrEqual(348);
        expect(place.squareCorner).toBe("right");
    });
});
