import React, { useEffect, useState } from "react";
import { Ellipsis, Forward, Pencil, Reply, Smile } from "lucide-react";
import { CHAT_REACTION_QUICK_EMOJIS } from "@/communication/chatV2/reactionCatalog";
import ReactionPickerFlyout from "./ReactionPickerFlyout";

type MessageHoverActionsProps = {
    canReply?: boolean;
    frequentEmojis?: string[];
    onReply?: () => void;
    onReact: (emoji: string) => void;
    onFutureAction?: (label: string) => void;
    className?: string;
};

const iconButtonClassName =
    "h-7 w-7 rounded inline-flex items-center justify-center wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]";

const emojiButtonClassName =
    "h-7 min-w-7 rounded px-1 inline-flex items-center justify-center text-sm leading-none wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]";

function MessageHoverActions({
    canReply = false,
    frequentEmojis = [],
    onReply,
    onReact,
    onFutureAction,
    className,
}: MessageHoverActionsProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    useEffect(() => {
        if (!isPickerOpen) return;

        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-message-reaction-picker='true']")) return;
            setIsPickerOpen(false);
        };

        window.addEventListener("mousedown", onMouseDown);
        return () => window.removeEventListener("mousedown", onMouseDown);
    }, [isPickerOpen]);

    return (
        <div
            className={`pointer-events-none absolute right-0 top-0 z-20 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${className || ""}`}
        >
            <div
                className="pointer-events-auto relative inline-flex items-center rounded-md border wd-border-subtle wd-bg-panel shadow-[0_8px_20px_rgba(0,0,0,0.35)] px-1 py-0.5 gap-0.5"
            >
                {CHAT_REACTION_QUICK_EMOJIS.map((emoji) => (
                    <button
                        key={`quick-${emoji}`}
                        type="button"
                        onClick={() => onReact(emoji)}
                        title={`React ${emoji}`}
                        className={emojiButtonClassName}
                    >
                        {emoji}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => setIsPickerOpen((current) => !current)}
                    title="Open reactions"
                    className={iconButtonClassName}
                >
                    <Smile size={14} />
                </button>

                {canReply ? (
                    <button
                        type="button"
                        onClick={onReply}
                        title="Reply in thread"
                        className={iconButtonClassName}
                    >
                        <Reply size={14} />
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={() => onFutureAction?.("Edit")}
                    title="Edit (coming soon)"
                    className={iconButtonClassName}
                >
                    <Pencil size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => onFutureAction?.("Forward")}
                    title="Forward (coming soon)"
                    className={iconButtonClassName}
                >
                    <Forward size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => onFutureAction?.("More actions")}
                    title="More actions (coming soon)"
                    className={iconButtonClassName}
                >
                    <Ellipsis size={15} />
                </button>

                {isPickerOpen ? (
                    <ReactionPickerFlyout
                        className="absolute right-0 bottom-[calc(100%+8px)] z-[180]"
                        frequentEmojis={frequentEmojis}
                        onSelectEmoji={(emoji) => {
                            onReact(emoji);
                            setIsPickerOpen(false);
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}

export default MessageHoverActions;
