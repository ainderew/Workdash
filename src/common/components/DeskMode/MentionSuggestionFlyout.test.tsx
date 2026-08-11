import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePresenceStore } from "@/common/store/presenceStore";
import MentionSuggestionFlyout, {
    type MentionSuggestion,
} from "./MentionSuggestionFlyout";

vi.mock("@/common/components/DeskMode/TwemojiSpan", () => ({
    default: ({ emoji }: { emoji: string }) => <span>{emoji}</span>,
}));

// jsdom has no scrollIntoView; the flyout calls it to keep the
// keyboard-selected row in view.
Element.prototype.scrollIntoView = vi.fn();

const USER_ID = 7;

function makeSuggestion(
    overrides: Partial<MentionSuggestion> = {},
): MentionSuggestion {
    return { userId: USER_ID, name: "Drw", ...overrides };
}

function renderFlyout(
    suggestions: MentionSuggestion[],
    selectedIndex = -1,
) {
    return render(
        <MentionSuggestionFlyout
            suggestions={suggestions}
            query=""
            selectedIndex={selectedIndex}
            onSelect={vi.fn()}
            onClose={vi.fn()}
        />,
    );
}

beforeEach(() => {
    usePresenceStore.setState({ customStatusMap: {} });
});

function setStatus(emoji: string | null, text: string | null) {
    usePresenceStore.setState({
        customStatusMap: { [USER_ID]: { emoji, text } },
    });
}

describe("MentionSuggestionFlyout custom status", () => {
    it("shows the status beneath the member's name", () => {
        setStatus("🤒", "Feeling sick");

        renderFlyout([makeSuggestion()]);

        expect(screen.getByText("Drw")).toBeInTheDocument();
        expect(screen.getByText("Feeling sick")).toBeInTheDocument();
        expect(screen.getAllByText("🤒").length).toBeGreaterThan(0);
    });

    it("keeps the full name and pairs it with the status on one line", () => {
        setStatus("🎧", "Heads down");

        renderFlyout([
            makeSuggestion({ nickname: "Drw", fullName: "Andrew Pinon" }),
        ]);

        expect(screen.getByText("Andrew Pinon")).toBeInTheDocument();
        expect(screen.getByText("Heads down")).toBeInTheDocument();
    });

    it("renders no metadata line when there is neither name nor status", () => {
        renderFlyout([makeSuggestion()]);

        expect(screen.getByText("Drw")).toBeInTheDocument();
        expect(screen.queryByText("Feeling sick")).not.toBeInTheDocument();
    });

    it("renders an emoji-only status without an empty text node", () => {
        setStatus("🏝️", null);

        renderFlyout([makeSuggestion()]);

        expect(screen.getAllByText("🏝️").length).toBeGreaterThan(0);
    });

    it("does not attach a status to the @everyone row", () => {
        usePresenceStore.setState({
            customStatusMap: { [-1]: { emoji: "🤒", text: "Feeling sick" } },
        });

        renderFlyout([
            {
                userId: -1,
                name: "everyone",
                fullName: "Notify all members in this channel",
            },
        ]);

        expect(
            screen.getByText("Notify all members in this channel"),
        ).toBeInTheDocument();
        expect(screen.queryByText("Feeling sick")).not.toBeInTheDocument();
    });

    it("uses higher-contrast ink on the selected row", () => {
        setStatus("🤒", "Feeling sick");

        renderFlyout([makeSuggestion()], 0);

        const meta = screen.getByText("Feeling sick").closest("p");
        expect(meta?.className).toContain("wd-text-secondary");
        expect(meta?.className).not.toContain("wd-text-muted");
    });
});
