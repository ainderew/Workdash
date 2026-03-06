import React from "react";
import EmojiPicker from "./EmojiPicker";

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
    return (
        <div
            data-message-reaction-picker="true"
            className={`rounded-xl border wd-border-strong shadow-[0_20px_40px_rgba(0,0,0,0.45)] ${className || ""}`}
        >
            <EmojiPicker onSelect={onSelectEmoji} onClose={onClose} />
        </div>
    );
}

export default ReactionPickerFlyout;
