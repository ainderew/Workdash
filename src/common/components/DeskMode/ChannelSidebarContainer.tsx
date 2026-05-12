import React, { useEffect, useMemo, useState } from "react";
import useChatV2Store from "@/common/store/chatV2Store";
import useUiStore from "@/common/store/uiStore";
import useCallStore from "@/common/store/callStore";
import type {
    ChatV2DirectRoom,
    ChatV2Room,
    ChatV2RoomCategory,
} from "@/communication/chatV2/_types";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";
import ChannelSidebar from "./ChannelSidebar";
import { PlaylistSidebar } from "./ChannelSidebar/PlaylistPanel/PlaylistSidebar";
import CollapsedSidebarRail from "./CollapsedSidebarRail";
import DirectMessageSidebar from "./DirectMessageSidebar";

interface ChannelSidebarContainerProps {
    serverName: string;
    serverImageUrl: string | null;
    mode: "desk" | "drawer";
    onClose?: () => void;
    onServerImageChanged: (serverId: string, imageUrl: string | null) => void;
    onServerRenamed: (serverId: string, name: string) => void;
    onOpenMembers: () => void;
    onInvitePeople: () => void;
    onCloseMobileNav?: () => void;
}

function ChannelSidebarContainer({
    serverName,
    serverImageUrl,
    mode,
    onClose,
    onServerImageChanged,
    onServerRenamed,
    onOpenMembers,
    onInvitePeople,
    onCloseMobileNav,
}: ChannelSidebarContainerProps) {
    const railView = useChatV2Store((s) => s.railView);
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const roomOrder = useChatV2Store((s) => s.roomOrder);
    const roomsById = useChatV2Store((s) => s.roomsById);
    const categoriesById = useChatV2Store((s) => s.categoriesById);
    const categoryOrder = useChatV2Store((s) => s.categoryOrder);
    const currentRoomId = useChatV2Store((s) => s.currentRoomId);
    const isLoadingRooms = useChatV2Store((s) => s.isLoadingRooms);
    const isCreatingRoom = useChatV2Store((s) => s.isCreatingRoom);
    const isCreatingCategory = useChatV2Store((s) => s.isCreatingCategory);
    const isArrangingRooms = useChatV2Store((s) => s.isArrangingRooms);
    const isUpdatingRoom = useChatV2Store((s) => s.isUpdatingRoom);
    const selectRoom = useChatV2Store((s) => s.selectRoom);
    const createRoom = useChatV2Store((s) => s.createRoom);
    const createCategory = useChatV2Store((s) => s.createCategory);
    const arrangeRoom = useChatV2Store((s) => s.arrangeRoom);
    const arrangeCategory = useChatV2Store((s) => s.arrangeCategory);
    const renameCategory = useChatV2Store((s) => s.renameCategory);
    const renameRoom = useChatV2Store((s) => s.renameRoom);
    const deleteRoom = useChatV2Store((s) => s.deleteRoom);
    const directRoomOrder = useChatV2Store((s) => s.directRoomOrder);
    const directRoomsById = useChatV2Store((s) => s.directRoomsById);
    const friends = useChatV2Store((s) => s.friends);
    const isLoadingDirectRooms = useChatV2Store((s) => s.isLoadingDirectRooms);
    const isLoadingFriends = useChatV2Store((s) => s.isLoadingFriends);
    const reloadDirectRooms = useChatV2Store((s) => s.reloadDirectRooms);
    const reloadFriends = useChatV2Store((s) => s.reloadFriends);
    const openDirectMessage = useChatV2Store((s) => s.openDirectMessage);
    const unreadByRoomId = useChatV2Store((s) => s.unreadByRoomId);

    const storedSidebarCollapsed = useUiStore((s) => s.isSidebarCollapsed);
    const toggleSidebar = useUiStore((s) => s.toggleSidebar);

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mql = window.matchMedia("(max-width: 767px)");
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener("change", update);
        return () => mql.removeEventListener("change", update);
    }, []);

    const isSidebarCollapsed = isMobile ? false : storedSidebarCollapsed;

    const handleCollapseOrClose =
        isMobile && onCloseMobileNav ? onCloseMobileNav : toggleSidebar;

    const rooms = useMemo<ChatV2Room[]>(
        () => roomOrder.map((id) => roomsById[id]).filter(Boolean),
        [roomOrder, roomsById],
    );

    const serverRooms = useMemo<ChatV2Room[]>(() => {
        const nonDirect = rooms.filter((room) => room.type !== "DIRECT");
        if (!selectedWorkspaceId) return nonDirect;
        return nonDirect.filter(
            (room) => room.workspaceId === selectedWorkspaceId,
        );
    }, [rooms, selectedWorkspaceId]);

    const directRooms = useMemo<ChatV2DirectRoom[]>(
        () => directRoomOrder.map((id) => directRoomsById[id]).filter(Boolean),
        [directRoomOrder, directRoomsById],
    );

    const categories = useMemo<ChatV2RoomCategory[]>(
        () =>
            categoryOrder
                .map((id) => categoriesById[id])
                .filter(Boolean)
                .filter(
                    (cat) =>
                        !selectedWorkspaceId ||
                        cat.workspaceId === selectedWorkspaceId,
                ),
        [categoryOrder, categoriesById, selectedWorkspaceId],
    );

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

    const serverRoomCount = serverRooms.length;
    useEffect(() => {
        if (serverRoomCount === 0) return;
        useCallStore.getState().resetForWorkspaceSwitch();
        const channelIds = serverRooms.map((r) => r.id);
        CallSignalingService.getInstance().fetchActiveCallsForChannels(
            channelIds,
        );
    }, [selectedWorkspaceId, serverRoomCount, serverRooms]);

    return (
        <div
            className="shrink-0 overflow-hidden transition-[width] duration-50 ease-out h-full relative"
            style={{
                width: isSidebarCollapsed
                    ? 48
                    : railView === "server"
                      ? 300
                      : 320,
            }}
        >
            {!isSidebarCollapsed && railView === "server" && (
                <PlaylistSidebar workspaceId={selectedWorkspaceId} />
            )}
            {isSidebarCollapsed ? (
                <CollapsedSidebarRail
                    mode={railView}
                    rooms={serverRooms}
                    directRooms={directRooms}
                    currentRoomId={currentRoomId}
                    unreadByRoomId={unreadByRoomId}
                    onSelectRoom={(roomId) => {
                        void selectRoom(roomId);
                    }}
                    onExpand={toggleSidebar}
                />
            ) : railView === "server" ? (
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
                    onCreateRoom={async (
                        name,
                        categoryId,
                        visibility,
                        memberIds,
                    ) => {
                        await createRoom({
                            name,
                            categoryId,
                            visibility,
                            initialMemberUserIds:
                                visibility === "PRIVATE"
                                    ? memberIds
                                    : undefined,
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
                    onArrangeRoom={(roomId, categoryId, position) => {
                        void arrangeRoom(roomId, categoryId, position);
                    }}
                    onRenameRoom={(roomId, name) => {
                        void renameRoom(roomId, name);
                    }}
                    onDeleteRoom={(roomId) => {
                        void deleteRoom(roomId);
                    }}
                    onServerImageChanged={onServerImageChanged}
                    onServerRenamed={onServerRenamed}
                    onOpenMembers={onOpenMembers}
                    onInvitePeople={onInvitePeople}
                    onCollapseSidebar={handleCollapseOrClose}
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
                    onCollapseSidebar={handleCollapseOrClose}
                />
            )}
        </div>
    );
}

export { ChannelSidebarContainer };
