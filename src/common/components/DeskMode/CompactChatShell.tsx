import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, Search, UserRoundPlus, X } from "lucide-react";
import useChatV2Store from "@/common/store/chatV2Store";
import useUserStore from "@/common/store/useStore";
import ChannelHashIcon from "./ChannelHashIcon";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import type { ChatV2DirectRoom, ChatV2Message, ChatV2Room } from "@/communication/chatV2/_types";
import Composer from "./Composer";
import GuildRail from "./GuildRail";
import MessageList from "./MessageList";
import ThreadPanel from "./ThreadPanel";
import UserNotificationsPanel from "./UserNotificationsPanel";
import { getDisplayName } from "@/common/utils/displayName";
import { useResolveUserName } from "@/common/hooks/useResolveUserName";
import { formatChatMessageTimestamp } from "@/common/utils/messageTimestamp";

import { buildMemberColorMap } from "@/common/utils/roleColor";

interface CompactChatShellProps {
    onClose: () => void;
}

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

const byCreatedAtAsc = (a: ChatV2Message, b: ChatV2Message) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
};

function CompactChatShell({ onClose }: CompactChatShellProps) {
    const backendUser = useUserStore((s) => s.backendUser);
    const resolveUserName = useResolveUserName();
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const initialize = useChatV2Store((state) => state.initialize);
    const roomOrder = useChatV2Store((state) => state.roomOrder);
    const roomsById = useChatV2Store((state) => state.roomsById);
    const directRoomOrder = useChatV2Store((state) => state.directRoomOrder);
    const directRoomsById = useChatV2Store((state) => state.directRoomsById);
    const friends = useChatV2Store((state) => state.friends);
    const currentRoomId = useChatV2Store((state) => state.currentRoomId);
    const railView = useChatV2Store((state) => state.railView);
    const selectedWorkspaceId = useChatV2Store((state) => state.selectedWorkspaceId);
    const setRailView = useChatV2Store((state) => state.setRailView);
    const setSelectedWorkspaceId = useChatV2Store((state) => state.setSelectedWorkspaceId);
    const messagesByRoomId = useChatV2Store((state) => state.messagesByRoomId);
    const isLoadingRooms = useChatV2Store((state) => state.isLoadingRooms);
    const isLoadingDirectRooms = useChatV2Store((state) => state.isLoadingDirectRooms);
    const isLoadingFriends = useChatV2Store((state) => state.isLoadingFriends);
    const isLoadingMessages = useChatV2Store((state) => state.isLoadingMessages);
    const isSending = useChatV2Store((state) => state.isSending);
    const selectRoom = useChatV2Store((state) => state.selectRoom);
    const sendMessage = useChatV2Store((state) => state.sendMessage);
    const toggleMessageReaction = useChatV2Store((state) => state.toggleMessageReaction);
    const membersByRoomId = useChatV2Store((state) => state.membersByRoomId);
    const reloadDirectRooms = useChatV2Store((state) => state.reloadDirectRooms);
    const reloadFriends = useChatV2Store((state) => state.reloadFriends);
    const openDirectMessage = useChatV2Store((state) => state.openDirectMessage);
    const unreadByRoomId = useChatV2Store((state) => state.unreadByRoomId);
    const getWorkspaceUnreadTotal = useChatV2Store((state) => state.getWorkspaceUnreadTotal);
    const getDirectUnreadTotal = useChatV2Store((state) => state.getDirectUnreadTotal);
    const friendRequests = useChatV2Store((state) => state.friendRequests);
    const notifications = useChatV2Store((state) => state.notifications);
    const isLoadingFriendRequests = useChatV2Store(
        (state) => state.isLoadingFriendRequests,
    );
    const isLoadingNotifications = useChatV2Store(
        (state) => state.isLoadingNotifications,
    );
    const reloadFriendRequests = useChatV2Store(
        (state) => state.reloadFriendRequests,
    );
    const reloadNotifications = useChatV2Store(
        (state) => state.reloadNotifications,
    );
    const markNotificationsRead = useChatV2Store(
        (state) => state.markNotificationsRead,
    );
    const respondToFriendRequest = useChatV2Store(
        (state) => state.respondToFriendRequest,
    );
    const incomingFriendRequestCount = useChatV2Store(
        (state) => state.getIncomingFriendRequestCount(),
    );
    const unreadNotificationCount = useChatV2Store(
        (state) => state.getUnreadNotificationCount(),
    );

    const [searchQuery, setSearchQuery] = useState("");
    const [searchScope, setSearchScope] = useState<"current" | "all">("current");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<ChatV2Message[]>([]);
    const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
    const [dmFriendQuery, setDmFriendQuery] = useState("");
    const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false);
    const [roomPickerQuery, setRoomPickerQuery] = useState("");
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [hasUnreadNotificationDot, setHasUnreadNotificationDot] = useState(false);
    const [activeThreadRootId, setActiveThreadRootId] = useState<string | null>(null);
    const [threadRootMessage, setThreadRootMessage] = useState<ChatV2Message | null>(
        null,
    );
    const [threadReplies, setThreadReplies] = useState<ChatV2Message[]>([]);
    const [isLoadingThread, setIsLoadingThread] = useState(false);
    const [threadError, setThreadError] = useState<string | null>(null);
    const [memberRoleColors, setMemberRoleColors] = useState<Map<number, string>>(new Map());
    const searchRequestIdRef = useRef(0);
    const roomPickerRef = useRef<HTMLDivElement | null>(null);
    const notificationsRef = useRef<HTMLDivElement | null>(null);
    const previousIncomingCountRef = useRef<number | null>(null);
    const localBackendUserId = backendUser?.id;

    useEffect(() => {
        void initialize();
    }, [initialize]);

    const rooms = useMemo<ChatV2Room[]>(
        () => roomOrder.map((roomId) => roomsById[roomId]).filter(Boolean),
        [roomOrder, roomsById],
    );

    const directRooms = useMemo<ChatV2DirectRoom[]>(
        () => directRoomOrder.map((id) => directRoomsById[id]).filter(Boolean),
        [directRoomOrder, directRoomsById],
    );

    useEffect(() => {
        if (railView !== "dm") return;
        if (directRoomOrder.length > 0 && friends.length > 0) return;

        void reloadDirectRooms();
        void reloadFriends("ACCEPTED");
    }, [directRoomOrder.length, friends.length, railView, reloadDirectRooms, reloadFriends]);

    const workspaceOptions = useMemo(
        () =>
            Array.from(
                new Map(
                    rooms
                        .filter((room) => room.type !== "DIRECT")
                        .map((room) => [
                            room.workspaceId,
                            {
                                id: room.workspaceId,
                                name: room.workspace?.name?.trim() || "Workspace",
                                unreadCount: getWorkspaceUnreadTotal(room.workspaceId),
                            },
                        ]),
                ).values(),
            ),
        [getWorkspaceUnreadTotal, rooms, unreadByRoomId],
    );

    const serverRooms = useMemo(() => {
        const nonDirect = rooms.filter((room) => room.type !== "DIRECT");
        if (!selectedWorkspaceId) return nonDirect;
        return nonDirect.filter((room) => room.workspaceId === selectedWorkspaceId);
    }, [rooms, selectedWorkspaceId]);

    const activeRooms = railView === "dm"
        ? directRooms.map((entry) => entry.room)
        : serverRooms;

    const currentRoom = currentRoomId ? roomsById[currentRoomId] : null;
    const roomMessages = currentRoomId
        ? messagesByRoomId[currentRoomId] || []
        : [];

    useEffect(() => {
        if (!selectedWorkspaceId) {
            setMemberRoleColors(new Map());
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const members = await chatV2Service.listWorkspaceMembers(selectedWorkspaceId);
                if (cancelled) return;
                const ownerUserId = currentRoom?.workspace?.ownerUserId ?? 0;
                setMemberRoleColors(buildMemberColorMap(members, ownerUserId));
            } catch {
                // Non-critical
            }
        })();
        return () => { cancelled = true; };
    }, [selectedWorkspaceId, chatV2Service, currentRoom?.workspace?.ownerUserId]);

    useEffect(() => {
        if (currentRoomId) return;

        if (railView === "dm") {
            const firstDmRoom = directRooms[0]?.room.id;
            if (firstDmRoom) {
                void selectRoom(firstDmRoom);
            }
            return;
        }

        const firstServerRoom = serverRooms[0]?.id;
        if (firstServerRoom) {
            void selectRoom(firstServerRoom);
        }
    }, [currentRoomId, directRooms, railView, selectRoom, serverRooms]);

    useEffect(() => {
        setActiveThreadRootId(null);
        setThreadRootMessage(null);
        setThreadReplies([]);
        setThreadError(null);
        setIsLoadingThread(false);
    }, [currentRoomId]);

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

    const activeWorkspaceId = currentRoom?.workspaceId || activeRooms[0]?.workspaceId;

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

    useEffect(() => {
        if (!isNotificationsOpen) {
            return;
        }

        const closeNotifications = () => {
            setIsNotificationsOpen(false);
        };

        const onMouseDown = (event: MouseEvent) => {
            if (!notificationsRef.current) {
                return;
            }
            if (notificationsRef.current.contains(event.target as Node)) {
                return;
            }
            closeNotifications();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeNotifications();
            }
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", closeNotifications, true);
        window.addEventListener("resize", closeNotifications);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", closeNotifications, true);
            window.removeEventListener("resize", closeNotifications);
        };
    }, [isNotificationsOpen]);

    useEffect(() => {
        const previousCount = previousIncomingCountRef.current;

        if (unreadNotificationCount > 0 && !isNotificationsOpen) {
            setHasUnreadNotificationDot(true);
        } else if (incomingFriendRequestCount === 0) {
            setHasUnreadNotificationDot(false);
        } else if (previousCount === null) {
            setHasUnreadNotificationDot(true);
        } else if (
            incomingFriendRequestCount > previousCount
            && !isNotificationsOpen
        ) {
            setHasUnreadNotificationDot(true);
        } else if (isNotificationsOpen) {
            setHasUnreadNotificationDot(false);
        }

        previousIncomingCountRef.current = incomingFriendRequestCount;
    }, [incomingFriendRequestCount, isNotificationsOpen, unreadNotificationCount]);

    const filteredRooms = useMemo(() => {
        const normalized = roomPickerQuery.trim().toLowerCase();
        if (normalized.length === 0) {
            return activeRooms;
        }

        return activeRooms.filter((room) =>
            room.name.toLowerCase().includes(normalized),
        );
    }, [activeRooms, roomPickerQuery]);

    const filteredDmFriends = useMemo(() => {
        const normalized = dmFriendQuery.trim().toLowerCase();
        if (!normalized) return [];

        return friends
            .filter((entry) =>
                getDisplayName(entry.peerUser, `User ${entry.peerUser.id}`)
                    .toLowerCase()
                    .includes(normalized),
            )
            .slice(0, 6);
    }, [dmFriendQuery, friends]);

    useEffect(() => {
        if (!activeThreadRootId) return;

        const rootFromTimeline = roomMessages.find(
            (message) =>
                message.id === activeThreadRootId && !message.replyToMessageId,
        );
        if (rootFromTimeline) {
            setThreadRootMessage(rootFromTimeline);
        }

        const realtimeReplies = roomMessages.filter(
            (message) => message.replyToMessageId === activeThreadRootId,
        );
        if (realtimeReplies.length === 0) {
            return;
        }

        setThreadReplies((previous) => {
            const byId = new Map<string, ChatV2Message>();
            for (const reply of previous) {
                byId.set(reply.id, reply);
            }
            for (const reply of realtimeReplies) {
                byId.set(reply.id, {
                    ...(byId.get(reply.id) || {}),
                    ...reply,
                });
            }
            return Array.from(byId.values()).sort(byCreatedAtAsc);
        });
    }, [activeThreadRootId, roomMessages]);

    const loadThread = async (rootMessageId: string, roomIdOverride?: string) => {
        const threadRoomId = roomIdOverride || currentRoomId;
        if (!threadRoomId) return;

        setIsLoadingThread(true);
        setThreadError(null);
        try {
            const thread = await chatV2Service.getThread(threadRoomId, rootMessageId, {
                limit: 200,
            });
            setThreadRootMessage(thread.rootMessage);
            setThreadReplies([...thread.replies].sort(byCreatedAtAsc));
            setIsLoadingThread(false);
        } catch (error) {
            setIsLoadingThread(false);
            setThreadError(
                error instanceof Error ? error.message : "Failed to load thread",
            );
        }
    };

    return (
        <section className="h-full min-h-0 flex wd-bg-app overflow-hidden wd-desk-mode-filled-icons">
            <GuildRail
                workspaces={workspaceOptions}
                railView={railView}
                selectedWorkspaceId={selectedWorkspaceId}
                dmUnreadCount={getDirectUnreadTotal()}
                onSelectWorkspace={(workspaceId) => {
                    setRailView("server");
                    setSelectedWorkspaceId(workspaceId);
                    void useChatV2Store.getState().reloadRoomStructure().then(() => {
                        const roomId = useChatV2Store.getState().currentRoomId;
                        if (roomId) {
                            void selectRoom(roomId);
                        }
                    });
                }}
                onSelectDm={() => {
                    setRailView("dm");
                    const firstDmRoom = directRooms[0]?.room.id;
                    if (firstDmRoom) {
                        void selectRoom(firstDmRoom);
                    }
                }}
            />

            <aside className="w-56 shrink-0 border-r wd-border-subtle wd-bg-panel min-h-0 flex flex-col">
                <div className="px-3 h-12 border-b wd-border-subtle flex items-center">
                    <p className="text-sm font-semibold wd-text-primary">
                        {railView === "dm" ? "Direct Messages" : "Rooms"}
                    </p>
                </div>

                {railView === "dm" ? (
                    <div className="px-3 py-2 border-b wd-border-subtle">
                        <div className="relative">
                            <Search
                                size={13}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
                            />
                            <input
                                type="text"
                                value={dmFriendQuery}
                                onChange={(event) => setDmFriendQuery(event.target.value)}
                                placeholder="Search friends"
                                className="h-8 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-8 pr-2 text-xs wd-text-primary outline-none"
                            />
                        </div>
                    </div>
                ) : null}

                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-2">
                    {railView === "dm" && dmFriendQuery.trim().length > 0 ? (
                        <div className="space-y-1">
                            {isLoadingFriends ? (
                                <p className="px-2 py-1 text-xs wd-text-muted">Loading friends...</p>
                            ) : filteredDmFriends.length === 0 ? (
                                <p className="px-2 py-1 text-xs wd-text-muted">No matching friends.</p>
                            ) : (
                                filteredDmFriends.map((entry) => (
                                    <button
                                        key={entry.friendshipId}
                                        type="button"
                                        onClick={() => {
                                            void openDirectMessage(entry.peerUser.id);
                                        }}
                                        className="w-full px-2 py-1.5 rounded-md text-left text-xs wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] flex items-center justify-between gap-2"
                                    >
                                        <span className="truncate">
                                            {getDisplayName(
                                                entry.peerUser,
                                                `User ${entry.peerUser.id}`,
                                            )}
                                        </span>
                                        <UserRoundPlus size={12} className="wd-text-secondary" />
                                    </button>
                                ))
                            )}
                        </div>
                    ) : null}

                    {railView === "dm" ? (
                        isLoadingDirectRooms ? (
                            <p className="px-2 py-1 text-xs wd-text-muted">Loading conversations...</p>
                        ) : directRooms.length === 0 ? (
                            <p className="px-2 py-1 text-xs wd-text-muted">No direct messages yet.</p>
                        ) : (
                            directRooms.map((entry) => {
                                const isActive = currentRoomId === entry.room.id;
                                const dmUnreadCount = unreadByRoomId[entry.room.id] ?? entry.room.unreadCount ?? 0;
                                const hasDmUnread = !isActive && dmUnreadCount > 0;
                                return (
                                    <button
                                        key={entry.directRoomId}
                                        type="button"
                                        onClick={() => {
                                            void selectRoom(entry.room.id);
                                        }}
                                        className={`w-full px-2 py-1.5 rounded-md text-left text-xs transition-colors flex items-center justify-between gap-2 ${
                                            isActive
                                                ? "wd-bg-accent-soft wd-text-accent"
                                                : "wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                                        }`}
                                    >
                                        <span className="truncate">
                                            {getDisplayName(
                                                entry.peerUser,
                                                `User ${entry.peerUser.id}`,
                                            )}
                                        </span>
                                        {hasDmUnread ? (
                                            <span className="h-4 min-w-4 px-1 rounded-full bg-[var(--wd-danger)] text-white text-[10px] font-bold inline-flex items-center justify-center">
                                                {dmUnreadCount > 99 ? "99+" : dmUnreadCount}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })
                        )
                    ) : isLoadingRooms ? (
                        <p className="px-2 py-1 text-xs wd-text-muted">Loading rooms...</p>
                    ) : serverRooms.length === 0 ? (
                        <p className="px-2 py-1 text-xs wd-text-muted">No rooms.</p>
                    ) : (
                        serverRooms.map((room) => {
                            const isActive = currentRoomId === room.id;
                            const roomUnreadCount = unreadByRoomId[room.id] ?? 0;
                            const hasRoomUnread = !isActive && roomUnreadCount > 0;
                            return (
                                <button
                                    key={room.id}
                                    type="button"
                                    onClick={() => {
                                        void selectRoom(room.id);
                                    }}
                                    className={`w-full px-2 py-1.5 rounded-md text-left text-xs transition-colors flex items-center justify-between gap-2 ${
                                        isActive
                                            ? "wd-bg-accent-soft wd-text-accent"
                                            : "wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                                    }`}
                                >
                                    <span className="truncate inline-flex items-center gap-1"><ChannelHashIcon size={14} className="shrink-0 opacity-60" />{room.name}</span>
                                    {hasRoomUnread ? (
                                        <span className="h-4 min-w-4 px-1 rounded-full bg-[var(--wd-danger)] text-white text-[10px] font-bold inline-flex items-center justify-center">
                                            {roomUnreadCount > 99 ? "99+" : roomUnreadCount}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                <header className="px-3 py-3 border-b wd-border-subtle wd-bg-panel-2 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold wd-text-primary truncate">
                            {railView === "dm" ? "2D DM Chat" : "2D Chat"}
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                            aria-label="Close chat"
                            title="Close chat"
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
                                title={isRoomPickerOpen ? "Close room picker" : "Open room picker"}
                            >
                                <span className="text-sm wd-text-primary truncate inline-flex items-center gap-1">
                                    {currentRoom
                                        ? (
                                            <>
                                                {currentRoom.type === "DIRECT" ? "@" : <ChannelHashIcon size={14} className="shrink-0 opacity-60" />}
                                                {currentRoom.name}
                                            </>
                                        )
                                        : "Select room"}
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
                                                placeholder="Find conversation..."
                                                className="h-8 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-8 pr-2 text-xs wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="max-h-52 overflow-y-auto p-1.5">
                                        {filteredRooms.length === 0 ? (
                                            <p className="px-2 py-1.5 text-xs wd-text-muted">
                                                No matching conversations.
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
                                                        <span className="inline-flex items-center gap-1">{room.type === "DIRECT" ? "@" : <ChannelHashIcon size={14} className="shrink-0 opacity-60" />}{room.name}</span>
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
                        <div className="relative shrink-0" ref={notificationsRef}>
                            <button
                                type="button"
                                data-user-notification-trigger="true"
                                aria-label="Notifications"
                                title="Notifications"
                                onClick={() => {
                                    setIsNotificationsOpen((current) => {
                                        const next = !current;
                                        if (next) {
                                            setHasUnreadNotificationDot(false);
                                            setIsRoomPickerOpen(false);
                                            void reloadFriendRequests();
                                            void reloadNotifications({ limit: 100 });
                                            void markNotificationsRead({ markAll: true });
                                        }
                                        return next;
                                    });
                                }}
                                className="relative h-9 w-9 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                            >
                                <Bell size={14} />
                                {hasUnreadNotificationDot ? (
                                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--wd-danger)]" />
                                ) : null}
                            </button>

                            {isNotificationsOpen && (
                                <UserNotificationsPanel
                                    panelClassName="left-0 top-[calc(100%+8px)] z-[240]"
                                    localUserId={localBackendUserId}
                                    friendRequests={friendRequests}
                                    notifications={notifications}
                                    isLoading={isLoadingFriendRequests}
                                    isLoadingNotifications={isLoadingNotifications}
                                    isMutating={isLoadingFriends}
                                    resolveUserName={resolveUserName}
                                    onRefresh={() => {
                                        void reloadFriendRequests();
                                        void reloadNotifications({ limit: 100 });
                                    }}
                                    onMarkAllRead={() => {
                                        void markNotificationsRead({ markAll: true });
                                        setHasUnreadNotificationDot(false);
                                    }}
                                    onOpenNotification={(notification) => {
                                        setHasUnreadNotificationDot(false);
                                        setIsNotificationsOpen(false);
                                        void markNotificationsRead({
                                            notificationIds: [notification.id],
                                        });
                                        void (async () => {
                                            if (notification.roomId !== currentRoomId) {
                                                await selectRoom(notification.roomId);
                                            }
                                            setSearchQuery("");
                                            setDebouncedSearchQuery("");
                                            setSearchResults([]);
                                            setSearchError(null);

                                            if (
                                                notification.type === "MENTION"
                                                && !notification.replyMessageId
                                            ) {
                                                setActiveThreadRootId(null);
                                                setThreadRootMessage(null);
                                                setThreadReplies([]);
                                                setFocusedMessageId(notification.rootMessageId);
                                                return;
                                            }

                                            setThreadRootMessage(null);
                                            setThreadReplies([]);
                                            setActiveThreadRootId(
                                                notification.rootMessageId,
                                            );
                                            await loadThread(
                                                notification.rootMessageId,
                                                notification.roomId,
                                            );
                                        })();
                                    }}
                                    onRespond={(friendshipId, action) => {
                                        void respondToFriendRequest(friendshipId, action);
                                    }}
                                />
                            )}
                        </div>

                        <div className="relative flex-1 min-w-0">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 wd-text-muted"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                onFocus={() => {
                                    setIsNotificationsOpen(false);
                                }}
                                placeholder="Search messages"
                                className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-9 pr-8 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                            />
                            {searchQuery.trim().length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                                    aria-label="Clear search query"
                                    title="Clear search"
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

                <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
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
                                    const senderName = getDisplayName(
                                        message.sender,
                                        `User ${message.senderUserId}`,
                                    );
                                    const roomName = roomsById[message.roomId]?.name || "Unknown";

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
                                                    setActiveThreadRootId(null);
                                                    setThreadRootMessage(null);
                                                    setThreadReplies([]);
                                                    setThreadError(null);
                                                    setIsLoadingThread(false);
                                                })();
                                            }}
                                            className="w-full text-left rounded-md border wd-border-subtle wd-bg-elevated p-3 transition-colors hover:bg-[var(--wd-surface-base)]"
                                        >
                                            <div className="flex items-center justify-between gap-2 text-xs">
                                                <span className="font-semibold wd-text-primary truncate">
                                                    {senderName}
                                                </span>
                                                <span className="wd-text-muted shrink-0">
                                                    {formatChatMessageTimestamp(message.createdAt)}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs wd-text-muted truncate inline-flex items-center gap-1">
                                                <ChannelHashIcon size={12} className="shrink-0 opacity-60" />{roomName}
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
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <MessageList
                                messages={roomMessages}
                                isLoading={isLoadingMessages}
                                memberRoleColors={memberRoleColors}
                                focusedMessageId={focusedMessageId}
                                onOpenThread={(rootMessageId) => {
                                    const rootFromTimeline = roomMessages.find(
                                        (message) =>
                                            message.id === rootMessageId
                                            && !message.replyToMessageId,
                                    );
                                    if (rootFromTimeline) {
                                        setThreadRootMessage(rootFromTimeline);
                                    } else {
                                        setThreadRootMessage(null);
                                    }
                                    setThreadReplies([]);
                                    setActiveThreadRootId(rootMessageId);
                                    void loadThread(rootMessageId);
                                }}
                            />
                        </div>
                    )}

                    {activeThreadRootId && (
                        <ThreadPanel
                            roomId={currentRoomId}
                            rootMessage={threadRootMessage}
                            replies={threadReplies}
                            isLoading={isLoadingThread}
                            isSending={isSending}
                            error={threadError}
                            className="absolute inset-y-0 right-0 z-[120] w-full max-w-[420px] min-w-0 shadow-[-14px_0_30px_rgba(0,0,0,0.35)]"
                            members={currentRoomId ? membersByRoomId[currentRoomId] ?? [] : []}
                            onClose={() => {
                                setActiveThreadRootId(null);
                                setThreadRootMessage(null);
                                setThreadReplies([]);
                                setThreadError(null);
                                setIsLoadingThread(false);
                            }}
                            onRetry={() => {
                                if (!activeThreadRootId) return;
                                void loadThread(activeThreadRootId);
                            }}
                            onSendReply={async (content, attachments, options) => {
                                if (!activeThreadRootId) return;
                                const replyMessage = await sendMessage(
                                    content,
                                    attachments,
                                    {
                                        replyToMessageId: activeThreadRootId,
                                        mentionedUserIds: options?.mentionedUserIds,
                                    },
                                );
                                if (!replyMessage) return;

                                setThreadReplies((previous) => {
                                    const byId = new Map<string, ChatV2Message>();
                                    for (const reply of previous) {
                                        byId.set(reply.id, reply);
                                    }
                                    byId.set(replyMessage.id, replyMessage);
                                    return Array.from(byId.values()).sort(byCreatedAtAsc);
                                });
                            }}
                            onToggleReaction={async (messageId, emoji) => {
                                await toggleMessageReaction(messageId, emoji);
                            }}
                        />
                    )}
                </div>

                <Composer
                    roomId={currentRoomId}
                    disabled={!currentRoomId}
                    isSending={isSending}
                    members={currentRoomId ? membersByRoomId[currentRoomId] ?? [] : []}
                    onSend={async (content, attachments, options) => {
                        await sendMessage(content, attachments, {
                            mentionedUserIds: options?.mentionedUserIds,
                        });
                    }}
                />
            </div>
        </section>
    );
}

export default CompactChatShell;
