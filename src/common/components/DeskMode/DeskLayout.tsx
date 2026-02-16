import React, { useEffect, useMemo } from "react";
import useChatV2Store from "@/common/store/chatV2Store";
import type { ChatV2Room, ChatV2RoomCategory } from "@/communication/chatV2/_types";
import ChannelSidebar from "./ChannelSidebar";
import Composer from "./Composer";
import GuildRail from "./GuildRail";
import MemberPanel from "./MemberPanel";
import MessageList from "./MessageList";
import RoomHeader from "./RoomHeader";

function DeskLayout() {
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
    const isManagingMembers = useChatV2Store((state) => state.isManagingMembers);
    const error = useChatV2Store((state) => state.error);
    const selectRoom = useChatV2Store((state) => state.selectRoom);
    const sendMessage = useChatV2Store((state) => state.sendMessage);
    const createRoom = useChatV2Store((state) => state.createRoom);
    const createCategory = useChatV2Store((state) => state.createCategory);
    const arrangeRoom = useChatV2Store((state) => state.arrangeRoom);
    const membersByRoomId = useChatV2Store((state) => state.membersByRoomId);
    const addRoomMember = useChatV2Store((state) => state.addRoomMember);
    const removeRoomMember = useChatV2Store((state) => state.removeRoomMember);

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

    return (
        <section className="absolute inset-0 z-30 flex flex-col wd-bg-overlay backdrop-blur-sm">
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
                            categories={categories}
                            onSelectRoom={(roomId) => {
                                void selectRoom(roomId);
                            }}
                            onCreateRoom={(name, categoryId) => {
                                void createRoom({ name, categoryId });
                            }}
                            onCreateCategory={(name) => {
                                void createCategory(name);
                            }}
                            onArrangeRoom={(roomId, categoryId, position) => {
                                void arrangeRoom(roomId, categoryId, position);
                            }}
                        />

                        <div className="flex-1 min-w-0 flex flex-col">
                            <RoomHeader room={currentRoom} />

                            {error && (
                                <div className="px-5 py-2 text-xs wd-text-warning wd-bg-warning-soft border-b wd-border-subtle">
                                    {error}
                                </div>
                            )}

                            <MessageList
                                messages={roomMessages}
                                isLoading={isLoadingMessages}
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
                    </div>
                </div>
            </div>
        </section>
    );
}

export default DeskLayout;
