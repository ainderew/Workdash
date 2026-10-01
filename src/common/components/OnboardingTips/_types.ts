export type TipId = "chat" | "desk" | "world";

/** Where the lit control sits, plus the viewport it was measured in. */
export interface TipAnchor {
    left: number;
    top: number;
    width: number;
    height: number;
    radius: number;
    viewportWidth: number;
    viewportHeight: number;
}
