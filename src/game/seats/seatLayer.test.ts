import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { nearestSeat, readSeatLayer, type Seat } from "./seatLayer";

const facing = (value: string) => [{ name: "facing", value }];

describe("readSeatLayer", () => {
    it("reads seats and the furniture that draws in front of them", () => {
        const { seats, fronts } = readSeatLayer([
            { id: 7, type: "seat", x: 100, y: 200, properties: facing("up") },
            { id: 8, type: "front", x: 96, y: 160, width: 32, height: 64, properties: [{ name: "layers", value: "Furniture, FurnitureDecoration" }] },
            { id: 9, type: "seat", x: 1, y: 1, properties: facing("sideways") }, // not a facing
            { id: 10, type: "", x: 5, y: 5 }, // some other object
        ]);
        expect(seats).toEqual([{ id: "7", x: 100, y: 200, facing: "up" }]);
        expect(fronts).toEqual([{ x: 96, y: 160, width: 32, height: 64, layers: ["Furniture", "FurnitureDecoration"] }]);
    });
});

describe("nearestSeat", () => {
    const seats: Seat[] = [
        { id: "a", x: 100, y: 100, facing: "down" },
        { id: "b", x: 132, y: 100, facing: "down" },
    ];

    it("picks the closest seat within reach", () => {
        expect(nearestSeat(seats, { x: 125, y: 120 })?.id).toBe("b");
        expect(nearestSeat(seats, { x: 104, y: 130 })?.id).toBe("a");
    });

    it("offers nothing when no seat is within reach", () => {
        expect(nearestSeat(seats, { x: 100, y: 200 })).toBeNull();
    });
});

describe("the world map's Seats layer", () => {
    const map = JSON.parse(readFileSync(resolve(__dirname, "../../../public/assets/map1.json"), "utf8"));
    const layer = map.layers.find((l: { name: string }) => l.name === "Seats");
    const { seats, fronts } = readSeatLayer(layer?.objects);
    const tileLayers = new Map<string, number[]>(
        map.layers.filter((l: { type: string }) => l.type === "tilelayer").map((l: { name: string; data: number[] }) => [l.name, l.data]),
    );

    it("has a seat on every chair and bench, with unique ids", () => {
        expect(seats.length).toBeGreaterThan(100);
        expect(new Set(seats.map((s) => s.id)).size).toBe(seats.length);
    });

    it("puts every seat on furniture, not bare floor", () => {
        const onFurniture = (seat: Seat) => {
            for (const [name, data] of tileLayers) {
                if (name === "Floor") continue;
                for (const dy of [-1, 0, 1]) {
                    const tx = Math.floor(seat.x / 32);
                    const ty = Math.floor(seat.y / 32) + dy;
                    if (data[ty * map.width + tx]) return true;
                }
            }
            return false;
        };
        expect(seats.filter((s) => !onFurniture(s)).map((s) => s.id)).toEqual([]);
    });

    it("only names tile layers that exist in front rectangles", () => {
        expect(fronts.length).toBeGreaterThan(0);
        for (const front of fronts) {
            for (const name of front.layers) expect(tileLayers.has(name), name).toBe(true);
        }
    });
});

describe("frontPart", () => {
    it("draws a whole tile in front when the rectangle covers it", async () => {
        const { frontPart } = await import("./liftFronts");
        expect(frontPart({ x: 992, y: 960, width: 32, height: 32, layers: [] }, { left: 992, top: 960, right: 1024, bottom: 992 })).toBeNull();
    });

    it("draws only the band inside the rectangle, in the tile's own pixels", async () => {
        const { frontPart } = await import("./liftFronts");
        expect(frontPart({ x: 992, y: 976, width: 32, height: 16, layers: [] }, { left: 992, top: 960, right: 1024, bottom: 992 })).toEqual({
            x: 0,
            y: 16,
            width: 32,
            height: 16,
        });
    });
});
