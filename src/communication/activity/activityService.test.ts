import { describe, it, expect, beforeEach, vi } from "vitest";
import { ActivityClientService } from "./activityService";
import { useActivityStore } from "@/common/store/activityStore";

type Handler = (payload: unknown) => void;

function makeMockSocket() {
    const handlers = new Map<string, Handler>();
    const socket = {
        on: vi.fn((event: string, handler: Handler) => {
            handlers.set(event, handler);
        }),
    };
    return { socket, handlers };
}

describe("ActivityClientService socket listeners", () => {
    let mockSocket: ReturnType<typeof makeMockSocket>;
    let service: ActivityClientService;

    beforeEach(() => {
        // Reset singleton state between tests
        (ActivityClientService as unknown as { instance: null }).instance = null;
        useActivityStore.setState({ activityMap: {} });
        mockSocket = makeMockSocket();
        service = ActivityClientService.getInstance();
        service.init(mockSocket.socket as unknown as SocketIOClient.Socket);
        service.setupListeners();
    });

    it("activity:set stores the activity in the workspace/user/source slot", () => {
        mockSocket.handlers.get("activity:set")?.({
            userId: 100,
            workspaceId: "ws1",
            source: "music",
            activity: {
                source: "music",
                type: "listening",
                title: "Synthwave",
                startedAt: 1,
            },
        });

        const record = useActivityStore.getState().activityMap["ws1"]?.[100];
        expect(record?.music?.title).toBe("Synthwave");
    });

    it("activity:set ignores payloads that fail validation (malformed activity)", () => {
        mockSocket.handlers.get("activity:set")?.({
            userId: 100,
            workspaceId: "ws1",
            source: "music",
            activity: { type: "listening" }, // missing source + startedAt
        });

        expect(useActivityStore.getState().activityMap).toEqual({});
    });

    it("activity:clear removes the named source and leaves others intact", () => {
        useActivityStore.getState().setActivity("ws2", 200, {
            source: "music",
            type: "listening",
            title: "Song",
            startedAt: 1,
        });
        useActivityStore.getState().setActivity("ws2", 200, {
            source: "dota",
            type: "playing",
            title: "Dota 2",
            startedAt: 2,
        });

        mockSocket.handlers.get("activity:clear")?.({
            userId: 200,
            workspaceId: "ws2",
            source: "music",
        });

        const record = useActivityStore.getState().activityMap["ws2"]?.[200];
        expect(record?.music).toBeUndefined();
        expect(record?.dota?.type).toBe("playing");
    });

    it("activity:clear-all removes every slot for the user", () => {
        useActivityStore.getState().setActivity("ws3", 300, {
            source: "music",
            type: "listening",
            title: "Song",
            startedAt: 1,
        });
        useActivityStore.getState().setActivity("ws3", 300, {
            source: "dota",
            type: "playing",
            title: "Dota 2",
            startedAt: 2,
        });

        mockSocket.handlers.get("activity:clear-all")?.({
            userId: 300,
            workspaceId: "ws3",
        });

        expect(useActivityStore.getState().activityMap["ws3"]?.[300]).toBeUndefined();
    });

    it("activity:batch-set upserts every valid entry into the store", () => {
        mockSocket.handlers.get("activity:batch-set")?.({
            workspaceId: "ws4",
            entries: [
                {
                    userId: 400,
                    source: "music",
                    activity: {
                        source: "music",
                        type: "listening",
                        title: "A",
                        startedAt: 1,
                    },
                },
                {
                    userId: 401,
                    source: "dota",
                    activity: {
                        source: "dota",
                        type: "playing",
                        title: "B",
                        startedAt: 2,
                    },
                },
            ],
        });

        const ws = useActivityStore.getState().activityMap["ws4"];
        expect(ws?.[400]?.music?.title).toBe("A");
        expect(ws?.[401]?.dota?.title).toBe("B");
    });

    it("activity:batch-clear removes the named source across users but preserves other sources", () => {
        useActivityStore.getState().setActivity("ws5", 500, {
            source: "music",
            type: "listening",
            title: "X",
            startedAt: 1,
        });
        useActivityStore.getState().setActivity("ws5", 500, {
            source: "dota",
            type: "playing",
            title: "Dota 2",
            startedAt: 2,
        });
        useActivityStore.getState().setActivity("ws5", 501, {
            source: "music",
            type: "listening",
            title: "Y",
            startedAt: 3,
        });

        mockSocket.handlers.get("activity:batch-clear")?.({
            workspaceId: "ws5",
            userIds: [500, 501],
            source: "music",
        });

        const ws = useActivityStore.getState().activityMap["ws5"];
        expect(ws?.[500]?.music).toBeUndefined();
        expect(ws?.[500]?.dota?.title).toBe("Dota 2");
        expect(ws?.[501]).toBeUndefined();
    });

    it("setupListeners is idempotent — repeated calls do not double-register handlers", () => {
        const firstOnCount = mockSocket.socket.on.mock.calls.length;

        service.setupListeners();

        expect(mockSocket.socket.on.mock.calls.length).toBe(firstOnCount);
    });
});
