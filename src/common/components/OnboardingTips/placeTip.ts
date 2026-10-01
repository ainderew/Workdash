import type { TipAnchor } from "./_types";

const GUTTER = 16;
const GAP = 14;
const CARD_WIDTH = 320;
/** Below this viewport width the card spans the screen, gutters aside. */
const NARROW_VIEWPORT = 640;
/** Keeps the caret clear of the card's rounded corners. */
const CARET_INSET = 22;
/** A caret this close to an edge squares that corner off so it can sit there. */
const SQUARE_CORNER_WITHIN = 30;

export interface TipPlacement {
    side: "above" | "below";
    left: number;
    width: number;
    /** Distance from the viewport's bottom edge (above) or top edge (below). */
    offset: number;
    caretX: number;
    squareCorner: "left" | "right" | null;
}

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

/** Hangs the card off the control: on the roomier side, centred on it, inside the gutters. */
export function placeTip(anchor: TipAnchor): TipPlacement {
    const { viewportWidth: vw, viewportHeight: vh } = anchor;
    const width =
        vw < NARROW_VIEWPORT ? vw - GUTTER * 2 : Math.min(CARD_WIDTH, vw - GUTTER * 2);
    const centerX = anchor.left + anchor.width / 2;
    const side = anchor.top + anchor.height / 2 > vh / 2 ? "above" : "below";
    const offset =
        side === "above"
            ? vh - anchor.top + GAP
            : anchor.top + anchor.height + GAP;
    const left = clamp(centerX - width / 2, GUTTER, vw - GUTTER - width);
    const caretX = clamp(centerX - left, CARET_INSET, width - CARET_INSET);
    const squareCorner =
        caretX < SQUARE_CORNER_WITHIN
            ? "left"
            : caretX > width - SQUARE_CORNER_WITHIN
              ? "right"
              : null;

    return { side, left, width, offset, caretX, squareCorner };
}
