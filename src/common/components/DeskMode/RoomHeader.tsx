import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
    ChatV2PinnedMessage,
    ChatV2Room,
    ChatV2SearchUser,
    ChatV2UserNotification,
} from "@/communication/chatV2/_types";
import { Bell, LayoutDashboard, Pin, Search, UserRound, Users, X } from "lucide-react";
import useChatV2Store from "@/common/store/chatV2Store";
import useUserStore from "@/common/store/useStore";
import type { RightSidebarTab } from "./RightSidebar";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetChannelSettings as WidgetChannelSettingsLazy } from "@/common/components/ChannelWidgets/Admin/WidgetChannelSettings";
import { getDisplayName } from "@/common/utils/displayName";
import { useResolveUserName } from "@/common/hooks/useResolveUserName";
import ChannelHashIcon from "./ChannelHashIcon";
import PinnedMessagesPanel from "./PinnedMessagesPanel";
import UserNotificationsPanel from "./UserNotificationsPanel";
import StartCallButton from "./StartCallButton";

interface RoomHeaderProps {
    room: ChatV2Room | null;
    workspaceId?: string;
    serverName: string;
    rooms: ChatV2Room[];
    searchQuery: string;
    searchFromUser: ChatV2SearchUser | null;
    searchRoomId: string | null;
    showCloseButton?: boolean;
    onClose?: () => void;
    onSearchQueryChange: (value: string) => void;
    onSearchFromUserChange: (user: ChatV2SearchUser | null) => void;
    onSearchRoomIdChange: (roomId: string | null) => void;
    onSearchUsers: (query: string) => Promise<ChatV2SearchUser[]>;
    onClearSearch: () => void;
    onOpenNotification?: (notification: ChatV2UserNotification) => void;
    rightSidebarTab?: RightSidebarTab | null;
    onSetRightSidebarTab?: (tab: RightSidebarTab | null) => void;
    isPinnedPanelVisible?: boolean;
    onTogglePinnedPanel?: () => void;
    pinnedMessages?: ChatV2PinnedMessage[];
    isLoadingPinnedMessages?: boolean;
    onUnpinMessage?: (pinnedMessage: ChatV2PinnedMessage) => void;
    onJumpToPinnedMessage?: (pinnedMessage: ChatV2PinnedMessage) => void;
}

function RoomHeader({
    room,
    workspaceId,
    serverName,
    rooms,
    searchQuery,
    searchFromUser,
    searchRoomId,
    showCloseButton = false,
    onClose,
    onSearchQueryChange,
    onSearchFromUserChange,
    onSearchRoomIdChange,
    onSearchUsers,
    onClearSearch,
    onOpenNotification,
    rightSidebarTab = null,
    onSetRightSidebarTab,
    isPinnedPanelVisible = false,
    onTogglePinnedPanel,
    pinnedMessages = [],
    isLoadingPinnedMessages = false,
    onUnpinMessage,
    onJumpToPinnedMessage,
}: RoomHeaderProps) {
    const backendUser = useUserStore((s) => s.backendUser);
    const friendRequests = useChatV2Store((state) => state.friendRequests);
    const notifications = useChatV2Store((state) => state.notifications);
    const isLoadingFriendRequests = useChatV2Store(
        (state) => state.isLoadingFriendRequests,
    );
    const isLoadingNotifications = useChatV2Store(
        (state) => state.isLoadingNotifications,
    );
    const isLoadingFriends = useChatV2Store((state) => state.isLoadingFriends);
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
    const [isWidgetSettingsOpen, setIsWidgetSettingsOpen] = useState(false);
    const widgetSettingsRef = useRef<HTMLDivElement | null>(null);
    const widgetConfigs = useWidgetStore((s) => room?.id ? s.configsByChannel[room.id] : undefined);
    const hasWidgets = (widgetConfigs?.length ?? 0) > 0;
    const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [hasUnreadNotificationDot, setHasUnreadNotificationDot] = useState(false);
    const [activeFilter, setActiveFilter] = useState<"from" | "room" | null>(null);
    const [userQuery, setUserQuery] = useState("");
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [userResults, setUserResults] = useState<ChatV2SearchUser[]>([]);
    const searchContainerRef = useRef<HTMLDivElement | null>(null);
    const notificationsContainerRef = useRef<HTMLDivElement | null>(null);
    const pinnedPanelContainerRef = useRef<HTMLDivElement | null>(null);
    const previousIncomingCountRef = useRef<number | null>(null);
    const localBackendUserId = backendUser?.id;
    const resolveUserName = useResolveUserName();

    const selectedRoomName = useMemo(
        () => rooms.find((entry) => entry.id === searchRoomId)?.name || "",
        [rooms, searchRoomId],
    );
    const searchFromUserDisplayName = searchFromUser
        ? getDisplayName(searchFromUser, `User ${searchFromUser.id}`)
        : "user";

    const activeFilterCount = Number(!!searchFromUser) + Number(!!searchRoomId);
    const normalizedSearchQuery = searchQuery.trim();
    const searchLabel = normalizedSearchQuery.length > 0
        ? normalizedSearchQuery
        : "messages";

    useEffect(() => {
        const normalized = userQuery.trim();
        if (normalized.length === 0) {
            setUserResults([]);
            return;
        }

        let cancelled = false;
        const timeout = window.setTimeout(async () => {
            setIsSearchingUsers(true);
            try {
                const users = await onSearchUsers(normalized);
                if (!cancelled) {
                    setUserResults(users);
                }
            } catch {
                if (!cancelled) {
                    setUserResults([]);
                }
            } finally {
                if (!cancelled) {
                    setIsSearchingUsers(false);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [onSearchUsers, userQuery]);

    useEffect(() => {
        if (!isSearchMenuOpen) {
            return;
        }

        const handleOutsidePointerDown = (event: MouseEvent) => {
            if (!searchContainerRef.current) {
                return;
            }

            if (!searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchMenuOpen(false);
                setActiveFilter(null);
            }
        };

        window.addEventListener("mousedown", handleOutsidePointerDown);
        return () => {
            window.removeEventListener("mousedown", handleOutsidePointerDown);
        };
    }, [isSearchMenuOpen]);

    useEffect(() => {
        if (!isNotificationsOpen) {
            return;
        }

        const closeNotifications = () => {
            setIsNotificationsOpen(false);
        };

        const onMouseDown = (event: MouseEvent) => {
            if (!notificationsContainerRef.current) {
                return;
            }
            if (notificationsContainerRef.current.contains(event.target as Node)) {
                return;
            }
            closeNotifications();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeNotifications();
            }
        };

        const onScroll = (event: Event) => {
            if (
                notificationsContainerRef.current &&
                event.target instanceof Node &&
                notificationsContainerRef.current.contains(event.target)
            ) {
                return;
            }
            closeNotifications();
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", closeNotifications);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", closeNotifications);
        };
    }, [isNotificationsOpen]);

    useEffect(() => {
        if (!isWidgetSettingsOpen) return;
        const onMouseDown = (event: MouseEvent) => {
            if (widgetSettingsRef.current?.contains(event.target as Node)) return;
            setIsWidgetSettingsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsWidgetSettingsOpen(false);
        };
        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [isWidgetSettingsOpen]);

    useEffect(() => {
        if (!isPinnedPanelVisible) {
            return;
        }

        const closePinnedPanel = () => {
            onTogglePinnedPanel?.();
        };

        const onMouseDown = (event: MouseEvent) => {
            if (!pinnedPanelContainerRef.current) {
                return;
            }
            if (pinnedPanelContainerRef.current.contains(event.target as Node)) {
                return;
            }
            closePinnedPanel();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closePinnedPanel();
            }
        };

        const onScroll = (event: Event) => {
            if (
                pinnedPanelContainerRef.current &&
                event.target instanceof Node &&
                pinnedPanelContainerRef.current.contains(event.target)
            ) {
                return;
            }
            closePinnedPanel();
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", closePinnedPanel);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", closePinnedPanel);
        };
    }, [isPinnedPanelVisible, onTogglePinnedPanel]);

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

    return (
        <header className="relative z-[50] h-14 border-b wd-border-subtle px-3 md:px-5 flex items-center justify-between gap-2 md:gap-4 wd-bg-panel-2 backdrop-blur">
            <div className="min-w-0">
                <div className="text-sm font-semibold wd-text-primary truncate">
                    {room ? (
                        <span className="inline-flex items-center gap-1">
                            <ChannelHashIcon size={16} className="shrink-0 opacity-60" />
                            {room.name}
                        </span>
                    ) : "Select a room"}
                </div>
                {room?.topic && (
                    <div className="text-xs wd-text-muted truncate hidden md:block">
                        {room.topic}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 md:gap-2 shrink-0">
                {room && <StartCallButton channelId={room.id} />}

                <div className="relative shrink-0" ref={notificationsContainerRef}>
                    <button
                        type="button"
                        data-user-notification-trigger="true"
                        aria-label="Notifications"
                        title="Notifications"
                        onClick={() => {
                            setIsNotificationsOpen((current) => {
                                const next = !current;
                                if (next) {
                                    setIsSearchMenuOpen(false);
                                    setHasUnreadNotificationDot(false);
                                    void reloadFriendRequests();
                                    void reloadNotifications({ limit: 100 });
                                    void markNotificationsRead({ markAll: true });
                                }
                                return next;
                            });
                        }}
                        className="relative h-8 w-8 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                    >
                        <Bell size={15} />
                        {hasUnreadNotificationDot ? (
                            <span className="absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--wd-danger)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--wd-surface-panel-2)]">
                                {(() => {
                                    const total = incomingFriendRequestCount + unreadNotificationCount;
                                    return total > 99 ? "99+" : total;
                                })()}
                            </span>
                        ) : null}
                    </button>

                    {isNotificationsOpen && (
                        <UserNotificationsPanel
                            panelClassName="right-0 top-[calc(100%+10px)] z-[240]"
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
                                void markNotificationsRead({
                                    notificationIds: [notification.id],
                                });
                                setHasUnreadNotificationDot(false);
                                setIsNotificationsOpen(false);
                                onOpenNotification?.(notification);
                            }}
                            onRespond={(friendshipId, action) => {
                                void respondToFriendRequest(friendshipId, action);
                            }}
                        />
                    )}
                </div>

                <div className="relative shrink-0" ref={pinnedPanelContainerRef}>
                    <button
                        type="button"
                        aria-label={
                            isPinnedPanelVisible
                                ? "Hide pinned messages"
                                : "Show pinned messages"
                        }
                        title={
                            isPinnedPanelVisible
                                ? "Hide pinned messages"
                                : "Show pinned messages"
                        }
                        aria-pressed={isPinnedPanelVisible}
                        onClick={() => {
                            setIsNotificationsOpen(false);
                            onTogglePinnedPanel?.();
                        }}
                        className={`h-8 w-8 inline-flex items-center justify-center rounded-md border wd-border-subtle transition-colors ${
                            isPinnedPanelVisible
                                ? "wd-bg-elevated wd-text-primary hover:bg-[var(--wd-surface-base)]"
                                : "wd-bg-panel-2 wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                        }`}
                    >
                        <Pin size={15} />
                    </button>

                    {isPinnedPanelVisible && (
                        <PinnedMessagesPanel
                            panelClassName="right-0 top-[calc(100%+10px)] z-[240]"
                            pinnedMessages={pinnedMessages}
                            isLoading={isLoadingPinnedMessages}
                            onJumpToMessage={(pin) => {
                                onJumpToPinnedMessage?.(pin);
                            }}
                            onUnpin={(pin) => {
                                onUnpinMessage?.(pin);
                            }}
                        />
                    )}
                </div>

                {room && workspaceId && (
                    <div className="relative shrink-0 hidden md:block" ref={widgetSettingsRef}>
                        <button
                            type="button"
                            aria-label={isWidgetSettingsOpen ? "Close widget settings" : "Widget settings"}
                            title="Widget settings"
                            aria-pressed={isWidgetSettingsOpen}
                            onClick={() => {
                                setIsWidgetSettingsOpen((c) => !c);
                                setIsNotificationsOpen(false);
                            }}
                            className={`h-8 w-8 inline-flex items-center justify-center rounded-md border wd-border-subtle transition-colors ${
                                isWidgetSettingsOpen || hasWidgets
                                    ? "wd-bg-elevated wd-text-primary hover:bg-[var(--wd-surface-base)]"
                                    : "wd-bg-panel-2 wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                            }`}
                        >
                            <LayoutDashboard size={15} />
                        </button>

                        {isWidgetSettingsOpen && (
                            <div className="absolute right-0 top-[calc(100%+10px)] z-[240]">
                                <WidgetChannelSettingsLazy
                                    workspaceId={workspaceId}
                                    channelId={room.id}
                                    onClose={() => setIsWidgetSettingsOpen(false)}
                                />
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    aria-label={
                        rightSidebarTab === "members"
                            ? "Hide members list"
                            : "Show members list"
                    }
                    title={
                        rightSidebarTab === "members"
                            ? "Hide members list"
                            : "Show members list"
                    }
                    aria-pressed={rightSidebarTab === "members"}
                    onClick={() =>
                        onSetRightSidebarTab?.(
                            rightSidebarTab === "members" ? null : "members",
                        )
                    }
                    className={`h-8 w-8 inline-flex items-center justify-center rounded-md border wd-border-subtle transition-colors ${
                        rightSidebarTab === "members"
                            ? "wd-bg-elevated wd-text-primary hover:bg-[var(--wd-surface-base)]"
                            : "wd-bg-panel-2 wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                    }`}
                >
                    <Users size={15} />
                </button>

                <div
                    className="hidden md:flex items-center gap-2 shrink-0 relative"
                    ref={searchContainerRef}
                >
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 wd-text-muted"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => onSearchQueryChange(event.target.value)}
                            onFocus={() => {
                                setIsNotificationsOpen(false);
                                setIsSearchMenuOpen(true);
                            }}
                            placeholder={`Search ${serverName}`}
                            className="h-8 w-[286px] rounded-lg border wd-border-subtle wd-bg-elevated pl-9 pr-8 text-[0.85rem] placeholder:text-[0.8rem] wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                        />
                        {searchQuery.trim().length > 0 && (
                            <button
                                type="button"
                                onClick={() => onSearchQueryChange("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                                aria-label="Clear search query"
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {isSearchMenuOpen && (
                        <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[360px] rounded-xl border wd-border-strong wd-bg-panel text-[0.85rem] shadow-[0_20px_40px_rgba(0,0,0,0.45)] overflow-hidden">
                            <div className="px-4 py-3 border-b wd-border-subtle flex items-center gap-3">
                                <Search size={20} className="wd-text-muted shrink-0" />
                                <p className="text-[0.85rem] wd-text-primary leading-tight">
                                    Search for <span className="font-semibold">&apos;{searchLabel}&apos;</span>
                                </p>
                            </div>

                            <div className="px-4 py-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-[0.85rem] font-semibold wd-text-primary">
                                        Filters
                                    </p>
                                    {activeFilterCount > 0 || normalizedSearchQuery.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClearSearch();
                                                setUserQuery("");
                                                setUserResults([]);
                                                setActiveFilter(null);
                                            }}
                                            className="text-[0.85rem] wd-text-secondary transition-colors hover:wd-text-primary"
                                        >
                                            Clear all
                                        </button>
                                    ) : null}
                                </div>

                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setActiveFilter((current) =>
                                                current === "from" ? null : "from",
                                            )
                                        }
                                        className={`w-full rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                                            activeFilter === "from"
                                                ? "wd-bg-elevated border wd-border-subtle"
                                                : "hover:bg-[var(--wd-surface-elevated)]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserRound size={18} className="wd-text-muted shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[0.85rem] font-medium wd-text-primary">
                                                    From a specific user
                                                </p>
                                                <p className="text-[0.85rem] wd-text-muted truncate">
                                                    from:{" "}
                                                    {searchFromUserDisplayName}
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setActiveFilter((current) =>
                                                current === "room" ? null : "room",
                                            )
                                        }
                                        className={`w-full rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                                            activeFilter === "room"
                                                ? "wd-bg-elevated border wd-border-subtle"
                                                : "hover:bg-[var(--wd-surface-elevated)]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <ChannelHashIcon size={18} className="wd-text-muted shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[0.85rem] font-medium wd-text-primary">
                                                    Sent in a specific channel
                                                </p>
                                                <p className="text-[0.85rem] wd-text-muted truncate">
                                                    in: {selectedRoomName ? `#${selectedRoomName}` : "channel"}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="px-4 py-3">
                                {activeFilter === "from" ? (
                                    <div>
                                        {searchFromUser ? (
                                            <div className="flex items-center justify-between rounded-md wd-bg-elevated border wd-border-subtle px-3 py-2 mb-2">
                                                <p className="text-[0.85rem] wd-text-primary truncate">
                                                    {searchFromUserDisplayName}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => onSearchFromUserChange(null)}
                                                    className="h-6 w-6 rounded inline-flex items-center justify-center wd-text-muted hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)]"
                                                    aria-label="Clear from filter"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        ) : null}

                                        <input
                                            type="text"
                                            value={userQuery}
                                            onChange={(event) => setUserQuery(event.target.value)}
                                            placeholder="Search user..."
                                            className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-[0.85rem] wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                                        />

                                        {userQuery.trim().length > 0 && (
                                            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border wd-border-subtle wd-bg-elevated">
                                                {isSearchingUsers ? (
                                                    <div className="px-3 py-2 text-[0.85rem] wd-text-muted">
                                                        Searching users...
                                                    </div>
                                                ) : userResults.length === 0 ? (
                                                    <div className="px-3 py-2 text-[0.85rem] wd-text-muted">
                                                        No users found.
                                                    </div>
                                                ) : (
                                                    userResults.map((userResult) => (
                                                        <button
                                                            key={userResult.id}
                                                            type="button"
                                                            onClick={() => {
                                                                onSearchFromUserChange(userResult);
                                                                setUserQuery("");
                                                                setUserResults([]);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-[0.85rem] wd-text-primary transition-colors hover:bg-[var(--wd-surface-base)]"
                                                        >
                                                            {getDisplayName(
                                                                userResult,
                                                                `User ${userResult.id}`,
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {activeFilter === "room" ? (
                                    <div>
                                        <select
                                            value={searchRoomId || ""}
                                            onChange={(event) => {
                                                const nextRoomId = event.target.value.trim();
                                                onSearchRoomIdChange(nextRoomId || null);
                                            }}
                                            className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-[0.85rem] wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                                        >
                                            <option value="">All rooms</option>
                                            {rooms.map((entry) => (
                                                <option key={entry.id} value={entry.id}>
                                                    {entry.name}
                                                </option>
                                            ))}
                                        </select>
                                        {selectedRoomName && (
                                            <p className="mt-2 text-[0.85rem] wd-text-muted truncate">
                                                Selected: #{selectedRoomName}
                                            </p>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
                
                {showCloseButton && onClose ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                        aria-label="Close chat"
                        title="Close chat"
                    >
                        <X size={16} />
                    </button>
                ) : null}
            </div>
        </header>
    );
}

export default RoomHeader;
