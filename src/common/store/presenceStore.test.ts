import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi,
} from "vitest";
import type { UserPresence } from "./presenceStore";

const ONLINE: UserPresence = {
    statusId: "online",
    label: "Online",
    color: "#00ff00",
    icon: null,
    manualLock: false,
};

const AWAY: UserPresence = {
    statusId: "away",
    label: "Away",
    color: "#ffaa00",
    icon: null,
    manualLock: false,
};

const OFFLINE: UserPresence = {
    statusId: "offline",
    label: "Offline",
    color: "#71717a",
    icon: null,
    manualLock: false,
};

describe("presenceStore.lastSeenMap", () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
    });

    it("records lastSeen on online → offline transition", async () => {
        const { usePresenceStore } = await import("./presenceStore");
        usePresenceStore.setState({
            presenceMap: { 7: ONLINE },
            lastSeenMap: {},
        });

        const before = Date.now();
        usePresenceStore.getState().setPresence(7, OFFLINE);
        const after = Date.now();

        const stamp = usePresenceStore.getState().lastSeenMap[7];
        expect(stamp).toBeGreaterThanOrEqual(before);
        expect(stamp).toBeLessThanOrEqual(after);
    });

    it("does not record on offline → offline (never-seen user)", async () => {
        const { usePresenceStore } = await import("./presenceStore");
        usePresenceStore.setState({ presenceMap: {}, lastSeenMap: {} });

        usePresenceStore.getState().setPresence(8, OFFLINE);

        expect(usePresenceStore.getState().lastSeenMap[8]).toBeUndefined();
    });

    it("does not record on online → online (status change)", async () => {
        const { usePresenceStore } = await import("./presenceStore");
        usePresenceStore.setState({
            presenceMap: { 9: ONLINE },
            lastSeenMap: {},
        });

        usePresenceStore.getState().setPresence(9, AWAY);

        expect(usePresenceStore.getState().lastSeenMap[9]).toBeUndefined();
    });

    it("bulkSetPresence records every transition and persists once", async () => {
        const setItemSpy = vi.spyOn(window.localStorage, "setItem");
        const { usePresenceStore } = await import("./presenceStore");
        usePresenceStore.setState({
            presenceMap: { 1: ONLINE, 2: ONLINE, 3: ONLINE },
            lastSeenMap: {},
        });

        setItemSpy.mockClear();
        usePresenceStore.getState().bulkSetPresence([
            { userId: 1, ...OFFLINE },
            { userId: 2, ...OFFLINE },
            { userId: 3, ...AWAY },
        ]);

        const map = usePresenceStore.getState().lastSeenMap;
        expect(map[1]).toBeGreaterThan(0);
        expect(map[2]).toBeGreaterThan(0);
        expect(map[3]).toBeUndefined();

        const wdLastSeenWrites = setItemSpy.mock.calls.filter(
            ([key]) => key === "wd:lastSeen",
        );
        expect(wdLastSeenWrites).toHaveLength(1);
    });

    it("hydrates lastSeenMap from localStorage on init", async () => {
        window.localStorage.setItem(
            "wd:lastSeen",
            JSON.stringify({ 42: 1700000000000 }),
        );

        const { usePresenceStore } = await import("./presenceStore");

        expect(usePresenceStore.getState().lastSeenMap).toEqual({
            42: 1700000000000,
        });
        expect(usePresenceStore.getState().getLastSeen(42)).toBe(1700000000000);
        expect(usePresenceStore.getState().getLastSeen(99)).toBeNull();
    });

    it("returns an empty map when localStorage JSON is corrupted", async () => {
        window.localStorage.setItem("wd:lastSeen", "not-valid-json{");

        const { usePresenceStore } = await import("./presenceStore");

        expect(usePresenceStore.getState().lastSeenMap).toEqual({});
    });
});
