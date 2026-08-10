import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePresenceStore } from "@/common/store/presenceStore";
import CustomStatusInline from "./CustomStatusInline";
import CustomStatusBadge from "./CustomStatusBadge";

// emoji-mart loads its data over a dynamic import and paints into the DOM
// imperatively — stub it so these assertions stay deterministic.
vi.mock("@/common/components/DeskMode/TwemojiSpan", () => ({
    default: ({ emoji }: { emoji: string }) => <span>{emoji}</span>,
}));

const USER_ID = 7;

beforeEach(() => {
    usePresenceStore.setState({ customStatusMap: {} });
});

function setStatus(emoji: string | null, text: string | null) {
    usePresenceStore.setState({
        customStatusMap: { [USER_ID]: { emoji, text } },
    });
}

describe("CustomStatusInline", () => {
    it("renders emoji and text together for the member list", () => {
        setStatus("🤒", "Feeling sick, will still reply");

        render(<CustomStatusInline userId={USER_ID} />);

        expect(screen.getAllByText("🤒").length).toBeGreaterThan(0);
        expect(
            screen.getByText("Feeling sick, will still reply"),
        ).toBeInTheDocument();
    });

    it("renders nothing when the user has no custom status", () => {
        const { container } = render(<CustomStatusInline userId={USER_ID} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("renders the emoji alone when there is no text", () => {
        setStatus("🏝️", null);

        render(<CustomStatusInline userId={USER_ID} />);

        expect(screen.getAllByText("🏝️").length).toBeGreaterThan(0);
    });
});

describe("CustomStatusBadge", () => {
    it("shows only the emoji in the message feed", () => {
        setStatus("🤒", "Feeling sick, will still reply");

        render(<CustomStatusBadge userId={USER_ID} />);

        expect(screen.getAllByText("🤒").length).toBeGreaterThan(0);
        expect(
            screen.queryByText("Feeling sick, will still reply"),
        ).not.toBeInTheDocument();
    });

    it("exposes the full status as the accessible name", () => {
        setStatus("🤒", "Feeling sick, will still reply");

        render(<CustomStatusBadge userId={USER_ID} />);

        expect(
            screen.getByLabelText("🤒 Feeling sick, will still reply"),
        ).toBeInTheDocument();
    });

    it("renders nothing when the status has no emoji", () => {
        setStatus(null, "Text only");

        const { container } = render(<CustomStatusBadge userId={USER_ID} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when the user has no custom status", () => {
        const { container } = render(<CustomStatusBadge userId={USER_ID} />);

        expect(container).toBeEmptyDOMElement();
    });
});
