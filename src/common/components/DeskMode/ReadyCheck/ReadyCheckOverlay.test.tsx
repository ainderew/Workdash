import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type {
    ReadyCheckSnapshot,
    ReadyCheckTarget,
} from "@/communication/readyCheck/_types";

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
});
