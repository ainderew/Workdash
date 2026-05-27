import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — control the selector return value per test
// ---------------------------------------------------------------------------

let mockSummary: { totalParticipants: number; channelCount: number } = {
    totalParticipants: 0,
    channelCount: 0,
};

vi.mock("@/common/store/callStore", () => ({
    default: vi.fn(
        (selector: (s: Record<string, unknown>) => unknown) => selector({}),
    ),
    selectWorkspaceCallSummary: vi.fn(() => mockSummary),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import WorkspaceCallBadge from "./WorkspaceCallBadge";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks();
    mockSummary = { totalParticipants: 0, channelCount: 0 };
});

describe("WorkspaceCallBadge", () => {
    it("renders nothing when totalParticipants is 0", () => {
        mockSummary = { totalParticipants: 0, channelCount: 0 };
        const { container } = render(<WorkspaceCallBadge workspaceId="W1" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the count when a call is active in one channel", () => {
        mockSummary = { totalParticipants: 3, channelCount: 1 };
        render(<WorkspaceCallBadge workspaceId="W1" />);

        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByLabelText("3 in call")).toBeInTheDocument();
    });

    it("uses 'across N calls' label when multiple channels have calls", () => {
        mockSummary = { totalParticipants: 5, channelCount: 2 };
        render(<WorkspaceCallBadge workspaceId="W1" />);

        expect(screen.getByLabelText("5 across 2 calls")).toBeInTheDocument();
    });

    it("shows 99+ when total exceeds 99", () => {
        mockSummary = { totalParticipants: 150, channelCount: 5 };
        render(<WorkspaceCallBadge workspaceId="W1" />);

        expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("applies the motion-safe:animate-pulse class so reduced-motion users see no pulse", () => {
        mockSummary = { totalParticipants: 2, channelCount: 1 };
        render(<WorkspaceCallBadge workspaceId="W1" />);

        const badge = screen.getByLabelText("2 in call");
        expect(badge.className).toContain("motion-safe:animate-pulse");
    });

    it("uses the --wd-success token for the badge background (no hardcoded color)", () => {
        mockSummary = { totalParticipants: 1, channelCount: 1 };
        render(<WorkspaceCallBadge workspaceId="W1" />);

        const badge = screen.getByLabelText("1 in call");
        expect(badge.className).toContain("bg-[var(--wd-success)]");
    });
});
