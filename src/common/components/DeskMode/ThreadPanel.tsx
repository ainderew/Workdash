import React, { useEffect, useMemo, useState } from "react";
import {
    Ellipsis,
    ExternalLink,
    Forward,
    Pencil,
    RefreshCw,
    Reply,
    Smile,
    X,
} from "lucide-react";
import { toast } from "sonner";
import type {
    ChatV2CreateAttachment,
    ChatV2Message,
} from "@/communication/chatV2/_types";
import { getSignedAttachmentUrl } from "@/communication/chatV2/uploadService";
import Composer from "./Composer";

interface ThreadPanelProps {
    roomId: string | null;
    rootMessage: ChatV2Message | null;
    replies: ChatV2Message[];
    isLoading: boolean;
    isSending: boolean;
    error: string | null;
    className?: string;
    onClose: () => void;
    onRetry?: () => void;
    onSendReply: (
        content: string,
        attachments?: ChatV2CreateAttachment[],
    ) => Promise<void>;
}

const formatTime = (value: string | Date) =>
    new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

const byCreatedAtAsc = (a: ChatV2Message, b: ChatV2Message) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
};

type ThreadMessageRowProps = {
    message: ChatV2Message;
    isRootMessage: boolean;
    attachmentUrls: Record<string, string>;
};

function ThreadMessageRow({
    message,
    isRootMessage,
    attachmentUrls,
}: ThreadMessageRowProps) {
    const senderName = message.sender?.name?.trim() || `User ${message.senderUserId}`;
    const senderImage = message.sender?.image?.trim() || "";

    return (
        <article
            className="group relative px-0 py-1"
            data-chat-thread-message-id={message.id}
        >
            <div className="pointer-events-none absolute right-3 top-0 z-20 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <div className="pointer-events-auto inline-flex items-center gap-0.5 rounded-md border wd-border-subtle wd-bg-panel px-1 py-0.5 shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                    <button
                        type="button"
                        onClick={() =>
                            toast("Reactions is coming soon", {
                                description: "This action is a placeholder for now.",
                            })
                        }
                        title="Reactions (coming soon)"
                        className="h-7 w-7 rounded inline-flex items-center justify-center text-sm wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                    >
                        <Smile size={14} />
                    </button>
                    {isRootMessage && (
                        <button
                            type="button"
                            onClick={() =>
                                toast("Use the reply composer below", {
                                    description:
                                        "Replies append to this thread from the composer.",
                                })
                            }
                            title="Reply in thread"
                            className="h-7 w-7 rounded inline-flex items-center justify-center wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                        >
                            <Reply size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() =>
                            toast("Edit is coming soon", {
                                description: "This action is a placeholder for now.",
                            })
                        }
                        title="Edit (coming soon)"
                        className="h-7 w-7 rounded inline-flex items-center justify-center wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            toast("Forward is coming soon", {
                                description: "This action is a placeholder for now.",
                            })
                        }
                        title="Forward (coming soon)"
                        className="h-7 w-7 rounded inline-flex items-center justify-center wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                    >
                        <Forward size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            toast("More actions are coming soon", {
                                description: "This action is a placeholder for now.",
                            })
                        }
                        title="More actions (coming soon)"
                        className="h-7 w-7 rounded inline-flex items-center justify-center wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                    >
                        <Ellipsis size={15} />
                    </button>
                </div>
            </div>

            <div className="flex items-start gap-3 pr-24">
                <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden border wd-border-subtle wd-bg-panel inline-flex items-center justify-center text-xs font-semibold wd-text-primary">
                    {senderImage ? (
                        <img
                            src={senderImage}
                            alt={`${senderName} avatar`}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        senderName.charAt(0).toUpperCase()
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold wd-text-primary">
                            {senderName}
                        </span>
                        <span className="text-xs wd-text-muted">
                            {formatTime(message.createdAt)}
                        </span>
                        {message.editedAt && (
                            <span className="text-[10px] uppercase tracking-wide wd-text-muted">
                                edited
                            </span>
                        )}
                    </div>

                    {message.deletedAt ? (
                        <p className="text-sm italic wd-text-muted">Message deleted</p>
                    ) : (
                        <div className="space-y-2">
                            {message.content ? (
                                <p className="text-sm whitespace-pre-wrap break-words wd-text-secondary">
                                    {message.content}
                                </p>
                            ) : null}

                            {message.attachments.length > 0 ? (
                                <div className="space-y-1">
                                    {message.attachments.map((attachment) => {
                                        const signedUrl = attachmentUrls[attachment.objectKey];
                                        if (!signedUrl) {
                                            return (
                                                <div
                                                    key={attachment.id}
                                                    className="text-xs px-2 py-1 rounded wd-bg-panel-2 wd-text-muted border wd-border-subtle"
                                                >
                                                    Resolving {attachment.originalFileName}
                                                </div>
                                            );
                                        }

                                        if (attachment.isImage) {
                                            return (
                                                <img
                                                    key={attachment.id}
                                                    src={signedUrl}
                                                    alt={attachment.originalFileName}
                                                    className="rounded-md max-w-xs max-h-56 object-cover border wd-border-subtle"
                                                />
                                            );
                                        }

                                        return (
                                            <a
                                                key={attachment.id}
                                                href={signedUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded wd-bg-panel-2 wd-text-accent border wd-border-subtle"
                                            >
                                                <span className="truncate max-w-[240px]">
                                                    {attachment.originalFileName}
                                                </span>
                                                <ExternalLink size={11} />
                                            </a>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

function ThreadPanel({
    roomId,
    rootMessage,
    replies,
    isLoading,
    isSending,
    error,
    className,
    onClose,
    onRetry,
    onSendReply,
}: ThreadPanelProps) {
    const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

    const orderedReplies = useMemo(() => [...replies].sort(byCreatedAtAsc), [replies]);
    const allMessages = useMemo(
        () => (rootMessage ? [rootMessage, ...orderedReplies] : orderedReplies),
        [orderedReplies, rootMessage],
    );

    useEffect(() => {
        const unresolvedAttachments: Array<{ roomId: string; objectKey: string }> = [];

        for (const message of allMessages) {
            for (const attachment of message.attachments) {
                if (!attachmentUrls[attachment.objectKey]) {
                    unresolvedAttachments.push({
                        roomId: message.roomId,
                        objectKey: attachment.objectKey,
                    });
                }
            }
        }

        if (unresolvedAttachments.length === 0) {
            return;
        }

        let cancelled = false;

        void (async () => {
            const resolvedEntries = await Promise.all(
                unresolvedAttachments.map(async (attachment) => {
                    try {
                        const downloadUrl = await getSignedAttachmentUrl({
                            roomId: attachment.roomId,
                            objectKey: attachment.objectKey,
                        });
                        return [attachment.objectKey, downloadUrl] as const;
                    } catch {
                        return null;
                    }
                }),
            );

            if (cancelled) return;

            setAttachmentUrls((previous) => {
                const next = { ...previous };
                for (const entry of resolvedEntries) {
                    if (!entry) continue;
                    next[entry[0]] = entry[1];
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [allMessages, attachmentUrls]);

    return (
        <aside
            className={`flex h-full min-h-0 w-[370px] max-w-[45vw] min-w-[320px] flex-col border-l wd-border-subtle wd-bg-panel ${className ?? ""}`}
        >
            <header className="h-12 shrink-0 border-b wd-border-subtle px-3 flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold wd-text-primary">Thread</p>
                    <p className="text-[11px] wd-text-muted">Replies to main message</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="h-8 w-8 rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary inline-flex items-center justify-center transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                    aria-label="Close thread panel"
                >
                    <X size={15} />
                </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
                {isLoading ? (
                    <div className="text-xs wd-text-muted">Loading thread...</div>
                ) : error ? (
                    <div className="rounded-md border wd-border-subtle wd-bg-warning-soft p-3 text-xs wd-text-warning">
                        <p>{error}</p>
                        {onRetry ? (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="mt-2 h-7 rounded-md border wd-border-subtle wd-bg-elevated px-2 inline-flex items-center gap-1 text-xs wd-text-secondary transition-colors hover:wd-text-primary"
                            >
                                <RefreshCw size={11} />
                                Retry
                            </button>
                        ) : null}
                    </div>
                ) : !rootMessage ? (
                    <div className="text-xs wd-text-muted">
                        Select a message to view its thread.
                    </div>
                ) : (
                    <>
                        <ThreadMessageRow
                            message={rootMessage}
                            isRootMessage
                            attachmentUrls={attachmentUrls}
                        />

                        <div className="pl-11 pr-2 pt-2">
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-[var(--wd-border-subtle)]" />
                                <span className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                                    Replies
                                </span>
                                <div className="h-px flex-1 bg-[var(--wd-border-subtle)]" />
                            </div>
                        </div>

                        {orderedReplies.length === 0 ? (
                            <div className="pl-11 text-xs wd-text-muted">
                                No replies yet. Start the thread below.
                            </div>
                        ) : (
                            orderedReplies.map((reply) => (
                                <div key={reply.id} className="pl-6">
                                    <ThreadMessageRow
                                        message={reply}
                                        isRootMessage={false}
                                        attachmentUrls={attachmentUrls}
                                    />
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            <Composer
                roomId={roomId}
                disabled={!roomId || !rootMessage}
                isSending={isSending}
                inputId="desk-thread-reply-input"
                placeholder={
                    rootMessage
                        ? `Reply to ${rootMessage.sender?.name?.trim() || "thread"}`
                        : "Reply in thread"
                }
                onSend={onSendReply}
            />
        </aside>
    );
}

export default ThreadPanel;
