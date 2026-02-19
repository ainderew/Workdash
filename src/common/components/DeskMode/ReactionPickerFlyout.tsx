import React, { useMemo } from "react";
import {
    CHAT_REACTION_EMOJI_CATALOG,
    CHAT_REACTION_QUICK_EMOJIS,
    isSupportedReactionEmoji,
} from "@/communication/chatV2/reactionCatalog";

type ReactionPickerFlyoutProps = {
    frequentEmojis?: string[];
    onSelectEmoji: (emoji: string) => void;
    className?: string;
};

const getFrequentRow = (frequentEmojis?: string[]) => {
    const uniqueFrequent = Array.from(
        new Set(
            (frequentEmojis || [])
                .filter((emoji) => isSupportedReactionEmoji(emoji))
                .slice(0, 6),
        ),
    );
    if (uniqueFrequent.length > 0) return uniqueFrequent;
    return [...CHAT_REACTION_QUICK_EMOJIS];
};

function ReactionPickerFlyout({
    frequentEmojis = [],
    onSelectEmoji,
    className,
}: ReactionPickerFlyoutProps) {
    const frequentRow = useMemo(
        () => getFrequentRow(frequentEmojis),
        [frequentEmojis],
    );

    return (
        <div
            data-message-reaction-picker="true"
            className={`w-[320px] rounded-xl border wd-border-strong wd-bg-panel shadow-[0_20px_40px_rgba(0,0,0,0.45)] p-2 ${className || ""}`}
        >
            <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                    Frequent
                </p>
                <div className="grid grid-cols-6 gap-1">
                    {frequentRow.map((emoji) => (
                        <button
                            key={`frequent-${emoji}`}
                            type="button"
                            onClick={() => onSelectEmoji(emoji)}
                            className="h-8 rounded-md text-lg wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                            title={`React ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-2 border-t wd-border-subtle pt-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                    All Emojis
                </p>
                <div className="grid grid-cols-8 gap-1">
                    {CHAT_REACTION_EMOJI_CATALOG.map((emoji) => (
                        <button
                            key={`all-${emoji}`}
                            type="button"
                            onClick={() => onSelectEmoji(emoji)}
                            className="h-8 rounded-md text-lg wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                            title={`React ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ReactionPickerFlyout;
