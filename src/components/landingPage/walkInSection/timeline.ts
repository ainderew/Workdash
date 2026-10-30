// The walk-in section is one 25 s "film" scrubbed by scroll. Scroll progress
// p (0–1) maps to film time t (seconds) through KNOTS; the flat runs are
// reading stops, where a lot of scrolling moves the film only half a second
// so the copy holds still. The film is two parts:
//   t 0–8   the intro clip (Higgsfield): the desk at night, then a push
//           through the monitor that lands on the map overhead
//   t 8–25  the live map: the real map1.json render with sprites and
//           overlays, positioned by a virtual camera
// Copy is driven by p directly, not t, so it stays put while the film holds.

/** Half-scale render of map1.json (see the .webp.json sidecar). */
export const WORLD_RASTER = "/assets/walk-in-world.3193c310.webp";
export const WORLD_W = 2032;
export const WORLD_H = 1760;

export const INTRO_END = 8;
export const DURATION = 25;

export const KNOTS: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [0.08, 0.3],
    [0.17, 4],
    [0.27, 8],
    [0.32, 10],
    [0.39, 10.5],
    [0.44, 12.5],
    [0.49, 14.5],
    [0.55, 15],
    [0.6, 16.5],
    [0.65, 18.5],
    [0.7, 19],
    [0.76, 20.5],
    [0.83, 23.5],
    [0.9, 24.6],
    [1, 25],
];

/** [in start, in end, out start, out end] in scroll progress. */
export type Range = readonly [number, number, number, number];

export const R_TITLE: Range = [0, 0, 0.02, 0.07];
export const R_STATEMENT: Range = [0.08, 0.095, 0.155, 0.172];
export const W_STATEMENT = [0.088, 0.15] as const;
export const R_PRESENCE: Range = [0.785, 0.8, 0.875, 0.895];
export const W_PRESENCE = [0.795, 0.86] as const;
export const R_END = [0.925, 0.96] as const;
/** The film is a card at both ends and full screen in between. */
export const CARD_OPEN = [0.012, 0.075] as const;
export const CARD_CLOSE = [0.895, 0.95] as const;

export const clamp = (v: number, a: number, b: number) =>
    Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const smooth = (k: number) => k * k * (3 - 2 * k);
export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
export const ramp = (x: number, a: number, b: number) =>
    b === a ? (x >= a ? 1 : 0) : clamp((x - a) / (b - a), 0, 1);

export function timeAt(p: number): number {
    const x = clamp(p, 0, 1);
    for (let i = 1; i < KNOTS.length; i++) {
        const [s0, t0] = KNOTS[i - 1];
        const [s1, t1] = KNOTS[i];
        if (x <= s1) return lerp(t0, t1, (x - s0) / (s1 - s0));
    }
    return DURATION;
}

/** Camera keyframes in film time: [t, centre x, centre y, view width]. */
export type CamKey = readonly [number, number, number, number];

export const WORLD_CAM: ReadonlyArray<CamKey> = [
    [8, 1016, 880, 2400],
    [9.2, 860, 640, 1300],
    // wide enough to frame the whole main_office voice zone while they talk
    [10, 704, 440, 740],
    [10.5, 706, 438, 720],
    [12.5, 610, 560, 760],
    [14.5, 431, 668, 520],
    [15, 433, 668, 490],
    [15.9, 760, 840, 1100],
    [18.5, 1290, 1065, 640],
    [19, 1290, 1065, 600],
    [21.4, 1150, 950, 1500],
    [23.5, 1016, 880, 2400],
    [25, 1016, 880, 2300],
];

/** Eased between keys; zoom interpolates in log space so it feels even. */
export function camAt(keys: ReadonlyArray<CamKey>, t: number): [number, number, number] {
    const first = keys[0];
    if (t <= first[0]) return [first[1], first[2], first[3]];
    for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1];
        const b = keys[i];
        if (t <= b[0]) {
            const k = smooth((t - a[0]) / (b[0] - a[0]));
            return [
                lerp(a[1], b[1], k),
                lerp(a[2], b[2], k),
                Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), k)),
            ];
        }
    }
    const last = keys[keys.length - 1];
    return [last[1], last[2], last[3]];
}

export type Facing = "right" | "up" | "left" | "down";

/**
 * Position and facing at k (0-1) along a polyline, at constant speed, so a
 * sprite can turn corners (through a doorway) instead of cutting through walls.
 */
export function along(
    path: ReadonlyArray<readonly [number, number]>,
    k: number,
): [number, number, Facing] {
    const lengths = path.slice(1).map(([x, y], i) => Math.hypot(x - path[i][0], y - path[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    let left = clamp(k, 0, 1) * total;
    for (let i = 0; i < lengths.length; i++) {
        const [x0, y0] = path[i];
        const [x1, y1] = path[i + 1];
        if (left <= lengths[i] || i === lengths.length - 1) {
            const f = lengths[i] ? clamp(left / lengths[i], 0, 1) : 1;
            const dx = x1 - x0;
            const dy = y1 - y0;
            const facing: Facing =
                Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
            return [lerp(x0, x1, f), lerp(y0, y1, f), facing];
        }
        left -= lengths[i];
    }
    const [x, y] = path[path.length - 1];
    return [x, y, "down"];
}

/** Scale that fits a 16:9 view of width vw into w×h, covering it. */
export function coverScale(w: number, h: number, vw: number): number {
    return Math.max(w / vw, h / ((vw * 9) / 16));
}

/**
 * Phones reframe instead of cropping: start where the 16:9 cover crop is (so
 * the hand-off from the intro clip lines up), then widen for the final pull
 * out so every lamp stays in frame.
 */
export function portraitScale(w: number, h: number, vw: number, t: number): number {
    const k = lerp((w * 9) / (16 * h), 0.66, smooth(ramp(t, 20.5, 23.5)));
    return w / Math.max(vw * k, 380);
}
