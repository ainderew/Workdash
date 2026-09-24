/**
 * Pre-rendered picture of map1.json (scripts/render-map-preview.swift),
 * cropped to the playable world. Regenerate it whenever the map changes.
 */
export const WORLD_MAP_PREVIEW = "/assets/world-map-preview.79895fef.webp";

/** The preview covers MainMap.worldBounds, in tiles. */
export const WORLD_TILES = { w: 127, h: 110 };

/** Last resort if the scene never said where its camera opens. */
export const DEFAULT_SPAWN_TILE = { tx: 1000 / 32, ty: 1000 / 32 };

const TILE_PX = 32;

export interface WorldPlace {
    name: string;
    /** Status line shown while this place's lamp is the newest one lit */
    status: string;
    /** Tile coordinates of the place's centre on the map */
    tx: number;
    ty: number;
    /** Asset-load progress (0..1) at which the lamp comes on */
    at: number;
}

// Lit in the order you'd walk them, starting where you arrive; the campfire
// waits for the last asset, so it's what you see while the map is built.
export const WORLD_PLACES: WorldPlace[] = [
    { name: "Office", status: "Unlocking the office…", tx: 41, ty: 36, at: 0 },
    { name: "Park", status: "Watering the park…", tx: 49, ty: 68, at: 0.2 },
    { name: "Pond", status: "Filling the pond…", tx: 20, ty: 63.5, at: 0.4 },
    {
        name: "Café",
        status: "Firing up the food trucks…",
        tx: 80,
        ty: 66,
        at: 0.6,
    },
    {
        name: "Pitch",
        status: "Switching on the floodlights…",
        tx: 49,
        ty: 97,
        at: 0.8,
    },
    {
        name: "Campfire",
        status: "Lighting the campfire…",
        tx: 97,
        ty: 32,
        at: 1,
    },
];

/** Tile coordinates -> position on the preview, as fractions (0..1). */
export function toPreviewFraction(tx: number, ty: number) {
    return {
        x: Math.min(Math.max((tx + 0.5) / WORLD_TILES.w, 0), 1),
        y: Math.min(Math.max((ty + 0.5) / WORLD_TILES.h, 0), 1),
    };
}

export interface HandOffAim {
    /** Focus as fractions of the preview: the zoom's pivot */
    fx: number;
    fy: number;
    /** Offset (px) that brings the focus to the viewport centre */
    dx: number;
    dy: number;
    /** Scale at which a preview tile matches a live tile on screen */
    zs: number;
}

/**
 * Where the hand-off zoom must land so the preview lines up with the live
 * canvas: the focus tile centred on screen, at the camera's tile size.
 */
export function aimAtCamera(
    previewBox: {
        left: number;
        top: number;
        width: number;
        height: number;
    } | null,
    focusTile: { tx: number; ty: number },
    cameraZoom: number,
    viewport: { width: number; height: number },
): HandOffAim {
    const { x: fx, y: fy } = toPreviewFraction(focusTile.tx, focusTile.ty);
    if (!previewBox || previewBox.width <= 0)
        return { fx, fy, dx: 0, dy: 0, zs: 2.6 };
    const tileOnPreview = previewBox.width / WORLD_TILES.w;
    return {
        fx,
        fy,
        dx: viewport.width / 2 - (previewBox.left + fx * previewBox.width),
        dy: viewport.height / 2 - (previewBox.top + fy * previewBox.height),
        // Capped so the composited layer stays a sane size on small screens
        zs: Math.min(Math.max((TILE_PX * cameraZoom) / tileOnPreview, 2), 8),
    };
}
