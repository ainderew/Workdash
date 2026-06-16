import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useChatV2Store from "@/common/store/chatV2Store";
import useCallStore from "@/common/store/callStore";
import usePlaylistStore from "@/common/store/playlistStore";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { ReadyCheckClientService } from "@/communication/readyCheck/readyCheckService";
import type {
    AwardTagData,
    ChatV2DirectRoom,
    ChatV2Message,
    ChatV2MessageSearchSort,
    ChatV2Room,
    ChatV2SearchUser,
    ChatV2UserNotification,
    WorkspaceMember,
} from "@/communication/chatV2/_types";
import { getDisplayName } from "@/common/utils/displayName";
import MessageList from "./MessageList";
import RoomHeader from "./RoomHeader";
import ThreadPanel from "./ThreadPanel";
import CallBanner from "./CallBanner";
import { ChannelWidgetPanel } from "@/common/components/ChannelWidgets/ChannelWidgetPanel";
import TypingIndicator from "./TypingIndicator";
import Composer from "./Composer";
import DeskSearchResultsPanel from "./DeskSearchResultsPanel";
import RightSidebar from "./RightSidebar";
import type { RightSidebarTab } from "./RightSidebar";
import PZSidebar from "@/common/components/Integrations/PZSidebar";
import { MemberPanelContainer } from "./MemberPanelContainer";

interface ChatPaneContainerProps {
    serverName: string;
    mode: "desk" | "drawer";
    onClose?: () => void;
    memberRoleColors: Map<number, string>;
    awardTagMap: Map<number, AwardTagData>;
    wsMembers: WorkspaceMember[];
    workspaceOwnerId: number;
    activePZ: boolean;
}

function ChatPaneContainer({
    serverName,
    mode,
    onClose,
    memberRoleColors,
    awardTagMap,
    wsMembers,
    workspaceOwnerId,
    activePZ,
}: ChatPaneContainerProps) {
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);

    const railView = useChatV2Store((s) => s.railView);
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const currentRoomId = useChatV2Store((s) => s.currentRoomId);
    const roomsById = useChatV2Store((s) => s.roomsById);
    const roomOrder = useChatV2Store((s) => s.roomOrder);
    const directRoomOrder = useChatV2Store((s) => s.directRoomOrder);
    const directRoomsById = useChatV2Store((s) => s.directRoomsById);
    const currentRoomMessages = useChatV2Store((s) =>
        s.currentRoomId
            ? s.messagesByRoomId[s.currentRoomId]
            : undefined,
    );
    const isLoadingMessages = useChatV2Store((s) => s.isLoadingMessages);
    const isLoadingOlderMessages = useChatV2Store(
        (s) => s.isLoadingOlderMessages,
    );
    const hasMoreMessagesByRoomId = useChatV2Store(
        (s) => s.hasMoreMessagesByRoomId,
    );
    const loadOlderMessages = useChatV2Store((s) => s.loadOlderMessages);
    const isSending = useChatV2Store((s) => s.isSending);
    const sendMessage = useChatV2Store((s) => s.sendMessage);
    const membersByRoomId = useChatV2Store((s) => s.membersByRoomId);
    const error = useChatV2Store((s) => s.error);
    const selectRoom = useChatV2Store((s) => s.selectRoom);
    const pinnedMessagesByRoomId = useChatV2Store(
        (s) => s.pinnedMessagesByRoomId,
    );
    const isLoadingPinnedMessages = useChatV2Store(
        (s) => s.isLoadingPinnedMessages,
    );
    const loadPinnedMessages = useChatV2Store((s) => s.loadPinnedMessages);
    const pinMessage = useChatV2Store((s) => s.pinMessage);
    const unpinMessage = useChatV2Store((s) => s.unpinMessage);
    const toggleMessageReaction = useChatV2Store(
        (s) => s.toggleMessageReaction,
    );

    const currentRoom = currentRoomId ? roomsById[currentRoomId] : null;
    const roomMessages = currentRoomMessages || [];
    const roomMembers = currentRoomId
        ? membersByRoomId[currentRoomId] || []
        : [];
    const effectiveIsLoading =
        isLoadingMessages ||
        (!!currentRoomId && currentRoomMessages === undefined);

    const rooms = useMemo<ChatV2Room[]>(
        () => roomOrder.map((id) => roomsById[id]).filter(Boolean),
        [roomOrder, roomsById],
    );

    const directRooms = useMemo<ChatV2DirectRoom[]>(
        () => directRoomOrder.map((id) => directRoomsById[id]).filter(Boolean),
        [directRoomOrder, directRoomsById],
    );

    const serverRooms = useMemo<ChatV2Room[]>(() => {
        const nonDirect = rooms.filter((room) => room.type !== "DIRECT");
        if (!selectedWorkspaceId) return nonDirect;
        return nonDirect.filter(
            (room) => room.workspaceId === selectedWorkspaceId,
        );
    }, [rooms, selectedWorkspaceId]);

    const activeRooms =
        railView === "dm"
            ? directRooms.map((entry) => entry.room)
            : serverRooms;
    const activeWorkspaceId =
        currentRoom?.workspaceId || activeRooms[0]?.workspaceId;

    const currentPinnedMessages = currentRoomId
        ? pinnedMessagesByRoomId[currentRoomId] || []
        : [];
    const pinnedMessageIds = useMemo(
        () =>
            new Map(
                currentPinnedMessages.map((p) => [
                    p.messageId,
                    {
                        pinnedByName: getDisplayName(
                            p.pinnedBy,
                            `User ${p.pinnedByUserId}`,
                        ),
                    },
                ]),
            ),
        [currentPinnedMessages],
    );

    const [rightSidebarTab, setRightSidebarTab] =
        useState<RightSidebarTab | null>(null);
    const [isPinnedPanelVisible, setIsPinnedPanelVisible] = useState(false);
    const [focusedMessageId, setFocusedMessageId] = useState<string | null>(
        null,
    );

    const [searchQuery, setSearchQuery] = useState("");
    const [searchFromUser, setSearchFromUser] =
        useState<ChatV2SearchUser | null>(null);
    const [searchRoomId, setSearchRoomId] = useState<string | null>(null);
    const [searchSort, setSearchSort] =
        useState<ChatV2MessageSearchSort>("LATEST");
    const [searchResults, setSearchResults] = useState<ChatV2Message[]>([]);
    const [searchTotalCount, setSearchTotalCount] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const searchRequestIdRef = useRef(0);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

    const [activeThreadRootId, setActiveThreadRootId] = useState<string | null>(
        null,
    );
    const [threadRootMessage, setThreadRootMessage] =
        useState<ChatV2Message | null>(null);
    const [threadReplies, setThreadReplies] = useState<ChatV2Message[]>([]);
    const [isLoadingThread, setIsLoadingThread] = useState(false);
    const [threadError, setThreadError] = useState<string | null>(null);
    const [replyTarget, setReplyTarget] = useState<ChatV2Message | null>(null);

    // Drop a stale quick-reply target when switching channels.
    useEffect(() => {
        setReplyTarget(null);
    }, [currentRoomId]);

    const channelContentRef = useRef<HTMLDivElement>(null);
    const lastTypingEmitRef = useRef(0);

    useEffect(() => {
        const el = channelContentRef.current;
        if (!el) return;
        const setRect = useCallStore.getState().setChannelContentRect;
        try {
            const observer = new ResizeObserver(() => {
                const rect = el.getBoundingClientRect();
                setRect({
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                });
            });
            observer.observe(el);
            return () => observer.disconnect();
        } catch {
            // ResizeObserver not supported
        }
    }, []);

    useEffect(() => {
        const timeout = window.setTimeout(
            () => setDebouncedSearchQuery(searchQuery),
            350,
        );
        return () => window.clearTimeout(timeout);
    }, [searchQuery]);

    const hasSearchCriteria =
        debouncedSearchQuery.trim().length >= 2 ||
        !!searchFromUser ||
        !!searchRoomId;
    const isSearchPanelVisible =
        hasSearchCriteria ||
        isSearching ||
        searchResults.length > 0 ||
        !!searchError;

    useEffect(() => {
        if (!hasSearchCriteria) {
            setSearchResults([]);
            setSearchTotalCount(0);
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
                    query:
                        debouncedSearchQuery.trim().length >= 2
                            ? debouncedSearchQuery.trim()
                            : undefined,
                    fromUserId: searchFromUser?.id,
                    roomId: searchRoomId || undefined,
                    sort: searchSort,
                    limit: 100,
                });

                if (searchRequestIdRef.current !== requestId) return;
                setSearchResults(response.messages);
                setSearchTotalCount(response.totalCount);
                setIsSearching(false);
            } catch (searchErr) {
                if (searchRequestIdRef.current !== requestId) return;
                setIsSearching(false);
                setSearchResults([]);
                setSearchTotalCount(0);
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
        debouncedSearchQuery,
        hasSearchCriteria,
        searchFromUser,
        searchRoomId,
        searchSort,
    ]);

    const sortByCreatedAtAsc = useCallback((messages: ChatV2Message[]) => {
        return [...messages].sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return a.id.localeCompare(b.id);
        });
    }, []);

    const closeThreadPanel = useCallback(() => {
        setActiveThreadRootId(null);
        setThreadRootMessage(null);
        setThreadReplies([]);
        setThreadError(null);
        setIsLoadingThread(false);
    }, []);

    useEffect(() => {
        closeThreadPanel();
    }, [closeThreadPanel, currentRoomId]);

    // Snapshot the active ready check (if any) for the channel just entered.
    // Reconnect path is handled by the service's "connect" listener.
    useEffect(() => {
        if (!currentRoomId) return;
        void ReadyCheckClientService.getInstance().fetchActive(currentRoomId);
    }, [currentRoomId]);

    useEffect(() => {
        if (!activeThreadRootId) return;

        const rootFromTimeline = roomMessages.find(
            (m) => m.id === activeThreadRootId && !m.replyToMessageId,
        );
        if (rootFromTimeline) setThreadRootMessage(rootFromTimeline);

        const realtimeReplies = roomMessages.filter(
            (m) => m.replyToMessageId === activeThreadRootId,
        );
        if (realtimeReplies.length === 0) return;

        setThreadReplies((prev) => {
            const byId = new Map<string, ChatV2Message>();
            for (const reply of prev) byId.set(reply.id, reply);
            for (const reply of realtimeReplies)
                byId.set(reply.id, {
                    ...(byId.get(reply.id) || {}),
                    ...reply,
                });
            return sortByCreatedAtAsc(Array.from(byId.values()));
        });
    }, [activeThreadRootId, roomMessages, sortByCreatedAtAsc]);

    const loadThread = useCallback(
        async (rootMessageId: string, roomIdOverride?: string) => {
            const threadRoomId = roomIdOverride || currentRoomId;
            if (!threadRoomId) return;

            setIsLoadingThread(true);
            setThreadError(null);
            try {
                const thread = await chatV2Service.getThread(
                    threadRoomId,
                    rootMessageId,
                    { limit: 200 },
                );
                setThreadRootMessage(thread.rootMessage);
                setThreadReplies(sortByCreatedAtAsc(thread.replies));
                setIsLoadingThread(false);
            } catch (err) {
                setIsLoadingThread(false);
                setThreadError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load thread",
                );
            }
        },
        [chatV2Service, currentRoomId, sortByCreatedAtAsc],
    );

    const handleTyping = useCallback(() => {
        const now = Date.now();
        if (now - lastTypingEmitRef.current < 1000) return;
        lastTypingEmitRef.current = now;
        if (currentRoomId) chatV2Service.emitTyping(currentRoomId);
    }, [currentRoomId, chatV2Service]);

    const handleSearchUsers = useCallback(
        async (query: string) => {
            const trimmed = query.trim();
            if (!trimmed) return [];
            return await chatV2Service.searchUsers({
                workspaceId: activeWorkspaceId,
                query: trimmed,
                limit: 12,
            });
        },
        [activeWorkspaceId, chatV2Service],
    );

    const clearSearchState = useCallback(() => {
        setSearchQuery("");
        setDebouncedSearchQuery("");
        setSearchFromUser(null);
        setSearchRoomId(null);
        setSearchResults([]);
        setSearchTotalCount(0);
        setSearchError(null);
        setIsSearching(false);
    }, []);

    const onSelectSearchResult = useCallback(
        async (message: ChatV2Message) => {
            await selectRoom(message.roomId);
            setFocusedMessageId(message.id);
            closeThreadPanel();
        },
        [closeThreadPanel, selectRoom],
    );

    const handleOpenNotification = useCallback(
        (notification: ChatV2UserNotification) => {
            void (async () => {
                if (notification.roomId !== currentRoomId) {
                    await selectRoom(notification.roomId);
                }

                if (
                    notification.type === "MENTION" &&
                    !notification.replyMessageId
                ) {
                    closeThreadPanel();
                    setFocusedMessageId(notification.rootMessageId);
                    return;
                }

                setThreadRootMessage(null);
                setThreadReplies([]);
                setActiveThreadRootId(notification.rootMessageId);
                await loadThread(
                    notification.rootMessageId,
                    notification.roomId,
                );
            })();
        },
        [closeThreadPanel, currentRoomId, loadThread, selectRoom],
    );

    const handleOpenThread = useCallback(
        (rootMessageId: string) => {
            const rootFromTimeline = roomMessages.find(
                (m) => m.id === rootMessageId && !m.replyToMessageId,
            );
            setThreadRootMessage(rootFromTimeline ?? null);
            setThreadReplies([]);
            setActiveThreadRootId(rootMessageId);
            void loadThread(rootMessageId);
        },
        [loadThread, roomMessages],
    );

    const hasPZ = activePZ && selectedWorkspaceId;

    return (
        <>
            <div
                ref={channelContentRef}
                className="flex-1 min-w-0 flex flex-col"
            >
                <RoomHeader
                    room={currentRoom}
                    workspaceId={activeWorkspaceId}
                    serverName={serverName}
                    rooms={activeRooms}
                    searchQuery={searchQuery}
                    searchFromUser={searchFromUser}
                    searchRoomId={searchRoomId}
                    showCloseButton={mode === "drawer"}
                    onClose={onClose}
                    onSearchQueryChange={setSearchQuery}
                    onSearchFromUserChange={setSearchFromUser}
                    onSearchRoomIdChange={setSearchRoomId}
                    onSearchUsers={handleSearchUsers}
                    onClearSearch={clearSearchState}
                    rightSidebarTab={rightSidebarTab}
                    onSetRightSidebarTab={setRightSidebarTab}
                    isPinnedPanelVisible={isPinnedPanelVisible}
                    onTogglePinnedPanel={() => {
                        const next = !isPinnedPanelVisible;
                        setIsPinnedPanelVisible(next);
                        if (next && currentRoomId) {
                            void loadPinnedMessages(currentRoomId);
                        }
                    }}
                    pinnedMessages={currentPinnedMessages}
                    isLoadingPinnedMessages={isLoadingPinnedMessages}
                    onUnpinMessage={(pin) => {
                        void unpinMessage(pin.roomId, pin.messageId);
                    }}
                    onJumpToPinnedMessage={(pin) => {
                        setIsPinnedPanelVisible(false);
                        const replyRootId = pin.message.replyToMessageId;
                        if (replyRootId) {
                            setThreadRootMessage(null);
                            setThreadReplies([]);
                            setActiveThreadRootId(replyRootId);
                            void loadThread(replyRootId, pin.roomId);
                            return;
                        }
                        closeThreadPanel();
                        setFocusedMessageId(pin.messageId);
                    }}
                    onOpenNotification={handleOpenNotification}
                />

                {error && (
                    <div className="px-5 py-2 text-xs wd-text-warning wd-bg-warning-soft border-b wd-border-subtle">
                        {error}
                    </div>
                )}

                {currentRoomId && <CallBanner channelId={currentRoomId} />}

                {currentRoomId && activeWorkspaceId && (
                    <ChannelWidgetPanel
                        roomId={currentRoomId}
                        workspaceId={activeWorkspaceId}
                    />
                )}

                <MessageList
                    messages={roomMessages}
                    isLoading={effectiveIsLoading}
                    memberRoleColors={memberRoleColors}
                    awardTagMap={awardTagMap}
                    isLoadingOlderMessages={isLoadingOlderMessages}
                    hasMoreMessages={
                        currentRoomId
                            ? (hasMoreMessagesByRoomId[currentRoomId] ?? true)
                            : true
                    }
                    onLoadOlderMessages={() => {
                        if (currentRoomId) {
                            void loadOlderMessages(currentRoomId);
                        }
                    }}
                    focusedMessageId={
                        currentRoomId ? focusedMessageId : null
                    }
                    onFocusedMessageHandled={() =>
                        setFocusedMessageId(null)
                    }
                    pinnedMessageIds={pinnedMessageIds}
                    onPinMessage={(messageId) => {
                        if (currentRoomId) {
                            void pinMessage(currentRoomId, messageId);
                        }
                    }}
                    onUnpinMessage={(messageId) => {
                        if (currentRoomId) {
                            void unpinMessage(currentRoomId, messageId);
                        }
                    }}
                    onOpenThread={handleOpenThread}
                    onQuickReply={setReplyTarget}
                />

                <TypingIndicator roomId={currentRoomId} />

                <Composer
                    roomId={currentRoomId}
                    disabled={!currentRoomId}
                    isSending={isSending}
                    members={roomMembers}
                    onTyping={handleTyping}
                    replyTarget={replyTarget}
                    onCancelReply={() => setReplyTarget(null)}
                    onSend={async (content, attachments, options) => {
                        if (content.trim() === "/playlists") {
                            usePlaylistStore
                                .getState()
                                .setSidebarOpen(true);
                            return;
                        }
                        await sendMessage(content, attachments, {
                            mentionedUserIds: options?.mentionedUserIds,
                            ...(options?.replyToMessageId && {
                                replyToMessageId: options.replyToMessageId,
                            }),
                            ...(options?.clientMessageId && {
                                clientMessageId: options.clientMessageId,
                            }),
                        });
                        setReplyTarget(null);
                    }}
                />
            </div>

            {activeThreadRootId ? (
                <div className="absolute inset-0 z-[60] flex md:contents">
                    <button
                        type="button"
                        aria-label="Close thread"
                        onClick={closeThreadPanel}
                        className="md:hidden absolute inset-0 bg-black/40"
                    />
                    <ThreadPanel
                        roomId={currentRoomId}
                        rootMessage={threadRootMessage}
                        replies={threadReplies}
                        isLoading={isLoadingThread}
                        isSending={isSending}
                        error={threadError}
                        members={roomMembers}
                        className="relative ml-auto"
                        onClose={closeThreadPanel}
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
                                    ...(options?.clientMessageId && {
                                        clientMessageId: options.clientMessageId,
                                    }),
                                },
                            );
                            if (!replyMessage) return;
                            setThreadReplies((prev) => {
                                const byId = new Map<string, ChatV2Message>();
                                for (const reply of prev)
                                    byId.set(reply.id, reply);
                                byId.set(replyMessage.id, replyMessage);
                                return sortByCreatedAtAsc(
                                    Array.from(byId.values()),
                                );
                            });
                        }}
                        onToggleReaction={async (messageId, emoji) => {
                            await toggleMessageReaction(messageId, emoji);
                        }}
                    />
                </div>
            ) : isSearchPanelVisible ? (
                <div className="absolute inset-0 z-[60] flex md:contents">
                    <button
                        type="button"
                        aria-label="Close search results"
                        onClick={clearSearchState}
                        className="md:hidden absolute inset-0 bg-black/40"
                    />
                    <DeskSearchResultsPanel
                        messages={searchResults}
                        roomsById={roomsById}
                        totalCount={searchTotalCount}
                        sort={searchSort}
                        isLoading={isSearching}
                        error={searchError}
                        query={debouncedSearchQuery.trim()}
                        onSortChange={setSearchSort}
                        onSelectResult={(message) => {
                            void onSelectSearchResult(message);
                        }}
                    />
                </div>
            ) : rightSidebarTab !== null ? (
                <div className="absolute inset-0 z-[60] flex md:contents">
                    <button
                        type="button"
                        aria-label="Close panel"
                        onClick={() => setRightSidebarTab(null)}
                        className="md:hidden absolute inset-0 bg-black/40"
                    />
                    <RightSidebar
                        activeTab={rightSidebarTab}
                        onTabChange={setRightSidebarTab}
                        memberCount={roomMembers.length}
                    >
                        <div
                            className={
                                rightSidebarTab === "members"
                                    ? "flex flex-1 flex-col min-h-0"
                                    : "hidden"
                            }
                        >
                            <MemberPanelContainer
                                memberRoleColors={memberRoleColors}
                                wsMembers={wsMembers}
                                workspaceOwnerId={workspaceOwnerId}
                            />
                        </div>
                        {hasPZ && (
                            <div
                                className={
                                    rightSidebarTab === "pz"
                                        ? "flex flex-1 flex-col min-h-0"
                                        : "hidden"
                                }
                            >
                                <PZSidebar
                                    workspaceId={selectedWorkspaceId!}
                                    isActive={true}
                                />
                            </div>
                        )}
                    </RightSidebar>
                </div>
            ) : null}
        </>
    );
}

export { ChatPaneContainer };
