import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Scene } from "phaser";
import type { Player } from "../player/player";
import { AudioZoneManager } from "./audioZoneManager";
import useWorldAudioStore from "@/common/store/worldAudioStore";

const { socket } = vi.hoisted(() => ({ socket: { id: "media-1", connected: true, emit: vi.fn() } }));
vi.mock("@/communication/mediaTransportService/mediaTransportService", () => ({
    MediaTransportService: { getInstance: () => ({ socket }) },
}));
vi.mock("@/common/store/chatV2Store", () => ({ default: { getState: () => ({ selectedWorkspaceId: "workspace-1" }) } }));
vi.mock("@/common/utils/logger", () => ({ logger: { log: vi.fn() } }));

function setup(sceneKey = "MainMap", filename = "map1") {
    const map = JSON.parse(readFileSync(resolve(__dirname, `../../../public/assets/${filename}.json`), "utf8"));
    const graphics = { fillStyle: vi.fn().mockReturnThis(), fillRect: vi.fn().mockReturnThis(), lineStyle: vi.fn().mockReturnThis(), strokeRect: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), destroy: vi.fn() };
    const labels: { destroy: ReturnType<typeof vi.fn> }[] = [];
    const scene = {
        sys: { settings: { key: sceneKey } },
        physics: { world: { bounds: { contains: (x: number, y: number) => x >= 0 && y >= 0 && x < 4064 && y < 3520 } } },
        add: { graphics: vi.fn(() => graphics), text: vi.fn(() => { const text = { setDepth: vi.fn().mockReturnThis(), destroy: vi.fn() }; labels.push(text); return text; }), zone: (x: number, y: number, width: number, height: number) => {
            const data = new Map();
            return { x, y, width, height, destroy: vi.fn(), setData: (key: string, value: unknown) => data.set(key, value), getData: (key: string) => data.get(key) };
        } },
    } as unknown as Scene;
    const manager = new AudioZoneManager(scene);
    manager.initializeZones({ getObjectLayer: (name: string) => map.layers.find((layer: { name: string }) => layer.name === name) } as Phaser.Tilemaps.Tilemap);
    const player = { id: "game-1", isLocal: true, x: 1600, y: 1960 - 24, displayHeight: 64 } as Player;
    const players = new Map([[player.id, player]]);
    const moveFeet = (x: number, y: number) => { player.x = x; player.y = y - 24; manager.update(players); };
    return { manager, player, players, moveFeet, graphics, labels };
}

describe("real map audio coverage", () => {
    beforeEach(() => { socket.emit.mockClear(); socket.id = "media-1"; socket.connected = true; useWorldAudioStore.setState({ connected: false, showAreas: false, zoneId: null }); });

    it.each([[1600, 1960], [1100, 2100], [2100, 2400], [2400, 1500]])("covers the outdoor path or grass at %s,%s", (x, y) => {
        const { moveFeet } = setup();
        moveFeet(x, y);
        expect(socket.emit).toHaveBeenLastCalledWith("player-zone-changed", expect.objectContaining({ toZone: "outdoors" }));
    });

    it("keeps a stationary player in the same zone even with no physics overlap callbacks", () => {
        const { manager, players, moveFeet } = setup();
        moveFeet(1600, 1500);
        for (let frame = 0; frame < 240; frame++) manager.update(players);
        expect(socket.emit).toHaveBeenCalledTimes(1);
        expect(socket.emit).toHaveBeenLastCalledWith("player-zone-changed", expect.objectContaining({ toZone: "main_office" }));
    });

    it("moves directly between the office, open paths and named park without a silent frame", () => {
        const { moveFeet } = setup();
        moveFeet(1600, 1500);
        moveFeet(1600, 1960);
        moveFeet(1600, 2200);
        expect(socket.emit.mock.calls.map(([, data]) => [data.fromZone, data.toZone])).toEqual([
            [null, "main_office"], ["main_office", "outdoors"], ["outdoors", "outdoor_park_1"],
        ]);
    });

    it("keeps every authored conversation area ahead of the outdoor fallback", () => {
        const { moveFeet } = setup();
        for (const [x, y, name] of [[800, 1350, "private_office"], [1600, 1500, "main_office"], [1600, 2200, "outdoor_park_1"], [1600, 2700, "sports_corner"], [500, 2000, "pond_garden"], [2500, 2100, "cafe_square"], [3000, 1000, "campfire"]] as const) {
            moveFeet(x, y);
            expect(socket.emit).toHaveBeenLastCalledWith("player-zone-changed", expect.objectContaining({ toZone: name }));
        }
    });

    it("announces outdoor membership again after media reconnect without buffering transitions", () => {
        const { manager, players, moveFeet } = setup();
        socket.connected = false;
        moveFeet(1600, 1500);
        moveFeet(1600, 1960);
        expect(socket.emit).not.toHaveBeenCalled();
        socket.connected = true;
        manager.update(players);
        socket.id = "media-2";
        manager.update(players);
        expect(socket.emit).toHaveBeenCalledTimes(2);
        expect(socket.emit).toHaveBeenLastCalledWith("player-zone-changed", expect.objectContaining({ fromZone: null, toZone: "outdoors" }));
    });

    it("shows authored boundaries only on request and releases graphics and labels when hidden", () => {
        const { manager, players, graphics, labels } = setup();
        manager.update(players);
        expect(graphics.strokeRect).not.toHaveBeenCalled();
        useWorldAudioStore.setState({ connected: true, zoneId: "main_office", showAreas: true });
        manager.update(players);
        expect(labels).toHaveLength(8);
        expect(graphics.fillRect).toHaveBeenCalledTimes(2); // Both main-office rectangles.
        manager.update(players);
        expect(labels).toHaveLength(8); // No graphics rebuilt each frame.
        useWorldAudioStore.getState().setShowAreas(false);
        manager.update(players);
        expect(graphics.destroy).toHaveBeenCalledTimes(1);
        expect(labels.every(label => label.destroy.mock.calls.length === 1)).toBe(true);
        manager.destroy();
    });

    it("does not create an outdoor zone in other scenes or beyond the map", () => {
        const { moveFeet } = setup("SoccerMap", "soccer_map");
        moveFeet(1600, 1000);
        moveFeet(1600, 2000);
        expect(socket.emit).toHaveBeenLastCalledWith("player-zone-changed", expect.objectContaining({ toZone: null }));
        const main = setup();
        main.moveFeet(1600, 1960);
        main.moveFeet(-1, 1960);
        expect(socket.emit).toHaveBeenLastCalledWith("player-zone-changed", expect.objectContaining({ toZone: null }));
    });

    it("ignores late updates after the scene destroys its audio manager", () => {
        const { manager, players, graphics } = setup();
        manager.destroy(); manager.destroy();
        useWorldAudioStore.setState({ connected: true, showAreas: true, zoneId: 'main_office' });
        expect(() => manager.update(players)).not.toThrow();
        expect(socket.emit).not.toHaveBeenCalled();
        expect(graphics.strokeRect).not.toHaveBeenCalled();
    });
});
