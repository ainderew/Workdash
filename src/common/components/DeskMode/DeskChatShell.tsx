import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Image from "next/image";
import useChatV2Store from "@/common/store/chatV2Store";
import useWorkspaceStore from "@/common/store/workspaceStore";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import type {
    ChatV2DirectRoom,
    ChatV2Message,
    ChatV2MessageSearchSort,
    ChatV2Room,
    ChatV2RoomCategory,
    ChatV2SearchUser,
} from "@/communication/chatV2/_types";
import ChannelSidebar from "./ChannelSidebar";
import Composer from "./Composer";
import DeskSearchResultsPanel from "./DeskSearchResultsPanel";
import DirectMessageSidebar from "./DirectMessageSidebar";
import GuildRail from "./GuildRail";
import MemberPanel from "./MemberPanel";
import { getDisplayName } from "@/common/utils/displayName";
import { useChatNotificationSound } from "@/common/hooks/useChatNotificationSound";
import ServerSettingsModal from "./modals/ServerSettingsModal";
import WorkspaceMembersModal from "./modals/WorkspaceMembersModal";
import JoinByInviteModal from "./modals/JoinByInviteModal";
import {
    PERM,
    computeEffectivePermissions,
    hasPermission,
} from "@/common/utils/workspacePermissions";
import type { Workspace, WorkspaceMember } from "@/communication/chatV2/_types";
import { buildMemberColorMap } from "@/common/utils/roleColor";
import MessageList from "./MessageList";
import RoomHeader from "./RoomHeader";
import ThreadPanel from "./ThreadPanel";
import CallBanner from "./CallBanner";
import FloatingCallWindow from "./FloatingCallWindow";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";
import useCallStore from "@/common/store/callStore";
import useUserStore from "@/common/store/useStore";

export type DeskChatShellMode = "desk" | "drawer";

interface DeskChatShellProps {
    mode?: DeskChatShellMode;
    onClose?: () => void;
}

function DeskChatShell({ mode = "desk", onClose }: DeskChatShellProps) {
    useChatNotificationSound();
    const backendUser = useUserStore((s) => s.backendUser);
    const chatV2Service = useMemo(() => ChatV2Service.getInstance(), []);
    const initialize = useChatV2Store((state) => state.initialize);
    const roomOrder = useChatV2Store((state) => state.roomOrder);
    const categoryOrder = useChatV2Store((state) => state.categoryOrder);
    const roomsById = useChatV2Store((state) => state.roomsById);
    const categoriesById = useChatV2Store((state) => state.categoriesById);
    const currentRoomId = useChatV2Store((state) => state.currentRoomId);
    const railView = useChatV2Store((state) => state.railView);
    const selectedWorkspaceId = useChatV2Store(
        (state) => state.selectedWorkspaceId,
    );
    const setRailView = useChatV2Store((state) => state.setRailView);
    const setSelectedWorkspaceId = useChatV2Store(
        (state) => state.setSelectedWorkspaceId,
    );
    const messagesByRoomId = useChatV2Store((state) => state.messagesByRoomId);
    const isLoadingRooms = useChatV2Store((state) => state.isLoadingRooms);
    const isLoadingDirectRooms = useChatV2Store(
        (state) => state.isLoadingDirectRooms,
    );
    const isLoadingFriends = useChatV2Store((state) => state.isLoadingFriends);
    const isLoadingMessages = useChatV2Store(
        (state) => state.isLoadingMessages,
    );
    const isLoadingOlderMessages = useChatV2Store(
        (state) => state.isLoadingOlderMessages,
    );
    const hasMoreMessagesByRoomId = useChatV2Store(
        (state) => state.hasMoreMessagesByRoomId,
    );
    const loadOlderMessages = useChatV2Store(
        (state) => state.loadOlderMessages,
    );
    const isSending = useChatV2Store((state) => state.isSending);
    const isCreatingRoom = useChatV2Store((state) => state.isCreatingRoom);
    const isCreatingCategory = useChatV2Store(
        (state) => state.isCreatingCategory,
    );
    const isArrangingRooms = useChatV2Store((state) => state.isArrangingRooms);
    const isUpdatingRoom = useChatV2Store((state) => state.isUpdatingRoom);
    const isManagingMembers = useChatV2Store(
        (state) => state.isManagingMembers,
    );
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
    const directRoomOrder = useChatV2Store((state) => state.directRoomOrder);
    const directRoomsById = useChatV2Store((state) => state.directRoomsById);
    const friends = useChatV2Store((state) => state.friends);
    const reloadDirectRooms = useChatV2Store(
        (state) => state.reloadDirectRooms,
    );
    const reloadFriends = useChatV2Store((state) => state.reloadFriends);
    const openDirectMessage = useChatV2Store(
        (state) => state.openDirectMessage,
    );
    const toggleMessageReaction = useChatV2Store(
        (state) => state.toggleMessageReaction,
    );
    const unreadByRoomId = useChatV2Store((state) => state.unreadByRoomId);
    const getWorkspaceUnreadTotal = useChatV2Store(
        (state) => state.getWorkspaceUnreadTotal,
    );
    const getDirectUnreadTotal = useChatV2Store(
        (state) => state.getDirectUnreadTotal,
    );
    const pinnedMessagesByRoomId = useChatV2Store(
        (state) => state.pinnedMessagesByRoomId,
    );
    const isLoadingPinnedMessages = useChatV2Store(
        (state) => state.isLoadingPinnedMessages,
    );
    const loadPinnedMessages = useChatV2Store(
        (state) => state.loadPinnedMessages,
    );
    const pinMessage = useChatV2Store((state) => state.pinMessage);
    const unpinMessage = useChatV2Store((state) => state.unpinMessage);
    const reloadRoomStructure = useChatV2Store(
        (state) => state.reloadRoomStructure,
    );

    const workspaces = useWorkspaceStore((state) => state.workspaces);
    const fetchMyWorkspaces = useWorkspaceStore(
        (state) => state.fetchMyWorkspaces,
    );
    const storeCreateWorkspace = useWorkspaceStore(
        (state) => state.createWorkspace,
    );
    const updateWorkspaceLocal = useWorkspaceStore(
        (state) => state.updateWorkspaceLocal,
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
    const [focusedMessageId, setFocusedMessageId] = useState<string | null>(
        null,
    );
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
    const [isMemberPanelVisible, setIsMemberPanelVisible] = useState(false);
    const [isPinnedPanelVisible, setIsPinnedPanelVisible] = useState(false);
    const [serverImageOverrides, setServerImageOverrides] = useState<
        Record<string, string | null>
    >({});
    const [serverNameOverrides, setServerNameOverrides] = useState<
        Record<string, string>
    >({});

    const canEnterRoom = useCallback((room: ChatV2Room | undefined | null) => {
        if (!room) return false;
        if (room.type === "DIRECT") return true;
        if (room.viewerRole === undefined) return true;
        return room.viewerRole !== null;
    }, []);

    useEffect(() => {
        void initialize();
        void fetchMyWorkspaces();
    }, [initialize, fetchMyWorkspaces]);

    useEffect(() => {
        if (railView !== "dm") return;
        if (directRoomOrder.length > 0 && friends.length > 0) return;

        void reloadDirectRooms();
        void reloadFriends("ACCEPTED");
    }, [
        directRoomOrder.length,
        friends.length,
        railView,
        reloadDirectRooms,
        reloadFriends,
    ]);

    const rooms = useMemo<ChatV2Room[]>(
        () => roomOrder.map((roomId) => roomsById[roomId]).filter(Boolean),
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

    // Fetch active calls when workspace rooms are loaded/changed, and reset on workspace switch
    const serverRoomCount = serverRooms.length;
    useEffect(() => {
        if (serverRoomCount === 0) return;
        useCallStore.getState().resetForWorkspaceSwitch();
        const channelIds = serverRooms.map((r) => r.id);
        CallSignalingService.getInstance().fetchActiveCallsForChannels(channelIds);
    }, [selectedWorkspaceId, serverRoomCount]);

    const workspaceOptions = useMemo(() => {
        if (workspaces.length > 0) {
            return workspaces.map((ws) => ({
                id: ws.id,
                name:
                    serverNameOverrides[ws.id] ||
                    ws.name?.trim() ||
                    "Workspace",
                unreadCount: getWorkspaceUnreadTotal(ws.id),
                imageUrl:
                    serverImageOverrides[ws.id] !== undefined
                        ? serverImageOverrides[ws.id]
                        : (ws.iconUrl ?? null),
            }));
        }

        return Array.from(
            new Map(
                rooms
                    .filter((room) => room.type !== "DIRECT")
                    .map((room) => [
                        room.workspaceId,
                        {
                            id: room.workspaceId,
                            name:
                                serverNameOverrides[room.workspaceId] ||
                                room.workspace?.name?.trim() ||
                                "Workspace",
                            unreadCount: getWorkspaceUnreadTotal(
                                room.workspaceId,
                            ),
                            imageUrl:
                                serverImageOverrides[room.workspaceId] !==
                                undefined
                                    ? serverImageOverrides[room.workspaceId]
                                    : (room.workspace?.imageUrl ?? null),
                        },
                    ]),
            ).values(),
        );
    }, [
        getWorkspaceUnreadTotal,
        rooms,
        serverImageOverrides,
        serverNameOverrides,
        workspaces,
        unreadByRoomId,
    ]);

    const categories = useMemo<ChatV2RoomCategory[]>(
        () =>
            categoryOrder
                .map((categoryId) => categoriesById[categoryId])
                .filter(Boolean)
                .filter((category) => {
                    if (!selectedWorkspaceId) return true;
                    return category.workspaceId === selectedWorkspaceId;
                }),
        [categoryOrder, categoriesById, selectedWorkspaceId],
    );

    const currentRoom = currentRoomId ? roomsById[currentRoomId] : null;
    const serverName = useMemo(() => {
        if (railView === "dm") return "Direct Messages";

        if (selectedWorkspaceId) {
            const selectedWorkspace = workspaceOptions.find(
                (entry) => entry.id === selectedWorkspaceId,
            );
            if (selectedWorkspace?.name) return selectedWorkspace.name;
        }

        const preferred = currentRoom?.workspace?.name?.trim();
        if (preferred) return preferred;

        return workspaceOptions[0]?.name || "Workdash Server";
    }, [currentRoom, railView, selectedWorkspaceId, workspaceOptions]);

    const serverImageUrl = useMemo(() => {
        if (railView === "dm") return null;

        if (selectedWorkspaceId) {
            const selectedWorkspace = workspaceOptions.find(
                (entry) => entry.id === selectedWorkspaceId,
            );
            return selectedWorkspace?.imageUrl ?? null;
        }

        return workspaceOptions[0]?.imageUrl ?? null;
    }, [railView, selectedWorkspaceId, workspaceOptions]);

    const handleServerImageChanged = useCallback(
        (serverId: string, imageUrl: string | null) => {
            setServerImageOverrides((current) => ({
                ...current,
                [serverId]: imageUrl,
            }));
            updateWorkspaceLocal(serverId, { iconUrl: imageUrl });
        },
        [updateWorkspaceLocal],
    );

    const handleServerRenamed = useCallback(
        (serverId: string, name: string) => {
            setServerNameOverrides((current) => ({
                ...current,
                [serverId]: name,
            }));
            updateWorkspaceLocal(serverId, { name });
        },
        [updateWorkspaceLocal],
    );

    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
    const [createWorkspaceName, setCreateWorkspaceName] = useState("");

    const handleCreateWorkspace = useCallback(async () => {
        const trimmed = createWorkspaceName.trim();
        if (!trimmed) return;

        const workspace = await storeCreateWorkspace(trimmed);
        if (workspace) {
            setCreateWorkspaceName("");
            setIsCreateWorkspaceOpen(false);
            setRailView("server");
            setSelectedWorkspaceId(workspace.id);
            await reloadRoomStructure();
        }
    }, [
        createWorkspaceName,
        storeCreateWorkspace,
        setRailView,
        setSelectedWorkspaceId,
        reloadRoomStructure,
    ]);

    const [serverSettingsTargetId, setServerSettingsTargetId] = useState<
        string | null
    >(null);

    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [membersModalTab, setMembersModalTab] = useState<
        "members" | "invites"
    >("members");
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinInviteCode, setJoinInviteCode] = useState<string | undefined>(
        undefined,
    );

    const viewerUserId = backendUser?.id ?? 0;

    const selectedWorkspace = useMemo(
        () => workspaces.find((ws) => ws.id === selectedWorkspaceId),
        [workspaces, selectedWorkspaceId],
    );

    const isWorkspaceOwner = selectedWorkspace?.ownerId === viewerUserId && viewerUserId !== 0;

    const viewerPermissions = useMemo(() => {
        // Workspace owner has all permissions
        if (isWorkspaceOwner) return ~BigInt(0);
        const viewerMember = selectedWorkspace?.members?.find(
            (m: WorkspaceMember) => m.userId === viewerUserId,
        );
        if (!viewerMember?.roles) return BigInt(0);
        return computeEffectivePermissions(viewerMember.roles);
    }, [selectedWorkspace, viewerUserId, isWorkspaceOwner]);

    const [memberRoleColors, setMemberRoleColors] = useState<Map<number, string>>(new Map());

    useEffect(() => {
        if (!selectedWorkspaceId) {
            setMemberRoleColors(new Map());
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const [members] = await Promise.all([
                    chatV2Service.listWorkspaceMembers(selectedWorkspaceId),
                ]);
                if (cancelled) return;
                const ownerUserId = selectedWorkspace?.ownerId ?? 0;
                setMemberRoleColors(buildMemberColorMap(members, ownerUserId));
            } catch {
                // Non-critical — names just won't be colored
            }
        })();
        return () => { cancelled = true; };
    }, [selectedWorkspaceId, chatV2Service, selectedWorkspace?.ownerId]);

    // URL invite detection
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const inviteCode = params.get("invite");
        if (inviteCode) {
            setJoinInviteCode(inviteCode);
            setIsJoinModalOpen(true);
            const url = new URL(window.location.href);
            url.searchParams.delete("invite");
            window.history.replaceState({}, "", url.toString());
        }
    }, []);

    const roomMessages = currentRoomId
        ? messagesByRoomId[currentRoomId] || []
        : [];
    const roomMembers = currentRoomId
        ? membersByRoomId[currentRoomId] || []
        : [];
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

    const activeRooms =
        railView === "dm"
            ? directRooms.map((entry) => entry.room)
            : serverRooms;
    const activeWorkspaceId =
        currentRoom?.workspaceId || activeRooms[0]?.workspaceId;

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

    const sortByCreatedAtAsc = useCallback((messages: ChatV2Message[]) => {
        return [...messages].sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return a.id.localeCompare(b.id);
        });
    }, []);

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
                    {
                        limit: 200,
                    },
                );
                setThreadRootMessage(thread.rootMessage);
                setThreadReplies(sortByCreatedAtAsc(thread.replies));
                setIsLoadingThread(false);
            } catch (error) {
                setIsLoadingThread(false);
                setThreadError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load thread",
                );
            }
        },
        [chatV2Service, currentRoomId, sortByCreatedAtAsc],
    );

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

    useEffect(() => {
        if (!activeThreadRootId) {
            return;
        }

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
            return sortByCreatedAtAsc(Array.from(byId.values()));
        });
    }, [activeThreadRootId, roomMessages, sortByCreatedAtAsc]);

    const onSelectSearchResult = useCallback(
        async (message: ChatV2Message) => {
            await selectRoom(message.roomId);
            setFocusedMessageId(message.id);
            closeThreadPanel();
        },
        [closeThreadPanel, selectRoom],
    );

    const rootContainerClassName =
        mode === "desk"
            ? "fixed inset-0 z-30 h-[100dvh] w-screen overflow-hidden flex flex-col wd-bg-overlay backdrop-blur-sm wd-desk-mode-filled-icons"
            : "h-full w-full overflow-hidden flex flex-col wd-bg-overlay wd-desk-mode-filled-icons";

    return (
        <section className={rootContainerClassName}>
            <div className="h-9 flex shrink-0">
                <div className="w-[72px] shrink-0 wd-bg-app" />
                <div className="flex-1 min-w-0 wd-bg-app flex items-center justify-center gap-1.5 px-4">
                    {serverImageUrl && (
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded">
                            <Image
                                src={serverImageUrl}
                                alt=""
                                width={16}
                                height={16}
                                unoptimized
                                className="h-full w-full object-cover"
                            />
                        </span>
                    )}
                    <p className="truncate text-sm wd-text-primary text-center">
                        {serverName}
                    </p>
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                <GuildRail
                    workspaces={workspaceOptions}
                    railView={railView}
                    selectedWorkspaceId={selectedWorkspaceId}
                    dmUnreadCount={getDirectUnreadTotal()}
                    onSelectWorkspace={(workspaceId) => {
                        setRailView("server");
                        setSelectedWorkspaceId(workspaceId);
                        void reloadRoomStructure().then(() => {
                            const roomId = useChatV2Store.getState().currentRoomId;
                            if (roomId) {
                                void selectRoom(roomId);
                            }
                        });
                    }}
                    onSelectDm={() => {
                        setRailView("dm");
                        const firstDmRoom = directRooms.find((entry) =>
                            canEnterRoom(entry.room),
                        )?.room.id;
                        if (firstDmRoom) {
                            void selectRoom(firstDmRoom);
                        }
                    }}
                    onChangeServerImage={(workspaceId) => {
                        setServerSettingsTargetId(workspaceId);
                    }}
                    onCreateWorkspace={() => {
                        setIsCreateWorkspaceOpen(true);
                    }}
                    onOpenMembers={() => {
                        setMembersModalTab("members");
                        setIsMembersModalOpen(true);
                    }}
                />

                <div className="flex-1 min-w-0 pb-2">
                    <div className="h-full min-h-0 flex rounded-lg overflow-visible outline-1 outline-[color:var(--wd-border-subtle)] shadow-[0_8px_24px_rgba(0,0,0,0.22),0_0_14px_rgba(88,101,242,0.08)]">
                        {railView === "server" ? (
                            <ChannelSidebar
                                serverName={serverName}
                                serverImageUrl={serverImageUrl}
                                serverId={selectedWorkspaceId}
                                rooms={serverRooms}
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
                                    void createRoom({
                                        name,
                                        categoryId,
                                        visibility: "PUBLIC",
                                    });
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
                                onArrangeRoom={(
                                    roomId,
                                    categoryId,
                                    position,
                                ) => {
                                    void arrangeRoom(
                                        roomId,
                                        categoryId,
                                        position,
                                    );
                                }}
                                onRenameRoom={(roomId, name) => {
                                    void renameRoom(roomId, name);
                                }}
                                onDeleteRoom={(roomId) => {
                                    void deleteRoom(roomId);
                                }}
                                onServerImageChanged={handleServerImageChanged}
                                onServerRenamed={handleServerRenamed}
                                onOpenMembers={() => {
                                    setMembersModalTab("members");
                                    setIsMembersModalOpen(true);
                                }}
                                onInvitePeople={() => {
                                    setMembersModalTab("invites");
                                    setIsMembersModalOpen(true);
                                }}
                            />
                        ) : (
                            <DirectMessageSidebar
                                directRooms={directRooms}
                                friends={friends}
                                currentRoomId={currentRoomId}
                                isLoadingDirectRooms={isLoadingDirectRooms}
                                isLoadingFriends={isLoadingFriends}
                                presentation={mode}
                                onClosePanel={onClose}
                                onSelectRoom={(roomId) => {
                                    void selectRoom(roomId);
                                }}
                                onOpenDirectMessage={(userId) => {
                                    void openDirectMessage(userId);
                                }}
                            />
                        )}

                        <div className="flex-1 min-w-0 flex flex-col">
                            <RoomHeader
                                room={currentRoom}
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
                                isMemberPanelVisible={isMemberPanelVisible}
                                onToggleMemberPanel={() => {
                                    setIsMemberPanelVisible(
                                        (current) => !current,
                                    );
                                }}
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
                                    setFocusedMessageId(pin.messageId);
                                }}
                                onOpenNotification={(notification) => {
                                    void (async () => {
                                        if (
                                            notification.roomId !==
                                            currentRoomId
                                        ) {
                                            await selectRoom(
                                                notification.roomId,
                                            );
                                        }

                                        if (
                                            notification.type === "MENTION" &&
                                            !notification.replyMessageId
                                        ) {
                                            // Mention in a root message — scroll to it, no thread
                                            closeThreadPanel();
                                            setFocusedMessageId(
                                                notification.rootMessageId,
                                            );
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
                            />

                            {error && (
                                <div className="px-5 py-2 text-xs wd-text-warning wd-bg-warning-soft border-b wd-border-subtle">
                                    {error}
                                </div>
                            )}

                            {currentRoomId && (
                                <CallBanner channelId={currentRoomId} />
                            )}

                            <MessageList
                                messages={roomMessages}
                                isLoading={isLoadingMessages}
                                memberRoleColors={memberRoleColors}
                                isLoadingOlderMessages={isLoadingOlderMessages}
                                hasMoreMessages={
                                    currentRoomId
                                        ? (hasMoreMessagesByRoomId[
                                              currentRoomId
                                          ] ?? true)
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
                                pinnedMessageIds={pinnedMessageIds}
                                onPinMessage={(messageId) => {
                                    if (currentRoomId) {
                                        void pinMessage(
                                            currentRoomId,
                                            messageId,
                                        );
                                    }
                                }}
                                onUnpinMessage={(messageId) => {
                                    if (currentRoomId) {
                                        void unpinMessage(
                                            currentRoomId,
                                            messageId,
                                        );
                                    }
                                }}
                                onOpenThread={(rootMessageId) => {
                                    const rootFromTimeline = roomMessages.find(
                                        (message) =>
                                            message.id === rootMessageId &&
                                            !message.replyToMessageId,
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

                            <Composer
                                roomId={currentRoomId}
                                disabled={!currentRoomId}
                                isSending={isSending}
                                members={roomMembers}
                                onSend={async (
                                    content,
                                    attachments,
                                    options,
                                ) => {
                                    await sendMessage(content, attachments, {
                                        mentionedUserIds:
                                            options?.mentionedUserIds,
                                    });
                                }}
                            />
                        </div>

                        {activeThreadRootId ? (
                            <ThreadPanel
                                roomId={currentRoomId}
                                rootMessage={threadRootMessage}
                                replies={threadReplies}
                                isLoading={isLoadingThread}
                                isSending={isSending}
                                error={threadError}
                                members={roomMembers}
                                onClose={closeThreadPanel}
                                onRetry={() => {
                                    if (!activeThreadRootId) return;
                                    void loadThread(activeThreadRootId);
                                }}
                                onSendReply={async (
                                    content,
                                    attachments,
                                    options,
                                ) => {
                                    if (!activeThreadRootId) return;
                                    const replyMessage = await sendMessage(
                                        content,
                                        attachments,
                                        {
                                            replyToMessageId:
                                                activeThreadRootId,
                                            mentionedUserIds:
                                                options?.mentionedUserIds,
                                        },
                                    );
                                    if (!replyMessage) return;
                                    setThreadReplies((previous) => {
                                        const byId = new Map<
                                            string,
                                            ChatV2Message
                                        >();
                                        for (const reply of previous) {
                                            byId.set(reply.id, reply);
                                        }
                                        byId.set(replyMessage.id, replyMessage);
                                        return sortByCreatedAtAsc(
                                            Array.from(byId.values()),
                                        );
                                    });
                                }}
                                onToggleReaction={async (messageId, emoji) => {
                                    await toggleMessageReaction(
                                        messageId,
                                        emoji,
                                    );
                                }}
                            />
                        ) : isSearchPanelVisible ? (
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
                        ) : isMemberPanelVisible ? (
                            <MemberPanel
                                members={roomMembers}
                                memberRoleColors={memberRoleColors}
                                isLoading={isManagingMembers}
                                onAddMember={(userId) => {
                                    void addRoomMember(userId);
                                }}
                                onRemoveMember={(userId) => {
                                    void removeRoomMember(userId);
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            </div>

            <FloatingCallWindow />

            <ServerSettingsModal
                isOpen={!!serverSettingsTargetId}
                serverId={serverSettingsTargetId}
                serverName={
                    workspaceOptions.find(
                        (w) => w.id === serverSettingsTargetId,
                    )?.name || serverName
                }
                currentImageUrl={
                    serverSettingsTargetId
                        ? (workspaceOptions.find(
                              (w) => w.id === serverSettingsTargetId,
                          )?.imageUrl ?? null)
                        : null
                }
                onClose={() => setServerSettingsTargetId(null)}
                onImageChanged={(sid, imageUrl) => {
                    handleServerImageChanged(sid, imageUrl);
                    setServerSettingsTargetId(null);
                }}
                onServerRenamed={(sid, name) => {
                    handleServerRenamed(sid, name);
                    setServerSettingsTargetId(null);
                }}
            />

            <WorkspaceMembersModal
                isOpen={isMembersModalOpen}
                workspaceId={selectedWorkspaceId}
                workspaceName={serverName}
                workspaceOwnerId={selectedWorkspace?.ownerId ?? 0}
                viewerUserId={viewerUserId}
                viewerCanManageMembers={hasPermission(viewerPermissions, PERM.KICK_MEMBERS)}
                viewerCanBanMembers={hasPermission(viewerPermissions, PERM.BAN_MEMBERS)}
                viewerCanManageRoles={hasPermission(viewerPermissions, PERM.MANAGE_ROLES)}
                viewerCanCreateInvite={hasPermission(viewerPermissions, PERM.CREATE_INVITE)}
                initialTab={membersModalTab}
                onClose={() => setIsMembersModalOpen(false)}
            />

            <JoinByInviteModal
                isOpen={isJoinModalOpen}
                prefillCode={joinInviteCode}
                onClose={() => {
                    setIsJoinModalOpen(false);
                    setJoinInviteCode(undefined);
                }}
                onJoined={(workspace: Workspace) => {
                    void fetchMyWorkspaces();
                    setRailView("server");
                    setSelectedWorkspaceId(workspace.id);
                    void reloadRoomStructure();
                }}
            />

            {isCreateWorkspaceOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-96 rounded-xl wd-bg-panel p-6 shadow-xl">
                        <h2 className="text-lg font-semibold wd-text-primary mb-4">
                            Create Workspace
                        </h2>
                        <input
                            type="text"
                            value={createWorkspaceName}
                            onChange={(e) =>
                                setCreateWorkspaceName(e.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    void handleCreateWorkspace();
                                }
                            }}
                            placeholder="Workspace name"
                            className="w-full rounded-lg border wd-border-subtle wd-bg-elevated px-3 py-2 text-sm wd-text-primary placeholder:wd-text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--wd-accent)]"
                            autoFocus
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreateWorkspaceOpen(false);
                                    setCreateWorkspaceName("");
                                }}
                                className="rounded-lg px-4 py-2 text-sm wd-text-secondary hover:wd-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleCreateWorkspace();
                                }}
                                disabled={!createWorkspaceName.trim()}
                                className="rounded-lg bg-[var(--wd-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default DeskChatShell;
