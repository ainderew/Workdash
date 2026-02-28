import React from "react";
import { Pin, X } from "lucide-react";
import type { ChatV2PinnedMessage } from "@/communication/chatV2/_types";
import { getDisplayName } from "@/common/utils/displayName";
import UserAvatar from "./UserAvatar";

interface PinnedMessagesPanelProps {
    pinnedMessages: ChatV2PinnedMessage[];
    isLoading: boolean;
    panelClassName?: string;
    onJumpToMessage: (pinnedMessage: ChatV2PinnedMessage) => void;
    onUnpin: (pinnedMessage: ChatV2PinnedMessage) => void;
}

function PinnedMessagesPanel({
    pinnedMessages,
    isLoading,
    panelClassName,
    onJumpToMessage,
    onUnpin,
}: PinnedMessagesPanelProps) {
    return (
        <div
            data-pinned-messages-panel="true"
            className={`absolute z-[280] w-[min(22rem,calc(100vw-2rem))] rounded-xl border wd-border-strong wd-bg-panel shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden ${panelClassName ?? "right-0 top-[calc(100%+10px)]"}`}
        >
            <div className="h-10 px-3 border-b wd-border-subtle flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide wd-text-primary inline-flex items-center gap-1.5">
                    <Pin size={12} />
                    Pinned Messages ({pinnedMessages.length})
                </p>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
                {isLoading ? (
                    <p className="px-2 py-2 text-xs wd-text-muted">
                        Loading pinned messages...
                    </p>
                ) : pinnedMessages.length === 0 ? (
                    <p className="px-2 py-4 text-xs wd-text-muted text-center">
                        No pinned messages in this channel.
                    </p>
                ) : (
                    <div className="space-y-1">
                        {pinnedMessages.map((pin) => {
                            const senderName = getDisplayName(
                                pin.message.sender,
                                `User ${pin.message.senderUserId}`,
                            );
                            const pinnedByName = getDisplayName(
                                pin.pinnedBy,
                                `User ${pin.pinnedByUserId}`,
                            );

                            return (
                                <div
                                    key={pin.id}
                                    className="group/pin relative rounded-md border wd-border-subtle wd-bg-elevated px-2.5 py-2 cursor-pointer transition-colors hover:bg-[var(--wd-surface-base)]"
                                    onClick={() => onJumpToMessage(pin)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") onJumpToMessage(pin);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <UserAvatar
                                            name={senderName}
                                            image={pin.message.sender?.image}
                                            size="xs"
                                            className="mt-0.5"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold wd-text-primary truncate">
                                                {senderName}
                                            </p>
                                            <p className="mt-0.5 text-xs wd-text-secondary line-clamp-2">
                                                {pin.message.content || "(attachment)"}
                                            </p>
                                            <p className="mt-1 text-[11px] wd-text-muted">
                                                Pinned by {pinnedByName}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUnpin(pin);
                                            }}
                                            className="opacity-0 group-hover/pin:opacity-100 h-6 w-6 shrink-0 rounded inline-flex items-center justify-center wd-text-muted transition-all hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                                            aria-label="Unpin message"
                                            title="Unpin"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PinnedMessagesPanel;
