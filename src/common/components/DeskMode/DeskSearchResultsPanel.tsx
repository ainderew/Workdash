import React, { useMemo, useState } from "react";
import type {
    ChatV2Message,
    ChatV2MessageSearchSort,
    ChatV2Room,
} from "@/communication/chatV2/_types";
import { ArrowUpDown } from "lucide-react";
import ChannelHashIcon from "./ChannelHashIcon";

interface DeskSearchResultsPanelProps {
    messages: ChatV2Message[];
    roomsById: Record<string, ChatV2Room>;
    totalCount: number;
    sort: ChatV2MessageSearchSort;
    isLoading: boolean;
    error: string | null;
    onSortChange: (sort: ChatV2MessageSearchSort) => void;
    onSelectResult: (message: ChatV2Message) => void;
}

const formatTimestamp = (value: string | Date) =>
    new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

function DeskSearchResultsPanel({
    messages,
    roomsById,
    totalCount,
    sort,
    isLoading,
    error,
    onSortChange,
    onSelectResult,
}: DeskSearchResultsPanelProps) {
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const groupedResults = useMemo(() => {
        const groups: Array<{
            roomId: string;
            roomName: string;
            messages: ChatV2Message[];
        }> = [];
        const groupMap = new Map<
            string,
            {
                roomId: string;
                roomName: string;
                messages: ChatV2Message[];
            }
        >();

        for (const message of messages) {
            const existingGroup = groupMap.get(message.roomId);
            if (existingGroup) {
                existingGroup.messages.push(message);
                continue;
            }

            const nextGroup = {
                roomId: message.roomId,
                roomName: roomsById[message.roomId]?.name || "Unknown room",
                messages: [message],
            };
            groupMap.set(message.roomId, nextGroup);
            groups.push(nextGroup);
        }

        return groups;
    }, [messages, roomsById]);

    const renderMessageCard = (message: ChatV2Message) => {
        const senderName = message.sender?.name?.trim() || `User ${message.senderUserId}`;
        const senderInitial = senderName.charAt(0).toUpperCase();
        const senderImage = message.sender?.image?.trim();
        const hasImageAttachment = message.attachments.some((attachment) =>
            attachment.isImage,
        );

        return (
            <button
                key={message.id}
                type="button"
                onClick={() => onSelectResult(message)}
                className="w-full text-left rounded-xl border wd-border-subtle wd-bg-elevated p-3 transition-colors hover:bg-[var(--wd-surface-base)]"
            >
                <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden border wd-border-subtle wd-bg-panel-2 flex items-center justify-center shrink-0">
                        {senderImage ? (
                            <img
                                src={senderImage}
                                alt={`${senderName} avatar`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-[0.85rem] font-semibold wd-text-primary">
                                {senderInitial}
                            </span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[0.85rem] font-semibold wd-text-accent truncate">
                                {senderName}
                            </span>
                            <span className="text-[0.85rem] wd-text-muted shrink-0">
                                {formatTimestamp(message.createdAt)}
                            </span>
                        </div>

                        <p className="mt-1 text-[0.85rem] wd-text-primary whitespace-pre-wrap break-words line-clamp-4">
                            {message.content || (hasImageAttachment ? "Image attachment" : "File attachment")}
                        </p>
                    </div>
                </div>
            </button>
        );
    };

    return (
        <aside className="w-[420px] max-w-[45vw] min-w-[320px] wd-bg-panel border-l wd-border-subtle flex flex-col min-h-0 text-[0.85rem]">
            <div className="h-14 border-b wd-border-subtle px-4 flex items-center justify-between gap-2">
                <h3 className="text-[0.85rem] font-semibold wd-text-primary leading-none">
                    {totalCount} Results
                </h3>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsSortMenuOpen((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 wd-bg-elevated wd-text-primary border wd-border-subtle transition-colors hover:bg-[var(--wd-surface-base)]"
                    >
                        <ArrowUpDown size={15} />
                        <span>Sort</span>
                    </button>

                    {isSortMenuOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-44 rounded-lg border wd-border-strong wd-bg-panel shadow-[0_16px_32px_rgba(0,0,0,0.45)] p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    onSortChange("LATEST");
                                    setIsSortMenuOpen(false);
                                }}
                                className={`w-full rounded-md px-3 py-2 text-left text-[0.85rem] transition-colors ${
                                    sort === "LATEST"
                                        ? "wd-bg-elevated wd-text-primary"
                                        : "wd-text-secondary hover:bg-[var(--wd-surface-elevated)]"
                                }`}
                            >
                                Latest first
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onSortChange("OLDEST");
                                    setIsSortMenuOpen(false);
                                }}
                                className={`w-full rounded-md px-3 py-2 text-left text-[0.85rem] transition-colors ${
                                    sort === "OLDEST"
                                        ? "wd-bg-elevated wd-text-primary"
                                        : "wd-text-secondary hover:bg-[var(--wd-surface-elevated)]"
                                }`}
                            >
                                Oldest first
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                {isLoading ? (
                    <div className="text-[0.85rem] wd-text-muted">Searching messages...</div>
                ) : error ? (
                    <div className="text-[0.85rem] wd-text-warning">{error}</div>
                ) : messages.length === 0 ? (
                    <div className="text-[0.85rem] wd-text-muted">No matching messages found.</div>
                ) : (
                    <div className="space-y-5">
                        {groupedResults.map((group) => (
                            <section key={group.roomId}>
                                <h4 className="text-[0.85rem] font-semibold wd-text-primary mb-3 inline-flex items-center gap-1">
                                    <ChannelHashIcon size={15} className="shrink-0 opacity-60" />{group.roomName}
                                </h4>
                                <div className="space-y-2">
                                    {group.messages.map((message) =>
                                        renderMessageCard(message),
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}

export default DeskSearchResultsPanel;
