/**
 * Seats come from the "Seats" object layer of map1.json, edited in Tiled:
 * - a point of type "seat" at the middle of where a sitter sits, with a
 *   string property `facing` (up | down | left | right);
 * - a rectangle of type "front" over furniture that must draw over a seated
 *   player (a chair back you face away from, a desk you face), with a string
 *   property `layers` naming the tile layers to lift (comma-separated).
 */
export type Facing = "up" | "down" | "left" | "right";

export interface Seat {
    /** The Tiled object id, which the server uses to arbitrate the seat */
    id: string;
    x: number;
    y: number;
    facing: Facing;
}

export interface FrontRect {
    x: number;
    y: number;
    width: number;
    height: number;
    layers: string[];
}

interface TiledObject {
    id: number;
    type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    properties?: { name: string; value: unknown }[];
}

const FACINGS: Facing[] = ["up", "down", "left", "right"];

function prop(obj: TiledObject, name: string) {
    return obj.properties?.find((p) => p.name === name)?.value;
}

export function readSeatLayer(objects: TiledObject[] = []): { seats: Seat[]; fronts: FrontRect[] } {
    const seats: Seat[] = [];
    const fronts: FrontRect[] = [];
    for (const obj of objects) {
        if (obj.type === "seat") {
            const facing = prop(obj, "facing");
            if (!FACINGS.includes(facing as Facing)) continue;
            seats.push({ id: String(obj.id), x: obj.x ?? 0, y: obj.y ?? 0, facing: facing as Facing });
        } else if (obj.type === "front") {
            const layers = String(prop(obj, "layers") ?? "")
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean);
            if (layers.length === 0) continue;
            fronts.push({
                x: obj.x ?? 0,
                y: obj.y ?? 0,
                width: obj.width ?? 0,
                height: obj.height ?? 0,
                layers,
            });
        }
    }
    return { seats, fronts };
}

/** How close (px) the feet must be to a seat to sit on it. */
export const SIT_REACH_PX = 60;

/** The seat nearest to the feet, if one is within reach. */
export function nearestSeat(
    seats: Seat[],
    feet: { x: number; y: number },
    reach = SIT_REACH_PX,
): Seat | null {
    let best: Seat | null = null;
    let bestDistance = reach;
    for (const seat of seats) {
        const distance = Math.hypot(seat.x - feet.x, seat.y - feet.y);
        if (distance <= bestDistance) {
            best = seat;
            bestDistance = distance;
        }
    }
    return best;
}

/**
 * Where the player's centre goes when sitting, relative to the seat point,
 * so the sit frames land on the seat (the frames are 32x64 with the body low).
 */
const POSE_OFFSET: Record<Facing, { x: number; y: number }> = {
    up: { x: 0, y: -14 }, // hips (the crop line) on the seat point
    down: { x: 0, y: -12 }, // built sitting frames: feet just in front of the seat
    left: { x: 0, y: -16 },
    right: { x: 0, y: -16 },
};

export function sittingPosition(seat: Seat) {
    const offset = POSE_OFFSET[seat.facing];
    return { x: seat.x + offset.x, y: seat.y + offset.y };
}

/** Where and how a player sits: centre position, facing, and the ground line for depth. */
export interface SeatPose {
    id: string;
    x: number;
    y: number;
    facing: Facing;
    /** The seat point's y: a seated player sorts by it, behind furniture drawn in front */
    groundY: number;
}

export function seatPose(seat: Seat): SeatPose {
    return { id: seat.id, ...sittingPosition(seat), facing: seat.facing, groundY: seat.y };
}
