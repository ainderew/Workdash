import { describe, it, expect, beforeEach } from "vitest";
import { useActivityStore } from "./activityStore";
import type { UserActivity } from "@/communication/activity/_types";

const musicActivity = (overrides: Partial<UserActivity> = {}): UserActivity =>
    ({
        source: "music",
        type: "listening",
        title: "Synthwave",
        startedAt: 1_700_000_000_000,
        ...overrides,
    }) as UserActivity;

const dotaActivity = (overrides: Partial<UserActivity> = {}): UserActivity =>
    ({
        source: "dota",
        type: "playing",
        title: "Dota 2",
        startedAt: 1_700_000_500_000,
        ...overrides,
    }) as UserActivity;

describe("activityStore", () => {
    beforeEach(() => {
        useActivityStore.setState({ activityMap: {} });
    });

    describe("setActivity", () => {
        it("stores the activity under its source key", () => {
            useActivityStore.getState().setActivity("ws1", 100, musicActivity());

            const record = useActivityStore.getState().activityMap["ws1"]?.[100];
            expect(record?.music?.title).toBe("Synthwave");
        });

        it("keeps existing sources untouched when a different source is set", () => {
            useActivityStore.getState().setActivity("ws2", 200, musicActivity());
            useActivityStore.getState().setActivity("ws2", 200, dotaActivity());

            const record = useActivityStore.getState().activityMap["ws2"]?.[200];
            expect(Object.keys(record ?? {}).sort()).toEqual(["dota", "music"]);
        });

        it("overwrites the slot for the same source on a second call", () => {
            useActivityStore.getState().setActivity("ws3", 300, musicActivity({ title: "First" }));
            useActivityStore.getState().setActivity("ws3", 300, musicActivity({ title: "Second" }));

            const record = useActivityStore.getState().activityMap["ws3"]?.[300];
            expect(record?.music?.title).toBe("Second");
        });
    });

    describe("clearActivity", () => {
        it("removes only the named source and leaves other sources intact", () => {
            useActivityStore.getState().setActivity("ws4", 400, musicActivity());
            useActivityStore.getState().setActivity("ws4", 400, dotaActivity());

            useActivityStore.getState().clearActivity("ws4", 400, "music");

            const record = useActivityStore.getState().activityMap["ws4"]?.[400];
            expect(record?.music).toBeUndefined();
            expect(record?.dota?.type).toBe("playing");
        });

        it("deletes the user entry entirely when the last source is cleared", () => {
            useActivityStore.getState().setActivity("ws5", 500, musicActivity());

            useActivityStore.getState().clearActivity("ws5", 500, "music");

            expect(useActivityStore.getState().activityMap["ws5"]?.[500]).toBeUndefined();
        });

        it("is a noop when called for a user with no activities", () => {
            const before = useActivityStore.getState().activityMap;

            useActivityStore.getState().clearActivity("ws6", 600, "music");

            expect(useActivityStore.getState().activityMap).toBe(before);
        });
    });

    describe("clearAllActivities", () => {
        it("removes every source for the user regardless of slot count", () => {
            useActivityStore.getState().setActivity("ws7", 700, musicActivity());
            useActivityStore.getState().setActivity("ws7", 700, dotaActivity());

            useActivityStore.getState().clearAllActivities("ws7", 700);

            expect(useActivityStore.getState().activityMap["ws7"]?.[700]).toBeUndefined();
        });
    });

    describe("hydrateActivities", () => {
        it("converts an array into a source-keyed record", () => {
            useActivityStore.getState().hydrateActivities("ws8", [
                {
                    userId: 800,
                    activities: [musicActivity(), dotaActivity()],
                },
            ]);

            const record = useActivityStore.getState().activityMap["ws8"]?.[800];
            expect(record?.music?.source).toBe("music");
            expect(record?.dota?.source).toBe("dota");
        });

        it("empties the user entry when the hydrated activity list is empty", () => {
            useActivityStore.getState().setActivity("ws9", 900, musicActivity());

            useActivityStore.getState().hydrateActivities("ws9", [
                { userId: 900, activities: [] },
            ]);

            expect(useActivityStore.getState().activityMap["ws9"]?.[900]).toBeUndefined();
        });

        it("replaces the user's record with the hydrated snapshot (server is authoritative)", () => {
            useActivityStore.getState().setActivity("ws10", 1000, dotaActivity());

            useActivityStore.getState().hydrateActivities("ws10", [
                { userId: 1000, activities: [musicActivity()] },
            ]);

            const record = useActivityStore.getState().activityMap["ws10"]?.[1000];
            expect(record?.music).toBeDefined();
            // dota was present only in the live map; hydration replaces, so it's gone.
            expect(record?.dota).toBeUndefined();
        });
    });

    describe("batchClearActivities", () => {
        it("clears a single source across every provided user", () => {
            useActivityStore.getState().setActivity("ws12", 1200, musicActivity());
            useActivityStore.getState().setActivity("ws12", 1201, musicActivity());
            useActivityStore.getState().setActivity("ws12", 1200, dotaActivity());

            useActivityStore.getState().batchClearActivities("ws12", [1200, 1201], "music");

            const ws = useActivityStore.getState().activityMap["ws12"];
            expect(ws?.[1200]?.music).toBeUndefined();
            expect(ws?.[1200]?.dota?.type).toBe("playing");
            expect(ws?.[1201]).toBeUndefined(); // last slot cleared → entry removed
        });
    });

    describe("clearWorkspace", () => {
        it("removes only the specified workspace's map", () => {
            useActivityStore.getState().setActivity("ws-a", 1, musicActivity());
            useActivityStore.getState().setActivity("ws-b", 2, musicActivity());

            useActivityStore.getState().clearWorkspace("ws-a");

            expect(useActivityStore.getState().activityMap["ws-a"]).toBeUndefined();
            expect(useActivityStore.getState().activityMap["ws-b"]?.[2]?.music).toBeDefined();
        });
    });
});
