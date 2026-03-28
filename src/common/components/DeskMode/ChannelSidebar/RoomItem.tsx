import React from "react";
import { LockKeyhole } from "lucide-react";
import type { ChatV2Room } from "@/communication/chatV2/_types";
import ChannelHashIcon from "../ChannelHashIcon";
import ChannelCallIndicator from "../ChannelCallIndicator";

interface RoomItemProps {
    room: ChatV2Room;
    roomIndex: number;
    categoryKey: string;
    isActive: boolean;
    isDragging: boolean;
    hasUnread: boolean;
    unreadCount: number;
    isArranging: boolean;
    isUpdatingRoom: boolean;
    isCategoryDragging: boolean;
    isLockedRoom: boolean;
    onSelect: (roomId: string) => void;
    onContextMenu: (
        event: React.MouseEvent<HTMLButtonElement>,
        room: ChatV2Room,
    ) => void;
    onDismissMenus: () => void;
    onDragStart: (
        event: React.DragEvent<HTMLButtonElement>,
        room: ChatV2Room,
        roomIndex: number,
        categoryKey: string,
    ) => void;
    onDragEnd: () => void;
    nodeRef: (
        categoryKey: string,
        roomIndex: number,
        node: HTMLButtonElement | null,
    ) => void;
    renderInsertionIndicator: (
        categoryKey: string,
        index: number,
    ) => React.ReactNode;
}

function RoomItem({
    room,
    roomIndex,
    categoryKey,
    isActive,
    isDragging,
    hasUnread,
    unreadCount,
    isArranging,
    isUpdatingRoom,
    isCategoryDragging,
    isLockedRoom,
    onSelect,
    onContextMenu,
    onDismissMenus,
    onDragStart,
    onDragEnd,
    nodeRef,
    renderInsertionIndicator,
}: RoomItemProps) {
    return (
        <React.Fragment>
            <button
                type="button"
                draggable={
                    !isLockedRoom &&
                    !isArranging &&
                    !isUpdatingRoom &&
                    !isCategoryDragging
                }
                ref={(node) => nodeRef(categoryKey, roomIndex, node)}
                onDragStart={(event) =>
                    onDragStart(event, room, roomIndex, categoryKey)
                }
                onDragEnd={onDragEnd}
                onClick={() => {
                    onDismissMenus();
                    if (isLockedRoom) return;
                    onSelect(room.id);
                }}
                onContextMenu={(event) => onContextMenu(event, room)}
                className={`w-full text-left px-2 py-2 rounded-md text-sm transition-colors ${
                    isLockedRoom
                        ? "wd-text-muted cursor-not-allowed"
                        : isActive
                          ? "wd-text-primary bg-[var(--wd-surface-elevated)]"
                          : "wd-text-secondary hover:text-[var(--wd-text-primary)] hover:bg-[var(--wd-surface-elevated)]"
                } ${isDragging ? "opacity-40" : "opacity-100"}`}
                title={
                    isLockedRoom
                        ? "You are not a member of this channel"
                        : undefined
                }
                style={{
                    fontWeight: isActive ? 400 : 300,
                }}
            >
                <span className="inline-flex min-w-0 w-full items-center gap-1">
                    {isLockedRoom ? (
                        <LockKeyhole
                            size={14}
                            strokeWidth={1}
                            className="shrink-0 opacity-70"
                        />
                    ) : (
                        <ChannelHashIcon
                            size={18}
                            className="inline-block shrink-0 align-text-bottom opacity-60"
                        />
                    )}
                    <span
                        className="truncate flex-1"
                        style={{
                            fontWeight: isActive || hasUnread ? 400 : 300,
                        }}
                    >
                        {room.name}
                    </span>
                    {hasUnread ? (
                        <span className="h-5 min-w-5 px-1 rounded-full bg-[var(--wd-danger)] text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    ) : null}
                    <ChannelCallIndicator channelId={room.id} />
                </span>
            </button>
            {renderInsertionIndicator(categoryKey, roomIndex + 1)}
        </React.Fragment>
    );
}

export default RoomItem;
