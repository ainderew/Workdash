import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import TwemojiSpan from "./TwemojiSpan";
import { SUPER_REACTION_EMOJIS } from "@/common/config/superReactionAnimations";

type ReactionPickerFlyoutProps = {
    onSelectEmoji: (emoji: string) => void;
    onClose?: () => void;
    className?: string;
};

function ReactionPickerFlyout({
    onSelectEmoji,
    onClose,
    className,
}: ReactionPickerFlyoutProps) {
    const [superOpen, setSuperOpen] = useState(true);

    return (
        <div
            data-message-reaction-picker="true"
            className={`rounded-xl border wd-border-strong shadow-[0_20px_40px_rgba(0,0,0,0.45)] ${className || ""}`}
        >
            <div className="border-b wd-border-subtle wd-bg-panel rounded-t-xl">
                <button
                    type="button"
                    onClick={() => setSuperOpen((v) => !v)}
                    className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-left transition-colors hover:wd-bg-elevated rounded-t-xl"
                >
                    <ChevronDown
                        size={12}
                        className={`wd-text-muted transition-transform duration-150 ${superOpen ? "" : "-rotate-90"}`}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted">
                        Super Reactions
                    </span>
                </button>
                {superOpen && (
                    <div className="flex flex-wrap gap-1 px-3 pb-2">
                        {SUPER_REACTION_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onSelectEmoji(emoji)}
                                className="cursor-pointer rounded-lg p-1.5 transition-all duration-100 hover:scale-110 hover:wd-bg-elevated active:scale-95"
                                title={`React with ${emoji}`}
                            >
                                <TwemojiSpan emoji={emoji} size={28} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <EmojiPicker onSelect={onSelectEmoji} onClose={onClose} />
        </div>
    );
}

export default ReactionPickerFlyout;
