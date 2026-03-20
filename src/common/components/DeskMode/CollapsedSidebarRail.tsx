import React from 'react';
import { Hash, PanelLeftOpen } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import type {
  ChatV2DirectRoom,
  ChatV2Room,
} from '@/communication/chatV2/_types';
import { getDisplayName } from '@/common/utils/displayName';
import UserAvatar from './UserAvatar';
import PresenceDot from './PresenceDot';

interface CollapsedSidebarRailProps {
  mode: 'server' | 'dm';
  rooms: ChatV2Room[];
  directRooms: ChatV2DirectRoom[];
  currentRoomId: string | null;
  unreadByRoomId: Record<string, number>;
  onSelectRoom: (roomId: string) => void;
  onExpand: () => void;
}

function CollapsedSidebarRail({
  mode,
  rooms,
  directRooms,
  currentRoomId,
  unreadByRoomId,
  onSelectRoom,
  onExpand,
}: CollapsedSidebarRailProps) {
  return (
    <aside className="w-12 h-full wd-bg-panel border-r wd-border-subtle flex flex-col min-h-0 items-center pt-2 pb-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onExpand}
            className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md wd-text-secondary transition-colors duration-100 hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Expand sidebar</TooltipContent>
      </Tooltip>

      <div className="w-6 h-px bg-[var(--wd-border-subtle)] my-1.5" />

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col items-center gap-0.5 w-full px-1.5">
        {mode === 'server'
          ? rooms.map((room) => {
              const isActive = currentRoomId === room.id;
              const unread = unreadByRoomId[room.id] ?? 0;
              return (
                <Tooltip key={room.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelectRoom(room.id)}
                      className={`relative h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md transition-colors duration-100 ${
                        isActive
                          ? 'bg-[var(--wd-surface-elevated)] wd-text-primary'
                          : 'wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]'
                      }`}
                      aria-label={room.name}
                    >
                      <Hash size={15} />
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-[var(--wd-danger)] text-white text-[8px] font-bold inline-flex items-center justify-center z-10">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{room.name}</TooltipContent>
                </Tooltip>
              );
            })
          : directRooms.map((entry) => {
              const isActive = currentRoomId === entry.room.id;
              const unread =
                unreadByRoomId[entry.room.id] ??
                entry.room.unreadCount ??
                0;
              const name = getDisplayName(
                entry.peerUser,
                `User ${entry.peerUser.id}`,
              );
              return (
                <Tooltip key={entry.directRoomId}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelectRoom(entry.room.id)}
                      className={`relative h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md transition-colors duration-100 ${
                        isActive
                          ? 'bg-[var(--wd-surface-elevated)]'
                          : 'hover:bg-[var(--wd-surface-elevated)]'
                      }`}
                      aria-label={name}
                    >
                      <div className="relative">
                        <UserAvatar
                          name={name}
                          image={entry.peerUser.image}
                          characterCustomization={
                            entry.peerUser.characterCustomization
                          }
                          size="xs"
                        />
                        <PresenceDot
                          userId={entry.peerUser.id}
                          size="xs"
                        />
                      </div>
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-[var(--wd-danger)] text-white text-[8px] font-bold inline-flex items-center justify-center z-10">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{name}</TooltipContent>
                </Tooltip>
              );
            })}
      </div>
    </aside>
  );
}

export default CollapsedSidebarRail;
