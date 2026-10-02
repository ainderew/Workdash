import type { Range } from "./timeline";

// Copy and scene data for the walk-in section. Map coordinates are pixels in
// the half-scale world raster (WORLD_RASTER), i.e. 16 px per tile.

export const TITLE = "What it actually";
export const TITLE_ACCENT = "does.";

export const STATEMENT =
    "For friends who keep a call open at night, and teams who’d rather share a room than book a meeting.";

export interface Beat {
    eyebrow: string;
    line1: string;
    line2: string;
    lead: string;
    body: string;
    range: Range;
}

export const BEATS: ReadonlyArray<Beat> = [
    {
        eyebrow: "Proximity chat",
        line1: "Walk in.",
        line2: "Start talking.",
        lead: "No call to start.",
        body: "Everyone in the same room hears each other. Step into the private office and only the people inside can hear you.",
        range: [0.3, 0.325, 0.41, 0.435],
    },
    {
        eyebrow: "Instant video pods",
        line1: "Step in.",
        line2: "Cameras up.",
        lead: "Your camera comes up on its own.",
        body: "No link to send, nothing to ring, no waiting room to sit in.",
        range: [0.47, 0.495, 0.575, 0.595],
    },
    {
        eyebrow: "Expressive emotes",
        line1: "Calm room.",
        line2: "Loud moments.",
        lead: "Send coffee, throw confetti, or dance.",
        body: "The chrome stays calm. The moments are where the noise goes.",
        range: [0.63, 0.655, 0.735, 0.755],
    },
];

export const PRESENCE_EYEBROW = "Presence";
export const PRESENCE =
    "One glance tells you who’s on the couch, who’s queuing, and who’s heads-down.";
export const PRESENCE_SUB = "When nobody’s on, it says so and leaves you alone.";

export const END_LINE = "Andrew’s on the couch.";
export const END_ACCENT = "Sit down.";

export interface Lamp {
    x: number;
    y: number;
    name: string;
    doing: string;
    /** Film time the lamp lights. */
    at: number;
    /** Put the label above the lamp so it clears its neighbours. */
    above?: boolean;
}

export const LAMPS: ReadonlyArray<Lamp> = [
    { x: 725, y: 455, name: "Andrew", doing: "on the couch", at: 22.0 },
    { x: 950, y: 690, name: "Jo", doing: "heads-down", at: 22.6, above: true },
    { x: 1290, y: 1060, name: "Mika", doing: "queuing for Dota", at: 23.2 },
    { x: 1546, y: 505, name: "Sam", doing: "at the campfire", at: 23.8 },
];

export type Sheet = "adam" | "amelia" | "bob";

export const SHEETS: Record<Sheet, string> = {
    adam: "/assets/characters/Characters/Adam/Adam_walk_16x16.png",
    amelia: "/assets/characters/Characters/Amelia/Amelia_walk_16x16.png",
    bob: "/assets/characters/Characters/Bob/Bob_walk_16x16.png",
};

/** Walk sheets are 24 frames of 16×32: right, up, left, down (6 each). */
export const FRAME = { right: 0, up: 6, left: 12, down: 18 } as const;

/**
 * Voice in the world is by audio zone (map1.json "AudioZones"), not by
 * distance: everyone inside a zone hears everyone else in it. This is the
 * main_office zone the first beat happens in, at half scale.
 */
export const MAIN_OFFICE = { left: 416, top: 272, width: 576, height: 304 } as const;

/**
 * Bob's route into the private office: along the corridor to the sliding
 * door (tiles 29-30, rows 36-38), then straight down through it. Points are
 * the sprite's top-left; its feet are 32 px lower. walkIn paths are checked
 * against the map's collision layers in scenePaths.test.ts.
 */
export const BOB_PATH: ReadonlyArray<readonly [number, number]> = [
    [520, 516],
    [472, 516],
    [472, 676],
];

/** Friends at the food-truck plaza: [x, y, sheet, facing frame]. */
export const PLAZA: ReadonlyArray<readonly [number, number, Sheet, number]> = [
    [1180, 1010, "adam", FRAME.left],
    [1240, 998, "amelia", FRAME.down],
    [1302, 1078, "bob", FRAME.left],
    [1368, 1036, "adam", FRAME.down],
];

export type EmoteKind = "coffee" | "pizza" | "star";

export const EMOTES: ReadonlyArray<{ who: number; kind: EmoteKind; at: number }> = [
    { who: 0, kind: "coffee", at: 17.2 },
    { who: 2, kind: "star", at: 17.7 },
    { who: 1, kind: "pizza", at: 18.2 },
    { who: 3, kind: "coffee", at: 18.8 },
    { who: 0, kind: "star", at: 19.3 },
    { who: 2, kind: "pizza", at: 19.8 },
];

export const CONFETTI_COUNT = 28;

export const CAMERA_TILES = [
    { name: "Mika", src: "/assets/female-video-call-placeholder.webp", speaking: true },
    { name: "You", src: "/assets/workdash-video-call-you-poster.9f74c3bb.webp" },
    { name: "Jo · camera off", src: "/assets/landing-male.png", off: true },
] as const;
