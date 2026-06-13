import React, { useEffect } from "react";
import { CornerUpLeft, X } from "lucide-react";
import type { ChatV2Message } from "@/communication/chatV2/_types";
import { getDisplayName } from "@/common/utils/displayName";

interface ReplyContextBarProps {
    target: ChatV2Message;
    onCancel: () => void;
}

/** Best-effort one-line plain-text preview of a message body. */
function toSnippet(content: string): string {
    if (!content) return "";
    return content
        .replace(/<@!?(\d+)>/g, "@mention")
        .replace(/<:([a-z0-9_]+):\d+>/gi, ":$1:")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
}

export function ReplyContextBar({ target, onCancel }: ReplyContextBarProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onCancel();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onCancel]);

    const name = getDisplayName(target.sender, `User ${target.senderUserId}`);
    const snippet = toSnippet(target.content);
    const fallback = target.attachments.length > 0 ? "Attachment" : "";

    return (
        <div className="wd-reply-context mb-1.5 flex items-center gap-2 rounded-t-lg border border-b-0 wd-border-subtle wd-bg-elevated px-3 py-1.5">
            <CornerUpLeft
                size={14}
                className="shrink-0 text-[var(--wd-accent)]"
                aria-hidden="true"
            />
            <p className="min-w-0 flex-1 truncate text-xs wd-text-muted">
                Replying to{" "}
                <span className="font-semibold wd-text-primary">{name}</span>
                {(snippet || fallback) && (
                    <span className="ml-1.5">{snippet || fallback}</span>
                )}
            </p>
            <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel reply"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded wd-text-muted transition-colors hover:bg-[var(--wd-surface-base)] hover:wd-text-primary"
            >
                <X size={13} />
            </button>
        </div>
    );
}
