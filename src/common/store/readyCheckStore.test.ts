import { describe, it, expect, beforeEach } from "vitest";
import useReadyCheckStore, {
    selectIsLocalUserPending,
    selectSnapshotByCheckId,
} from "./readyCheckStore";
import type {
    ReadyCheckResolvedReason,
    ReadyCheckSnapshot,
} from "@/communication/readyCheck/_types";

function makeSnapshot(
    overrides: Partial<ReadyCheckSnapshot> = {},
): ReadyCheckSnapshot {
    return {
        checkId: "c-1",
        channelId: "ch-1",
        invokerUserId: 1,
        invokerDisplayName: "Alice",
        startedAt: "2026-06-03T00:00:00Z",
        expiresAt: "2026-06-03T00:00:30Z",
        timeoutMs: 30_000,
        targets: [],
        resolved: false,
        resolvedReason: null,
        ...overrides,
    };
}

beforeEach(() => {
    useReadyCheckStore.getState().reset();
});

describe("applySnapshot", () => {
    it("stores the snapshot keyed by channelId", () => {
        const snap = makeSnapshot();
        useReadyCheckStore.getState().applySnapshot(snap);
        expect(
            useReadyCheckStore.getState().currentCheckByChannelId["ch-1"],
        ).toEqual(snap);
    });

    it("overwrites existing snapshot for the same channelId", () => {
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({ targets: [{ userId: 1, displayName: "A", state: "ready", respondedAt: null }] }),
        );
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({ targets: [{ userId: 2, displayName: "B", state: "pending", respondedAt: null }] }),
        );
        const snap =
            useReadyCheckStore.getState().currentCheckByChannelId["ch-1"];
        expect(snap?.targets).toHaveLength(1);
        expect(snap?.targets[0]?.userId).toBe(2);
    });

    it("clears activePromptCheckId when the resolved snapshot matches", () => {
        useReadyCheckStore.getState().setActivePromptCheckId("c-1");
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({ resolved: true, resolvedReason: "all-responded" }),
        );
        expect(useReadyCheckStore.getState().activePromptCheckId).toBeNull();
    });

    it("does not clear activePromptCheckId when the resolved snapshot is for a different checkId", () => {
        useReadyCheckStore.getState().setActivePromptCheckId("c-other");
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({
                checkId: "c-1",
                resolved: true,
                resolvedReason: "all-responded" as ReadyCheckResolvedReason,
            }),
        );
        expect(useReadyCheckStore.getState().activePromptCheckId).toBe("c-other");
    });
});

describe("recordLocalResponse", () => {
    it("records the response under the checkId", () => {
        useReadyCheckStore.getState().recordLocalResponse("c-1", "ready");
        expect(
            useReadyCheckStore.getState().localResponseByCheckId["c-1"],
        ).toBe("ready");
    });

    it("clears activePromptCheckId when it matches the responded checkId", () => {
        useReadyCheckStore.getState().setActivePromptCheckId("c-1");
        useReadyCheckStore.getState().recordLocalResponse("c-1", "not-ready");
        expect(useReadyCheckStore.getState().activePromptCheckId).toBeNull();
    });
});

describe("pruneResolved", () => {
    it("removes resolved snapshots and keeps active ones", () => {
        useReadyCheckStore.getState().applySnapshot(makeSnapshot({ channelId: "ch-active", checkId: "c-active" }));
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({
                channelId: "ch-done",
                checkId: "c-done",
                resolved: true,
                resolvedReason: "all-responded",
            }),
        );
        useReadyCheckStore.getState().pruneResolved();
        const state = useReadyCheckStore.getState().currentCheckByChannelId;
        expect("ch-active" in state).toBe(true);
        expect("ch-done" in state).toBe(false);
    });

    it("preserves object identity when there's nothing to prune", () => {
        useReadyCheckStore.getState().applySnapshot(makeSnapshot());
        const before = useReadyCheckStore.getState().currentCheckByChannelId;
        useReadyCheckStore.getState().pruneResolved();
        expect(useReadyCheckStore.getState().currentCheckByChannelId).toBe(before);
    });
});

describe("reset", () => {
    it("clears all state", () => {
        useReadyCheckStore.getState().applySnapshot(makeSnapshot());
        useReadyCheckStore.getState().setActivePromptCheckId("c-1");
        useReadyCheckStore.getState().recordLocalResponse("c-1", "ready");

        useReadyCheckStore.getState().reset();

        const state = useReadyCheckStore.getState();
        expect(state.currentCheckByChannelId).toEqual({});
        expect(state.activePromptCheckId).toBeNull();
        expect(state.localResponseByCheckId).toEqual({});
    });
});

describe("selectSnapshotByCheckId", () => {
    it("returns the snapshot when found", () => {
        useReadyCheckStore.getState().applySnapshot(makeSnapshot());
        expect(
            selectSnapshotByCheckId(useReadyCheckStore.getState(), "c-1"),
        ).not.toBeNull();
    });

    it("returns null when checkId is null", () => {
        expect(
            selectSnapshotByCheckId(useReadyCheckStore.getState(), null),
        ).toBeNull();
    });

    it("returns null when no snapshot has that checkId", () => {
        expect(
            selectSnapshotByCheckId(useReadyCheckStore.getState(), "missing"),
        ).toBeNull();
    });
});

describe("selectIsLocalUserPending", () => {
    it("returns false when localUserId is null/undefined", () => {
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({
                targets: [
                    { userId: 1, displayName: "A", state: "pending", respondedAt: null },
                ],
            }),
        );
        expect(
            selectIsLocalUserPending(
                useReadyCheckStore.getState(),
                null,
                "c-1",
            ),
        ).toBe(false);
    });

    it("returns false when the snapshot is resolved", () => {
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({
                resolved: true,
                resolvedReason: "all-responded",
                targets: [
                    { userId: 1, displayName: "A", state: "pending", respondedAt: null },
                ],
            }),
        );
        expect(
            selectIsLocalUserPending(useReadyCheckStore.getState(), 1, "c-1"),
        ).toBe(false);
    });

    it("returns true when local user is pending", () => {
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({
                targets: [
                    { userId: 1, displayName: "A", state: "pending", respondedAt: null },
                ],
            }),
        );
        expect(
            selectIsLocalUserPending(useReadyCheckStore.getState(), 1, "c-1"),
        ).toBe(true);
    });

    it("returns false when the local user has already responded", () => {
        useReadyCheckStore.getState().applySnapshot(
            makeSnapshot({
                targets: [
                    {
                        userId: 1,
                        displayName: "A",
                        state: "ready",
                        respondedAt: "2026-06-03T00:00:05Z",
                    },
                ],
            }),
        );
        expect(
            selectIsLocalUserPending(useReadyCheckStore.getState(), 1, "c-1"),
        ).toBe(false);
    });
});
