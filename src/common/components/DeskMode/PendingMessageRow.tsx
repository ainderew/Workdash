import React from "react";
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from "lucide-react";
import type { PendingMessage } from "@/communication/chatV2/_types";
import useChatV2Store from "@/common/store/chatV2Store";
import UserAvatar from "./UserAvatar";
import { ComposerAttachmentTile } from "./Composer/ComposerAttachmentTile";

interface PendingMessageRowProps {
    pending: PendingMessage;
    displayName: string;
    avatarUrl: string | null;
}

export function PendingMessageRow({
    pending,
    displayName,
    avatarUrl,
}: PendingMessageRowProps) {
    const retryPendingMessage = useChatV2Store((s) => s.retryPendingMessage);
    const removePendingMessage = useChatV2Store((s) => s.removePendingMessage);
    const isFailed = pending.status === "failed";

    return (
        <div
            className="group relative mt-3 flex gap-3 px-2"
            data-pending-message-id={pending.clientMessageId}
        >
            <div className="mt-0.5 shrink-0">
                <UserAvatar
                    name={displayName}
                    image={avatarUrl}
                    spriteStyle={null}
                    size="lg"
                />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold wd-text-primary">
                        {displayName}
                    </span>
                    {isFailed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] wd-text-danger">
                            <AlertTriangle size={10} aria-hidden="true" />
                            Failed to send
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] wd-text-muted">
                            <Loader2
                                size={10}
                                className="animate-spin"
                                aria-hidden="true"
                            />
                            Sending…
                        </span>
                    )}
                </div>
                {pending.content && (
                    <div className="mt-1 whitespace-pre-wrap break-words text-sm wd-text-primary opacity-80">
                        {pending.content}
                    </div>
                )}
                {pending.uploads.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {pending.uploads.map((upload) => (
                            <ComposerAttachmentTile
                                key={upload.clientId}
                                upload={upload}
                                readOnly
                            />
                        ))}
                    </div>
                )}
                {isFailed && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="wd-text-muted">
                            {pending.error ?? "Message failed to send."}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                void retryPendingMessage(
                                    pending.roomId,
                                    pending.clientMessageId,
                                )
                            }
                            className="inline-flex items-center gap-1 font-medium text-[var(--wd-accent)] hover:underline wd-ring-focus"
                        >
                            <RotateCcw size={10} aria-hidden="true" />
                            Retry
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                removePendingMessage(
                                    pending.roomId,
                                    pending.clientMessageId,
                                )
                            }
                            className="inline-flex items-center gap-1 wd-text-muted hover:underline wd-ring-focus"
                        >
                            <Trash2 size={10} aria-hidden="true" />
                            Discard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
