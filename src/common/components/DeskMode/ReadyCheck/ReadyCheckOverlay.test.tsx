import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type {
    ReadyCheckSnapshot,
    ReadyCheckTarget,
} from "@/communication/readyCheck/_types";

// Make motion elements plain DOM + AnimatePresence synchronous so the
// auto-dismiss timer test is deterministic (no async exit animations).
vi.mock("framer-motion", () => {
    const MOTION_ONLY = new Set([
        "initial",
        "animate",
        "exit",
        "transition",
        "whileHover",
        "whileTap",
        "whileInView",
        "variants",
        "layout",
        "layoutId",
    ]);
    const cache: Record<string, React.ComponentType<Record<string, unknown>>> = {};
    const passthrough = (tag: string) => {
        if (!cache[tag]) {
            const Comp = React.forwardRef<HTMLElement, Record<string, unknown>>(
                (props, ref) => {
                    const clean: Record<string, unknown> = { ref };
                    for (const key in props) {
                        if (!MOTION_ONLY.has(key)) clean[key] = props[key];
                    }
                    return React.createElement(tag, clean);
                },
            );
            Comp.displayName = `motion.${tag}`;
            cache[tag] = Comp as React.ComponentType<Record<string, unknown>>;
        }
        return cache[tag];
    };
    return {
        motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        useReducedMotion: () => true,
    };
});

// ---------------------------------------------------------------------------
// Mocks — control selector return values per test
// ---------------------------------------------------------------------------

let mockCandidate: ReadyCheckSnapshot | null = null;
let mockSnapshot: ReadyCheckSnapshot | null = null;
let mockLocalResponse: Record<string, "ready" | "not-ready"> = {};
const respondSpy = vi.fn().mockResolvedValue({ ok: true });
const cancelSpy = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/common/store/readyCheckStore", () => ({
    default: vi.fn((selector: (s: unknown) => unknown) =>
        selector({ localResponseByCheckId: mockLocalResponse }),
    ),
    selectActiveParticipantCheck: vi.fn(() => mockCandidate),
    selectSnapshotByCheckId: vi.fn(() => mockSnapshot),
}));

vi.mock("@/common/store/useStore", () => ({
    default: vi.fn((selector: (s: unknown) => unknown) =>
        selector({ backendUser: { id: 2 } }),
    ),
}));

vi.mock("@/common/store/chatV2Store", () => ({
    default: vi.fn((selector: (s: unknown) => unknown) =>
        selector({ membersByRoomId: {} }),
    ),
}));

vi.mock("@/communication/readyCheck/readyCheckService", () => ({
    ReadyCheckClientService: {
        getInstance: () => ({ respond: respondSpy, cancel: cancelSpy }),
    },
}));

vi.mock("@/communication/readyCheck/readyCheckSound", () => ({
    playLockedInChime: vi.fn(),
}));

import ReadyCheckOverlay from "./ReadyCheckOverlay";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTarget(overrides: Partial<ReadyCheckTarget> = {}): ReadyCheckTarget {
    return {
        userId: 2,
        displayName: "Bob",
        state: "pending",
        respondedAt: null,
        ...overrides,
    };
}

function makeSnapshot(overrides: Partial<ReadyCheckSnapshot> = {}): ReadyCheckSnapshot {
    return {
        checkId: "c-1",
        channelId: "ch-1",
        invokerUserId: 1,
        invokerDisplayName: "Alice",
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
        timeoutMs: 30_000,
        targets: [makeTarget(), makeTarget({ userId: 3, displayName: "Cara" })],
        resolved: false,
        resolvedReason: null,
        ...overrides,
    };
}

/** Engage the ritual: an active candidate the local user is part of. */
function engage(snapshot = makeSnapshot()) {
    mockCandidate = snapshot;
    mockSnapshot = snapshot;
}

beforeEach(() => {
    vi.clearAllMocks();
    mockCandidate = null;
    mockSnapshot = null;
    mockLocalResponse = {};
});

afterEach(() => {
    vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReadyCheckOverlay", () => {
    it("renders nothing when there is no active participant check", () => {
        const { container } = render(<ReadyCheckOverlay />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the ritual with the invoker's name when prompted", () => {
        engage();
        render(<ReadyCheckOverlay />);
        expect(
            screen.getByText(/Alice is calling everyone in/),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /I'm in/ })).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Not tonight/ }),
        ).toBeInTheDocument();
    });

    it("clicking I'm in calls respond(checkId, true)", () => {
        engage();
        render(<ReadyCheckOverlay />);
        fireEvent.click(screen.getByRole("button", { name: /I'm in/ }));
        expect(respondSpy).toHaveBeenCalledWith("c-1", true);
    });

    it("clicking Not tonight calls respond(checkId, false)", () => {
        engage();
        render(<ReadyCheckOverlay />);
        fireEvent.click(screen.getByRole("button", { name: /Not tonight/ }));
        expect(respondSpy).toHaveBeenCalledWith("c-1", false);
    });

    it("Escape responds Not Ready while the local user is pending", () => {
        engage();
        render(<ReadyCheckOverlay />);
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
        expect(respondSpy).toHaveBeenCalledWith("c-1", false);
    });

    it("hides the choice and shows a waiting state once responded", () => {
        engage();
        mockLocalResponse = { "c-1": "ready" };
        render(<ReadyCheckOverlay />);
        expect(
            screen.queryByRole("button", { name: /I'm in/ }),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/Waiting on/)).toBeInTheDocument();
    });

    it("shows a cancel control for the invoker who is only spectating", () => {
        // Local user (id 2) is the invoker and not a target.
        engage(
            makeSnapshot({
                invokerUserId: 2,
                targets: [makeTarget({ userId: 3, displayName: "Cara" })],
            }),
        );
        render(<ReadyCheckOverlay />);
        const cancel = screen.getByRole("button", { name: /Cancel ready check/ });
        fireEvent.click(cancel);
        expect(cancelSpy).toHaveBeenCalledWith("c-1");
    });

    it("auto-dismisses after everyone locks in", () => {
        vi.useFakeTimers();
        engage();
        const { rerender } = render(<ReadyCheckOverlay />);
        expect(screen.queryByRole("dialog")).toBeInTheDocument();

        // Everyone readies → resolved (all-responded); candidate clears.
        const resolved = makeSnapshot({
            resolved: true,
            resolvedReason: "all-responded",
            targets: [
                makeTarget({ state: "ready" }),
                makeTarget({ userId: 3, displayName: "Cara", state: "ready" }),
            ],
        });
        mockCandidate = null;
        mockSnapshot = resolved;
        rerender(<ReadyCheckOverlay />);

        // Climax holds, then the overlay closes on its own.
        act(() => {
            vi.advanceTimersByTime(2500);
        });
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
