import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePresenceStore } from "@/common/store/presenceStore";
import type { MentionMemberNameMap } from "@/communication/chatV2/mentionUtils";
import MentionHighlightedContent from "./MentionHighlightedContent";

// emoji-mart paints imperatively via dynamic import — stub for determinism.
vi.mock("@/common/components/DeskMode/TwemojiSpan", () => ({
    default: ({ emoji }: { emoji: string }) => <span>{emoji}</span>,
}));

const USER_ID = 7;

const memberNameMap: MentionMemberNameMap = new Map([
    [USER_ID, { displayName: "Drw", aliases: [] }],
]);

beforeEach(() => {
    usePresenceStore.setState({ customStatusMap: {} });
});

function renderMention() {
    return render(
        <MentionHighlightedContent
            content={`Hey <@${USER_ID}> can you look`}
            mentionedUserIds={[USER_ID]}
            memberNameMap={memberNameMap}
        />,
    );
}

describe("MentionHighlightedContent custom status", () => {
    it("shows the mentioned user's status emoji beside the mention", () => {
        usePresenceStore.setState({
            customStatusMap: {
                [USER_ID]: { emoji: "🤒", text: "Feeling sick" },
            },
        });

        renderMention();

        expect(screen.getByText("@Drw")).toBeInTheDocument();
        expect(screen.getAllByText("🤒").length).toBeGreaterThan(0);
    });

    it("exposes the full status as the badge's accessible name", () => {
        usePresenceStore.setState({
            customStatusMap: {
                [USER_ID]: { emoji: "🤒", text: "Feeling sick" },
            },
        });

        renderMention();

        expect(screen.getByLabelText("🤒 Feeling sick")).toBeInTheDocument();
    });

    it("renders the mention unchanged when the user has no status", () => {
        renderMention();

        expect(screen.getByText("@Drw")).toBeInTheDocument();
        expect(screen.queryByText("🤒")).not.toBeInTheDocument();
    });
});
