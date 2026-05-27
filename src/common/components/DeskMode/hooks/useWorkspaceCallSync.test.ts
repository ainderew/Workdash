import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetKnownWorkspaceIds = vi.fn();
const mockFetchActiveCallsForWorkspaces = vi
    .fn()
    .mockResolvedValue(undefined);

vi.mock("@/communication/callSignaling/callSignalingService", () => ({
    CallSignalingService: {
        getInstance: () => ({
            setKnownWorkspaceIds: mockSetKnownWorkspaceIds,
            fetchActiveCallsForWorkspaces: mockFetchActiveCallsForWorkspaces,
        }),
    },
}));

const mockClearWorkspaceCallActivity = vi.fn();

vi.mock("@/common/store/callStore", () => ({
    default: {
        getState: () => ({
            clearWorkspaceCallActivity: mockClearWorkspaceCallActivity,
        }),
    },
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { useWorkspaceCallSync } from "./useWorkspaceCallSync";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks();
});

describe("useWorkspaceCallSync", () => {
    it("pushes the workspace ids into the service and triggers the bulk fetch on mount", () => {
        renderHook(() => useWorkspaceCallSync(["W1", "W2"]));

        expect(mockSetKnownWorkspaceIds).toHaveBeenCalledWith(["W1", "W2"]);
        expect(mockFetchActiveCallsForWorkspaces).toHaveBeenCalledWith([
            "W1",
            "W2",
        ]);
    });

    it("skips the fetch (but still syncs ids) when the list is empty", () => {
        renderHook(() => useWorkspaceCallSync([]));

        expect(mockSetKnownWorkspaceIds).toHaveBeenCalledWith([]);
        expect(mockFetchActiveCallsForWorkspaces).not.toHaveBeenCalled();
    });

    it("calls clearWorkspaceCallActivity for workspaces that drop out of the list", () => {
        const initial = ["W1", "W2"];
        const next = ["W1"];

        const { rerender } = renderHook(
            ({ ids }: { ids: string[] }) => useWorkspaceCallSync(ids),
            { initialProps: { ids: initial } },
        );

        mockClearWorkspaceCallActivity.mockClear();

        rerender({ ids: next });

        expect(mockClearWorkspaceCallActivity).toHaveBeenCalledTimes(1);
        expect(mockClearWorkspaceCallActivity).toHaveBeenCalledWith("W2");
    });

    it("does NOT clear workspaces that remain in the list", () => {
        const { rerender } = renderHook(
            ({ ids }: { ids: string[] }) => useWorkspaceCallSync(ids),
            { initialProps: { ids: ["W1", "W2"] } },
        );

        mockClearWorkspaceCallActivity.mockClear();
        rerender({ ids: ["W1", "W2", "W3"] });

        expect(mockClearWorkspaceCallActivity).not.toHaveBeenCalled();
    });

    it("clears all previously-known workspaces when the list goes empty", () => {
        const { rerender } = renderHook(
            ({ ids }: { ids: string[] }) => useWorkspaceCallSync(ids),
            { initialProps: { ids: ["W1", "W2"] } },
        );

        mockClearWorkspaceCallActivity.mockClear();
        rerender({ ids: [] });

        const clearedIds = mockClearWorkspaceCallActivity.mock.calls.map(
            (c) => c[0],
        );
        expect(clearedIds.sort()).toEqual(["W1", "W2"]);
    });
});
