import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockSummary: { totalParticipants: number; callCount: number } = {
    totalParticipants: 0,
    callCount: 0,
};

vi.mock("@/common/store/callStore", () => ({
    default: vi.fn(
        (selector: (s: Record<string, unknown>) => unknown) => selector({}),
    ),
    selectDmCallSummary: vi.fn(() => mockSummary),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import DmCallBadge from "./DmCallBadge";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks();
    mockSummary = { totalParticipants: 0, callCount: 0 };
});

describe("DmCallBadge", () => {
    it("renders nothing when no DM calls are active", () => {
        mockSummary = { totalParticipants: 0, callCount: 0 };
        const { container } = render(<DmCallBadge />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the count with 'in DM call' label for one call", () => {
        mockSummary = { totalParticipants: 2, callCount: 1 };
        render(<DmCallBadge />);

        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByLabelText("2 in DM call")).toBeInTheDocument();
    });

    it("uses 'across N DM calls' label when multiple DMs have calls", () => {
        mockSummary = { totalParticipants: 4, callCount: 2 };
        render(<DmCallBadge />);

        expect(
            screen.getByLabelText("4 across 2 DM calls"),
        ).toBeInTheDocument();
    });

    it("shows 99+ when total exceeds 99", () => {
        mockSummary = { totalParticipants: 250, callCount: 10 };
        render(<DmCallBadge />);

        expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("applies motion-safe:animate-pulse so reduced-motion users see no pulse", () => {
        mockSummary = { totalParticipants: 2, callCount: 1 };
        render(<DmCallBadge />);

        const badge = screen.getByLabelText("2 in DM call");
        expect(badge.className).toContain("motion-safe:animate-pulse");
    });
});
