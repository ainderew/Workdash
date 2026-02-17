import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import useChatV2Store from "@/common/store/chatV2Store";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import type { ChatV2Message, ChatV2Room } from "@/communication/chatV2/_types";
import Composer from "./Composer";
import MessageList from "./MessageList";

interface CompactChatShellProps {
    onClose: () => void;
}

const formatTime = (value: string | Date) =>
    new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

const toSearchSnippet = (message: ChatV2Message) => {
    const content = message.content?.trim();
    if (content) return content;
    if (message.attachments.length > 0) {
        return message.attachments.length === 1
            ? "1 attachment"
            : `${message.attachments.length} attachments`;
    }
    return "(no text)";
};

function CompactChatShell({ onClose }: CompactChatShellProps) {
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const initialize = useChatV2Store((state) => state.initialize);
    const isLoadingRooms = useChatV2Store((state) => state.isLoadingRooms);
    const roomOrder = useChatV2Store((state) => state.roomOrder);
    const roomsById = useChatV2Store((state) => state.roomsById);
    const currentRoomId = useChatV2Store((state) => state.currentRoomId);
    const messagesByRoomId = useChatV2Store((state) => state.messagesByRoomId);
    const isLoadingMessages = useChatV2Store((state) => state.isLoadingMessages);
    const isSending = useChatV2Store((state) => state.isSending);
    const selectRoom = useChatV2Store((state) => state.selectRoom);
    const sendMessage = useChatV2Store((state) => state.sendMessage);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchScope, setSearchScope] = useState<"current" | "all">("current");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<ChatV2Message[]>([]);
    const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
    const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false);
    const [roomPickerQuery, setRoomPickerQuery] = useState("");
    const searchRequestIdRef = useRef(0);
    const roomPickerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        void initialize();
    }, [initialize]);

    const rooms = useMemo<ChatV2Room[]>(
        () => roomOrder.map((roomId) => roomsById[roomId]).filter(Boolean),
        [roomOrder, roomsById],
    );
    const roomsByIdMemo = useMemo(
        () =>
            rooms.reduce<Record<string, ChatV2Room>>((accumulator, room) => {
                accumulator[room.id] = room;
                return accumulator;
            }, {}),
        [rooms],
    );
    const currentRoom = currentRoomId ? roomsById[currentRoomId] : null;
    const roomMessages = currentRoomId
        ? messagesByRoomId[currentRoomId] || []
        : [];
    const activeWorkspaceId = currentRoom?.workspaceId || rooms[0]?.workspaceId;
    const filteredRooms = useMemo(() => {
        const normalized = roomPickerQuery.trim().toLowerCase();
        if (normalized.length === 0) {
            return rooms;
        }

        return rooms.filter((room) =>
            room.name.toLowerCase().includes(normalized),
        );
    }, [roomPickerQuery, rooms]);

    useEffect(() => {
        if (!currentRoomId && rooms.length > 0) {
            void selectRoom(rooms[0].id);
        }
    }, [currentRoomId, rooms, selectRoom]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [searchQuery]);

    const hasSearchCriteria =
        debouncedSearchQuery.trim().length >= 2
        && (searchScope === "all" || !!currentRoomId);
    const isSearchPanelVisible =
        hasSearchCriteria || isSearching || searchResults.length > 0 || !!searchError;

    useEffect(() => {
        if (!hasSearchCriteria) {
            setSearchResults([]);
            setSearchError(null);
            setIsSearching(false);
            return;
        }

        const requestId = searchRequestIdRef.current + 1;
        searchRequestIdRef.current = requestId;
        setIsSearching(true);
        setSearchError(null);

        void (async () => {
            try {
                const response = await chatV2Service.searchMessages({
                    workspaceId: activeWorkspaceId,
                    query: debouncedSearchQuery.trim(),
                    roomId: searchScope === "current" ? currentRoomId || undefined : undefined,
                    sort: "LATEST",
                    limit: 40,
                });

                if (searchRequestIdRef.current !== requestId) {
                    return;
                }

                setSearchResults(response.messages);
                setIsSearching(false);
            } catch (searchErr) {
                if (searchRequestIdRef.current !== requestId) {
                    return;
                }

                setSearchResults([]);
                setIsSearching(false);
                setSearchError(
                    searchErr instanceof Error
                        ? searchErr.message
                        : "Failed to search messages",
                );
            }
        })();
    }, [
        activeWorkspaceId,
        chatV2Service,
        currentRoomId,
        debouncedSearchQuery,
        hasSearchCriteria,
        searchScope,
    ]);

    useEffect(() => {
        if (!isRoomPickerOpen) {
            return;
        }

        const handleOutsidePointerDown = (event: MouseEvent) => {
            if (!roomPickerRef.current) {
                return;
            }
            if (!roomPickerRef.current.contains(event.target as Node)) {
                setIsRoomPickerOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsRoomPickerOpen(false);
            }
        };

        window.addEventListener("mousedown", handleOutsidePointerDown);
        window.addEventListener("keydown", handleEscape);
        return () => {
            window.removeEventListener("mousedown", handleOutsidePointerDown);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [isRoomPickerOpen]);

    return (
        <section className="h-full flex flex-col wd-bg-app">
            <header className="px-3 py-3 border-b wd-border-subtle wd-bg-panel-2">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold wd-text-primary">2D Chat</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                        aria-label="Close chat"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="mt-2">
                    <div className="relative flex-1 min-w-0" ref={roomPickerRef}>
                        <button
                            type="button"
                            onClick={() => setIsRoomPickerOpen((current) => !current)}
                            className="w-full h-9 rounded-md border wd-border-subtle wd-bg-elevated px-2 flex items-center justify-between gap-2 text-left"
                        >
                            <span className="text-sm wd-text-primary truncate">
                                {currentRoom ? `# ${currentRoom.name}` : "Select room"}
                            </span>
                            <ChevronDown
                                size={14}
                                className={`wd-text-muted transition-transform ${
                                    isRoomPickerOpen ? "rotate-180" : "rotate-0"
                                }`}
                            />
                        </button>

                        {isRoomPickerOpen ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 rounded-md border wd-border-strong wd-bg-panel shadow-[0_16px_36px_rgba(0,0,0,0.45)] overflow-hidden">
                                <div className="p-2 border-b wd-border-subtle">
                                    <div className="relative">
                                        <Search
                                            size={13}
                                            className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
                                        />
                                        <input
                                            type="text"
                                            value={roomPickerQuery}
                                            onChange={(event) =>
                                                setRoomPickerQuery(event.target.value)
                                            }
                                            placeholder="Find room..."
                                            className="h-8 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-8 pr-2 text-xs wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                                        />
                                    </div>
                                </div>

                                <div className="max-h-52 overflow-y-auto p-1.5">
                                    {isLoadingRooms ? (
                                        <p className="px-2 py-1.5 text-xs wd-text-muted">
                                            Loading rooms...
                                        </p>
                                    ) : filteredRooms.length === 0 ? (
                                        <p className="px-2 py-1.5 text-xs wd-text-muted">
                                            No matching rooms.
                                        </p>
                                    ) : (
                                        filteredRooms.map((room) => {
                                            const isActive = room.id === currentRoomId;
                                            return (
                                                <button
                                                    key={room.id}
                                                    type="button"
                                                    onClick={() => {
                                                        void selectRoom(room.id);
                                                        setIsRoomPickerOpen(false);
                                                        setRoomPickerQuery("");
                                                    }}
                                                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                                                        isActive
                                                            ? "wd-bg-accent-soft wd-text-accent"
                                                            : "wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                                                    }`}
                                                >
                                                    # {room.name}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 wd-text-muted"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search messages"
                            className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-9 pr-8 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                        />
                        {searchQuery.trim().length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                                aria-label="Clear search query"
                            >
                                <X size={14} />
                            </button>
                        ) : null}
                    </div>

                    <select
                        value={searchScope}
                        onChange={(event) => {
                            setSearchScope(
                                event.target.value === "all" ? "all" : "current",
                            );
                        }}
                        className="h-9 rounded-md border wd-border-subtle wd-bg-elevated px-2 text-xs wd-text-primary outline-none"
                    >
                        <option value="current">This room</option>
                        <option value="all">All rooms</option>
                    </select>
                </div>
            </header>

            <div className="flex-1 min-h-0 flex flex-col">
                {isSearchPanelVisible ? (
                    <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                        {isSearching ? (
                            <div className="rounded-md border wd-border-subtle wd-bg-elevated p-3 text-sm wd-text-muted">
                                Searching...
                            </div>
                        ) : searchError ? (
                            <div className="rounded-md border wd-border-subtle wd-bg-warning-soft p-3 text-sm wd-text-warning">
                                {searchError}
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="rounded-md border wd-border-subtle wd-bg-elevated p-3 text-sm wd-text-muted">
                                No messages found.
                            </div>
                        ) : (
                            searchResults.map((message) => {
                                const senderName = message.sender?.name?.trim()
                                    || `User ${message.senderUserId}`;
                                const roomName = roomsByIdMemo[message.roomId]?.name || "Unknown";

                                return (
                                    <button
                                        key={message.id}
                                        type="button"
                                        onClick={() => {
                                            void (async () => {
                                                await selectRoom(message.roomId);
                                                setFocusedMessageId(message.id);
                                                setSearchQuery("");
                                                setDebouncedSearchQuery("");
                                                setSearchResults([]);
                                                setSearchError(null);
                                            })();
                                        }}
                                        className="w-full text-left rounded-md border wd-border-subtle wd-bg-elevated p-3 transition-colors hover:bg-[var(--wd-surface-base)]"
                                    >
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span className="font-semibold wd-text-primary truncate">
                                                {senderName}
                                            </span>
                                            <span className="wd-text-muted shrink-0">
                                                {formatTime(message.createdAt)}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-xs wd-text-muted truncate">
                                            # {roomName}
                                        </div>
                                        <p className="mt-1 text-sm wd-text-primary line-clamp-2">
                                            {toSearchSnippet(message)}
                                        </p>
                                    </button>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                        <MessageList
                            messages={roomMessages}
                            isLoading={isLoadingMessages}
                            focusedMessageId={focusedMessageId}
                        />
                    </div>
                )}
            </div>

            <Composer
                roomId={currentRoomId}
                disabled={!currentRoomId}
                isSending={isSending}
                onSend={async (content, attachments) => {
                    await sendMessage(content, attachments);
                }}
            />
        </section>
    );
}

export default CompactChatShell;
