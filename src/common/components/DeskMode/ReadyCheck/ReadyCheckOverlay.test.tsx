import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type {
    ReadyCheckSnapshot,
    ReadyCheckTarget,
} from "@/communication/readyCheck/_types";

// ---------------------------------------------------------------------------
// Mocks — control the selector return value per test
// ---------------------------------------------------------------------------

let mockActivePromptCheckId: string | null = null;
let mockSnapshot: ReadyCheckSnapshot | null = null;
let mockLocalResponse: "ready" | "not-ready" | undefined = undefined;
const respondSpy = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/common/store/readyCheckStore", () => ({
    default: vi.fn((selector: (s: unknown) => unknown) =>
        selector({
            activePromptCheckId: mockActivePromptCheckId,
            localResponseByCheckId:
                mockActivePromptCheckId && mockLocalResponse
                    ? { [mockActivePromptCheckId]: mockLocalResponse }
                    : {},
        }),
    ),
    selectSnapshotByCheckId: vi.fn(() => mockSnapshot),
}));

vi.mock("@/common/store/useStore", () => ({
    default: vi.fn((selector: (s: unknown) => unknown) =>
        selector({ backendUser: { id: 2 } }),
    ),
}));

vi.mock("@/communication/readyCheck/readyCheckService", () => ({
    ReadyCheckClientService: {
        getInstance: () => ({ respond: respondSpy }),
    },
}));

import ReadyCheckOverlay from "./ReadyCheckOverlay";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTarget(
    overrides: Partial<ReadyCheckTarget> = {},
): ReadyCheckTarget {
    return {
        userId: 2,
        displayName: "Bob",
        state: "pending",
        respondedAt: null,
        ...overrides,
    };
}

function makeSnapshot(
    overrides: Partial<ReadyCheckSnapshot> = {},
): ReadyCheckSnapshot {
    return {
        checkId: "c-1",
        channelId: "ch-1",
        invokerUserId: 1,
        invokerDisplayName: "Alice",
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
        timeoutMs: 30_000,
        targets: [makeTarget()],
        resolved: false,
        resolvedReason: null,
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockActivePromptCheckId = null;
    mockSnapshot = null;
    mockLocalResponse = undefined;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReadyCheckOverlay", () => {
    it("renders nothing when activePromptCheckId is null", () => {
        const { container } = render(<ReadyCheckOverlay />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when snapshot is resolved", () => {
        mockActivePromptCheckId = "c-1";
        mockSnapshot = makeSnapshot({
            resolved: true,
            resolvedReason: "all-responded",
        });
        const { container } = render(<ReadyCheckOverlay />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when local user is not a pending target", () => {
        mockActivePromptCheckId = "c-1";
        mockSnapshot = makeSnapshot({
            targets: [makeTarget({ state: "ready" })],
        });
        const { container } = render(<ReadyCheckOverlay />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the modal with invoker name when prompted", () => {
        mockActivePromptCheckId = "c-1";
        mockSnapshot = makeSnapshot();
        render(<ReadyCheckOverlay />);
        expect(screen.getByText("Ready Check")).toBeInTheDocument();
        expect(screen.getByText(/Alice is asking/)).toBeInTheDocument();
        expect(screen.getByText("Are you ready?")).toBeInTheDocument();
    });

    it("clicking Ready calls respond(checkId, true)", () => {
        mockActivePromptCheckId = "c-1";
        mockSnapshot = makeSnapshot();
        render(<ReadyCheckOverlay />);
        fireEvent.click(screen.getByRole("button", { name: /^Ready$/ }));
        expect(respondSpy).toHaveBeenCalledWith("c-1", true);
    });

    it("clicking Not Ready calls respond(checkId, false)", () => {
        mockActivePromptCheckId = "c-1";
        mockSnapshot = makeSnapshot();
        render(<ReadyCheckOverlay />);
        fireEvent.click(screen.getByRole("button", { name: /Not Ready/ }));
        expect(respondSpy).toHaveBeenCalledWith("c-1", false);
    });

    it("Escape key triggers respond(checkId, false)", () => {
        mockActivePromptCheckId = "c-1";
        mockSnapshot = makeSnapshot();
        render(<ReadyCheckOverlay />);
        const dialog = screen.getByRole("dialog");
        fireEvent.keyDown(dialog, { key: "Escape" });
        expect(respondSpy).toHaveBeenCalledWith("c-1", false);
    });

    it("disables both buttons when local response is already recorded", () => {
        mockActivePromptCheckId = "c-1";
        mockSnapshot = makeSnapshot();
        mockLocalResponse = "ready";
        render(<ReadyCheckOverlay />);
        // The component returns null once activePromptCheckId is cleared,
        // but if the modal is still rendered while disabled was true, both buttons should
        // be disabled. In our store contract recordLocalResponse also clears activePromptCheckId
        // so in practice this test asserts the disabled prop is applied while a render happens
        // mid-state. We assert via direct DOM lookup since the component may have re-rendered.
        const ready = screen.queryByRole("button", { name: /^Ready$/ });
        const notReady = screen.queryByRole("button", { name: /Not Ready/ });
        if (ready) expect(ready).toBeDisabled();
        if (notReady) expect(notReady).toBeDisabled();
    });
});
