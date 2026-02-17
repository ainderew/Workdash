import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useChatV2Store from "@/common/store/chatV2Store";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import type {
    ChatV2Message,
    ChatV2MessageSearchSort,
    ChatV2Room,
    ChatV2RoomCategory,
    ChatV2SearchUser,
} from "@/communication/chatV2/_types";
import ChannelSidebar from "./ChannelSidebar";
import Composer from "./Composer";
import DeskSearchResultsPanel from "./DeskSearchResultsPanel";
import GuildRail from "./GuildRail";
import MemberPanel from "./MemberPanel";
import MessageList from "./MessageList";
import RoomHeader from "./RoomHeader";

export type DeskChatShellMode = "desk" | "drawer";

interface DeskChatShellProps {
    mode?: DeskChatShellMode;
    onClose?: () => void;
}

function DeskChatShell({
    mode = "desk",
    onClose,
}: DeskChatShellProps) {
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const initialize = useChatV2Store((state) => state.initialize);
    const roomOrder = useChatV2Store((state) => state.roomOrder);
    const categoryOrder = useChatV2Store((state) => state.categoryOrder);
    const roomsById = useChatV2Store((state) => state.roomsById);
    const categoriesById = useChatV2Store((state) => state.categoriesById);
    const currentRoomId = useChatV2Store((state) => state.currentRoomId);
    const messagesByRoomId = useChatV2Store((state) => state.messagesByRoomId);
    const isLoadingRooms = useChatV2Store((state) => state.isLoadingRooms);
    const isLoadingMessages = useChatV2Store((state) => state.isLoadingMessages);
    const isSending = useChatV2Store((state) => state.isSending);
    const isCreatingRoom = useChatV2Store((state) => state.isCreatingRoom);
    const isCreatingCategory = useChatV2Store((state) => state.isCreatingCategory);
    const isArrangingRooms = useChatV2Store((state) => state.isArrangingRooms);
    const isUpdatingRoom = useChatV2Store((state) => state.isUpdatingRoom);
    const isManagingMembers = useChatV2Store((state) => state.isManagingMembers);
    const error = useChatV2Store((state) => state.error);
    const selectRoom = useChatV2Store((state) => state.selectRoom);
    const sendMessage = useChatV2Store((state) => state.sendMessage);
    const createRoom = useChatV2Store((state) => state.createRoom);
    const createCategory = useChatV2Store((state) => state.createCategory);
    const arrangeRoom = useChatV2Store((state) => state.arrangeRoom);
    const arrangeCategory = useChatV2Store((state) => state.arrangeCategory);
    const renameCategory = useChatV2Store((state) => state.renameCategory);
    const renameRoom = useChatV2Store((state) => state.renameRoom);
    const deleteRoom = useChatV2Store((state) => state.deleteRoom);
    const membersByRoomId = useChatV2Store((state) => state.membersByRoomId);
    const addRoomMember = useChatV2Store((state) => state.addRoomMember);
    const removeRoomMember = useChatV2Store((state) => state.removeRoomMember);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchFromUser, setSearchFromUser] = useState<ChatV2SearchUser | null>(
        null,
    );
    const [searchRoomId, setSearchRoomId] = useState<string | null>(null);
    const [searchSort, setSearchSort] = useState<ChatV2MessageSearchSort>("LATEST");
    const [searchResults, setSearchResults] = useState<ChatV2Message[]>([]);
    const [searchTotalCount, setSearchTotalCount] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
    const searchRequestIdRef = useRef(0);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

    useEffect(() => {
        void initialize();
    }, [initialize]);

    const rooms = useMemo<ChatV2Room[]>(
        () => roomOrder.map((roomId) => roomsById[roomId]).filter(Boolean),
        [roomOrder, roomsById],
    );

    const categories = useMemo<ChatV2RoomCategory[]>(
        () => categoryOrder.map((categoryId) => categoriesById[categoryId]).filter(Boolean),
        [categoryOrder, categoriesById],
    );

    const currentRoom = currentRoomId ? roomsById[currentRoomId] : null;
    const serverName = useMemo(() => {
        const preferred = currentRoom?.workspace?.name?.trim();
        if (preferred) return preferred;

        for (const room of rooms) {
            const roomWorkspaceName = room.workspace?.name?.trim();
            if (roomWorkspaceName) return roomWorkspaceName;
        }

        return "Workdash Server";
    }, [currentRoom, rooms]);
    const roomMessages = currentRoomId
        ? messagesByRoomId[currentRoomId] || []
        : [];
    const roomMembers = currentRoomId ? membersByRoomId[currentRoomId] || [] : [];
    const activeWorkspaceId = currentRoom?.workspaceId || rooms[0]?.workspaceId;
    const hasSearchCriteria =
        debouncedSearchQuery.trim().length >= 2
        || !!searchFromUser
        || !!searchRoomId;
    const isSearchPanelVisible =
        hasSearchCriteria || isSearching || searchResults.length > 0 || !!searchError;

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 350);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [searchQuery]);

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

                if (searchRequestIdRef.current !== requestId) {
                    return;
                }

                setSearchResults(response.messages);
                setSearchTotalCount(response.totalCount);
                setIsSearching(false);
            } catch (searchErr) {
                if (searchRequestIdRef.current !== requestId) {
                    return;
                }

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
        },
        [selectRoom],
    );

    const rootContainerClassName = mode === "desk"
        ? "absolute inset-0 z-30 flex flex-col wd-bg-overlay backdrop-blur-sm"
        : "h-full w-full flex flex-col wd-bg-overlay";

    return (
        <section className={rootContainerClassName}>
            <div className="h-9 flex shrink-0">
                <div className="w-18 wd-bg-app" />
                <div className="flex-1 min-w-0 wd-bg-app flex items-center justify-center px-4">
                    <p className="truncate text-sm font-medium wd-text-primary">
                        {serverName}
                    </p>
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                <GuildRail />

                <div className="flex-1 min-w-0 p-2 pt-2">
                    <div className="h-full min-h-0 flex rounded-lg overflow-hidden outline outline-1 outline-[color:var(--wd-border-subtle)] shadow-[0_8px_24px_rgba(0,0,0,0.22),0_0_14px_rgba(88,101,242,0.08)]">
                        <ChannelSidebar
                            serverName={serverName}
                            rooms={rooms}
                            currentRoomId={currentRoomId}
                            isLoading={isLoadingRooms}
                            isCreatingRoom={isCreatingRoom}
                            isCreatingCategory={isCreatingCategory}
                            isArranging={isArrangingRooms}
                            isUpdatingRoom={isUpdatingRoom}
                            categories={categories}
                            presentation={mode}
                            onClosePanel={onClose}
                            onSelectRoom={(roomId) => {
                                void selectRoom(roomId);
                            }}
                            onCreateRoom={(name, categoryId) => {
                                void createRoom({ name, categoryId });
                            }}
                            onCreateCategory={(name) => {
                                void createCategory(name);
                            }}
                            onRenameCategory={(categoryId, name) => {
                                void renameCategory(categoryId, name);
                            }}
                            onArrangeCategory={(categoryId, position) => {
                                void arrangeCategory(categoryId, position);
                            }}
                            onArrangeRoom={(roomId, categoryId, position) => {
                                void arrangeRoom(roomId, categoryId, position);
                            }}
                            onRenameRoom={(roomId, name) => {
                                void renameRoom(roomId, name);
                            }}
                            onDeleteRoom={(roomId) => {
                                void deleteRoom(roomId);
                            }}
                        />

                        <div className="flex-1 min-w-0 flex flex-col">
                            <RoomHeader
                                room={currentRoom}
                                serverName={serverName}
                                rooms={rooms}
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
                            />

                            {error && (
                                <div className="px-5 py-2 text-xs wd-text-warning wd-bg-warning-soft border-b wd-border-subtle">
                                    {error}
                                </div>
                            )}

                            <MessageList
                                messages={roomMessages}
                                isLoading={isLoadingMessages}
                                focusedMessageId={
                                    currentRoomId ? focusedMessageId : null
                                }
                            />

                            <Composer
                                roomId={currentRoomId}
                                disabled={!currentRoomId}
                                isSending={isSending}
                                onSend={async (content, attachments) => {
                                    await sendMessage(content, attachments);
                                }}
                            />
                        </div>

                        {isSearchPanelVisible ? (
                            <DeskSearchResultsPanel
                                messages={searchResults}
                                roomsById={roomsById}
                                totalCount={searchTotalCount}
                                sort={searchSort}
                                isLoading={isSearching}
                                error={searchError}
                                onSortChange={setSearchSort}
                                onSelectResult={(message) => {
                                    void onSelectSearchResult(message);
                                }}
                            />
                        ) : (
                            <MemberPanel
                                members={roomMembers}
                                isLoading={isManagingMembers}
                                onAddMember={(userId) => {
                                    void addRoomMember(userId);
                                }}
                                onRemoveMember={(userId) => {
                                    void removeRoomMember(userId);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default DeskChatShell;
