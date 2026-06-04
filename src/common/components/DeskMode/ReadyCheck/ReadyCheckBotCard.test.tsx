import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type {
    ReadyCheckSnapshot,
    ReadyCheckTarget,
} from "@/communication/readyCheck/_types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockSnapshot: ReadyCheckSnapshot | null = null;
let mockLocalUserId: number | undefined = 1;

vi.mock("@/common/store/readyCheckStore", () => ({
    default: vi.fn((selector: (s: unknown) => unknown) => selector({})),
    selectSnapshotByCheckId: vi.fn(() => mockSnapshot),
}));

vi.mock("@/common/store/useStore", () => ({
    default: vi.fn((selector: (s: unknown) => unknown) =>
        selector({ backendUser: { id: mockLocalUserId } }),
    ),
}));

const cancelSpy = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/communication/readyCheck/readyCheckService", () => ({
    ReadyCheckClientService: {
        getInstance: () => ({ cancel: cancelSpy }),
    },
}));

import ReadyCheckBotCard from "./ReadyCheckBotCard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(
    overrides: Partial<ReadyCheckSnapshot> = {},
): ReadyCheckSnapshot {
    const defaultTargets: ReadyCheckTarget[] = [
        { userId: 1, displayName: "Alice", state: "ready", respondedAt: "x" },
        { userId: 2, displayName: "Bob", state: "pending", respondedAt: null },
    ];
    return {
        checkId: "c-1",
        channelId: "ch-1",
        invokerUserId: 1,
        invokerDisplayName: "Alice",
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
        timeoutMs: 30_000,
        targets: defaultTargets,
        resolved: false,
        resolvedReason: null,
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockSnapshot = null;
    mockLocalUserId = 1;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReadyCheckBotCard", () => {
    it("renders the unavailable fallback when no snapshot", () => {
        mockSnapshot = null;
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(
            screen.getByText(/Ready check no longer available/),
        ).toBeInTheDocument();
    });

    it("renders the invoker name and timestamp header", () => {
        mockSnapshot = makeSnapshot();
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(screen.getByText(/Ready Check by Alice/)).toBeInTheDocument();
    });

    it("shows per-state count pills with the correct numbers", () => {
        mockSnapshot = makeSnapshot({
            targets: [
                { userId: 1, displayName: "Alice", state: "ready", respondedAt: "x" },
                { userId: 2, displayName: "Bob", state: "not-ready", respondedAt: "x" },
                { userId: 3, displayName: "Carol", state: "focused", respondedAt: null },
                { userId: 4, displayName: "Dave", state: "pending", respondedAt: null },
            ],
        });
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(screen.getByText("Ready 1")).toBeInTheDocument();
        expect(screen.getByText("Not Ready 1")).toBeInTheDocument();
        expect(screen.getByText("Focused 1")).toBeInTheDocument();
        expect(screen.getByText("Pending 1")).toBeInTheDocument();
    });

    it("shows each target by display name", () => {
        mockSnapshot = makeSnapshot();
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("renders 'Cancelled by X' when resolved with cancelled reason", () => {
        mockSnapshot = makeSnapshot({
            resolved: true,
            resolvedReason: "cancelled",
        });
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(screen.getByText(/Cancelled by Alice/)).toBeInTheDocument();
    });

    it("renders 'Timed out' when resolved with timeout reason", () => {
        mockSnapshot = makeSnapshot({
            resolved: true,
            resolvedReason: "timeout",
        });
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(screen.getByText(/Timed out/)).toBeInTheDocument();
    });

    it("shows Cancel button only when local user is invoker AND check is unresolved", () => {
        mockSnapshot = makeSnapshot();
        mockLocalUserId = 1; // invoker
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(
            screen.getByRole("button", { name: /Cancel ready check/i }),
        ).toBeInTheDocument();
    });

    it("hides Cancel button when local user is NOT the invoker", () => {
        mockSnapshot = makeSnapshot();
        mockLocalUserId = 2;
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(
            screen.queryByRole("button", { name: /Cancel ready check/i }),
        ).not.toBeInTheDocument();
    });

    it("hides Cancel button when the check is resolved", () => {
        mockSnapshot = makeSnapshot({
            resolved: true,
            resolvedReason: "all-responded",
        });
        mockLocalUserId = 1;
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        expect(
            screen.queryByRole("button", { name: /Cancel ready check/i }),
        ).not.toBeInTheDocument();
    });

    it("clicking Cancel calls service.cancel(checkId)", () => {
        mockSnapshot = makeSnapshot();
        mockLocalUserId = 1;
        render(<ReadyCheckBotCard checkId="c-1" channelId="ch-1" />);
        fireEvent.click(
            screen.getByRole("button", { name: /Cancel ready check/i }),
        );
        expect(cancelSpy).toHaveBeenCalledWith("c-1");
    });
});
