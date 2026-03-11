import React, { useEffect, useState } from "react";
import { Ellipsis, Forward, Pencil, Pin, Plus, Reply, Trash2 } from "lucide-react";
import { CHAT_REACTION_QUICK_EMOJIS } from "@/communication/chatV2/reactionCatalog";
import ReactionPickerFlyout from "./ReactionPickerFlyout";
import TwemojiSpan from "./TwemojiSpan";

type MessageHoverActionsProps = {
    canReply?: boolean;
    isPinned?: boolean;
    onReply?: () => void;
    onReact: (emoji: string) => void;
    onEdit?: () => void;
    onUnsend?: () => void;
    onTogglePin?: () => void;
    onFutureAction?: (label: string) => void;
    onFlyoutChange?: (open: boolean) => void;
    className?: string;
};

const iconButtonClassName =
    "h-8 w-8 rounded inline-flex items-center justify-center wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]";

const emojiButtonClassName =
    "h-8 min-w-8 rounded px-1 inline-flex items-center justify-center text-base leading-none wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]";

function SmileyFaceIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[14px] w-[14px]"
            aria-hidden="true"
        >
            <path d="M8.5 9v1" />
            <path d="M15.5 9v1" />
            <path d="M7.5 14c1.2 1.4 2.7 2 4.5 2s3.3-.6 4.5-2" />
        </svg>
    );
}

function ReactionTriggerIcon() {
    return (
        <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
            <SmileyFaceIcon />
            <Plus size={12} className="absolute -right-[6px] -top-[6px]" />
        </span>
    );
}

function MessageHoverActions({
    canReply = false,
    isPinned = false,
    onReply,
    onReact,
    onEdit,
    onUnsend,
    onTogglePin,
    onFutureAction,
    onFlyoutChange,
    className,
}: MessageHoverActionsProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const hasFlyout = isPickerOpen || isMoreOpen;

    useEffect(() => {
        onFlyoutChange?.(hasFlyout);
    }, [hasFlyout, onFlyoutChange]);

    useEffect(() => {
        if (!hasFlyout) return;

        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-message-reaction-picker='true']")) return;
            if (target?.closest("[data-message-more-actions='true']")) return;
            setIsPickerOpen(false);
            setIsMoreOpen(false);
        };

        window.addEventListener("mousedown", onMouseDown);
        return () => window.removeEventListener("mousedown", onMouseDown);
    }, [hasFlyout]);

    return (
        <div
            className={`pointer-events-none absolute right-0 top-0 ${hasFlyout ? "z-[200]" : "z-20"} -translate-y-1/2 transition-opacity ${hasFlyout ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"} ${className || ""}`}
        >
            <div
                className={`relative inline-flex items-center rounded-md border wd-border-subtle wd-bg-panel shadow-[0_8px_20px_rgba(0,0,0,0.35)] px-1.5 py-1 gap-1 ${hasFlyout ? "pointer-events-auto" : "pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto"}`}
            >
                {CHAT_REACTION_QUICK_EMOJIS.map((emoji) => (
                    <button
                        key={`quick-${emoji}`}
                        type="button"
                        onClick={() => onReact(emoji)}
                        title={`React ${emoji}`}
                        className={emojiButtonClassName}
                    >
                        <TwemojiSpan emoji={emoji} size={18} />
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => {
                        setIsMoreOpen(false);
                        setIsPickerOpen((current) => !current);
                    }}
                    title="Open reactions"
                    className={iconButtonClassName}
                >
                    <ReactionTriggerIcon />
                </button>

                {canReply ? (
                    <button
                        type="button"
                        onClick={onReply}
                        title="Reply in thread"
                        className={iconButtonClassName}
                    >
                        <Reply size={16} />
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={() => onFutureAction?.("Forward")}
                    title="Forward (coming soon)"
                    className={iconButtonClassName}
                >
                    <Forward size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setIsPickerOpen(false);
                        setIsMoreOpen((current) => !current);
                    }}
                    title="More actions"
                    className={iconButtonClassName}
                >
                    <Ellipsis size={17} />
                </button>

                {isMoreOpen ? (
                    <div
                        data-message-more-actions="true"
                        className="absolute right-0 top-[calc(100%+8px)] z-[180] min-w-[160px] rounded-md border wd-border-subtle wd-bg-panel p-1 shadow-[0_10px_24px_rgba(0,0,0,0.4)]"
                    >
                        {onTogglePin ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMoreOpen(false);
                                    onTogglePin();
                                }}
                                className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
                            >
                                <Pin size={14} />
                                {isPinned ? "Unpin message" : "Pin message"}
                            </button>
                        ) : null}
                        {onEdit ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMoreOpen(false);
                                    onEdit();
                                }}
                                className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
                            >
                                <Pencil size={14} />
                                Edit
                            </button>
                        ) : null}
                        {onUnsend ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMoreOpen(false);
                                    onUnsend();
                                }}
                                className="w-full rounded px-2 py-1.5 text-left text-sm text-red-300 transition-colors hover:bg-[rgba(239,68,68,0.12)] inline-flex items-center gap-2"
                            >
                                <Trash2 size={14} />
                                Delete message
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {isPickerOpen ? (
                    <ReactionPickerFlyout
                        className="absolute right-0 top-[calc(100%+8px)] z-[180]"
                        onSelectEmoji={(emoji) => {
                            onReact(emoji);
                            setIsPickerOpen(false);
                        }}
                        onClose={() => setIsPickerOpen(false)}
                    />
                ) : null}
            </div>
        </div>
    );
}

export default MessageHoverActions;
