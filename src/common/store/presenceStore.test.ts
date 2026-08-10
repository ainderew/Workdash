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

describe("presenceStore.customStatusMap", () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.resetModules();
    });

    it("stores a custom status and reads it back", async () => {
        const { usePresenceStore } = await import("./presenceStore");

        usePresenceStore
            .getState()
            .setCustomStatus(7, { emoji: "🤒", text: "Feeling sick" });

        expect(usePresenceStore.getState().getCustomStatus(7)).toEqual({
            emoji: "🤒",
            text: "Feeling sick",
        });
    });

    it("returns null for a user with no custom status", async () => {
        const { usePresenceStore } = await import("./presenceStore");

        expect(usePresenceStore.getState().getCustomStatus(404)).toBeNull();
    });

    it("removes the entry when cleared with null", async () => {
        const { usePresenceStore } = await import("./presenceStore");

        usePresenceStore.setState({
            customStatusMap: { 7: { emoji: "🤒", text: "Feeling sick" } },
        });
        usePresenceStore.getState().setCustomStatus(7, null);

        expect(usePresenceStore.getState().customStatusMap).toEqual({});
    });

    it("treats an all-empty status as a clear", async () => {
        const { usePresenceStore } = await import("./presenceStore");

        usePresenceStore.setState({
            customStatusMap: { 7: { emoji: "🤒", text: "Feeling sick" } },
        });
        usePresenceStore
            .getState()
            .setCustomStatus(7, { emoji: null, text: null });

        expect(usePresenceStore.getState().customStatusMap).toEqual({});
    });

    it("keeps the same state object when clearing an absent user", async () => {
        const { usePresenceStore } = await import("./presenceStore");

        const before = usePresenceStore.getState().customStatusMap;
        usePresenceStore.getState().setCustomStatus(99, null);

        expect(usePresenceStore.getState().customStatusMap).toBe(before);
    });

    it("bulk-sets some users and drops the ones sent as null", async () => {
        const { usePresenceStore } = await import("./presenceStore");

        usePresenceStore.setState({
            customStatusMap: { 1: { emoji: "🏝️", text: "On vacation" } },
        });
        usePresenceStore.getState().bulkSetCustomStatus([
            { userId: 1, customStatus: null },
            { userId: 2, customStatus: { emoji: "🎧", text: "Heads down" } },
            { userId: 3, customStatus: { emoji: "🗓️", text: null } },
        ]);

        expect(usePresenceStore.getState().customStatusMap).toEqual({
            2: { emoji: "🎧", text: "Heads down" },
            3: { emoji: "🗓️", text: null },
        });
    });

    it("survives a presence update for the same user", async () => {
        const { usePresenceStore } = await import("./presenceStore");

        usePresenceStore
            .getState()
            .setCustomStatus(7, { emoji: "🤒", text: "Feeling sick" });
        usePresenceStore.getState().setPresence(7, AWAY);

        expect(usePresenceStore.getState().getCustomStatus(7)).toEqual({
            emoji: "🤒",
            text: "Feeling sick",
        });
    });
});
