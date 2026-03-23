import React from 'react';
import { Shield } from 'lucide-react';
import type { ChatV2Room, ChatV2RoomCategory } from '@/communication/chatV2/_types';
import type { RoomContextMenuState, CategoryContextMenuState } from './_types';
import CreateCategoryModal from '../modals/CreateCategoryModal';
import CreateRoomModal from '../modals/CreateRoomModal';
import DeleteRoomModal from '../modals/DeleteRoomModal';
import RenameCategoryModal from '../modals/RenameCategoryModal';
import RenameRoomModal from '../modals/RenameRoomModal';
import ChannelPermissionsModal from '../modals/ChannelPermissionsModal';
import ServerSettingsModal from '../modals/ServerSettingsModal';
import UserSettingsModal from '../modals/UserSettingsModal';

interface SidebarModalsProps {
  serverId: string | null;
  normalizedServerName: string;
  serverImageUrl?: string | null;
  rooms: ChatV2Room[];
  isCreatingRoom: boolean;
  isCreatingCategory: boolean;
  isUpdatingRoom: boolean;
  roomCategoryOptions: Array<{ id: string | null; name: string }>;
  selectedRenameCategory: ChatV2RoomCategory | undefined;
  selectedRenameRoom: ChatV2Room | undefined;
  selectedDeleteRoom: ChatV2Room | undefined;
  isCreateRoomModalOpen: boolean;
  isCreateCategoryModalOpen: boolean;
  roomModalCategoryId: string | null;
  isUserSettingsModalOpen: boolean;
  isServerSettingsModalOpen: boolean;
  channelPermissionsRoomId: string | null;
  roomContextMenu: RoomContextMenuState | null;
  categoryContextMenu: CategoryContextMenuState | null;
  onSetIsCreateRoomModalOpen: (open: boolean) => void;
  onSetIsCreateCategoryModalOpen: (open: boolean) => void;
  onSetIsUserSettingsModalOpen: (open: boolean) => void;
  onSetIsServerSettingsModalOpen: (open: boolean) => void;
  onSetRenameCategoryId: (id: string | null) => void;
  onSetRenameRoomId: (id: string | null) => void;
  onSetDeleteRoomId: (id: string | null) => void;
  onSetChannelPermissionsRoomId: (id: string | null) => void;
  onSetRoomContextMenu: (menu: RoomContextMenuState | null) => void;
  onSetCategoryContextMenu: (menu: CategoryContextMenuState | null) => void;
  onCreateRoom: (name: string, categoryId: string | null, visibility: "PUBLIC" | "PRIVATE", memberIds: number[]) => void | Promise<void>;
  onCreateCategory: (name: string) => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onRenameRoom: (roomId: string, name: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onServerImageChanged?: (serverId: string, imageUrl: string | null) => void;
  onServerRenamed?: (serverId: string, name: string) => void;
}

function SidebarModals({
  serverId,
  normalizedServerName,
  serverImageUrl,
  rooms,
  isCreatingRoom,
  isCreatingCategory,
  isUpdatingRoom,
  roomCategoryOptions,
  selectedRenameCategory,
  selectedRenameRoom,
  selectedDeleteRoom,
  isCreateRoomModalOpen,
  isCreateCategoryModalOpen,
  roomModalCategoryId,
  isUserSettingsModalOpen,
  isServerSettingsModalOpen,
  channelPermissionsRoomId,
  roomContextMenu,
  categoryContextMenu,
  onSetIsCreateRoomModalOpen,
  onSetIsCreateCategoryModalOpen,
  onSetIsUserSettingsModalOpen,
  onSetIsServerSettingsModalOpen,
  onSetRenameCategoryId,
  onSetRenameRoomId,
  onSetDeleteRoomId,
  onSetChannelPermissionsRoomId,
  onSetRoomContextMenu,
  onSetCategoryContextMenu,
  onCreateRoom,
  onCreateCategory,
  onRenameCategory,
  onRenameRoom,
  onDeleteRoom,
  onServerImageChanged,
  onServerRenamed,
}: SidebarModalsProps) {
  return (
    <>
      <UserSettingsModal
        isOpen={isUserSettingsModalOpen}
        onClose={() => onSetIsUserSettingsModalOpen(false)}
      />
      <ServerSettingsModal
        isOpen={isServerSettingsModalOpen}
        serverId={serverId}
        serverName={normalizedServerName}
        currentImageUrl={serverImageUrl ?? null}
        onClose={() => onSetIsServerSettingsModalOpen(false)}
        onImageChanged={(sid, imageUrl) => {
          onServerImageChanged?.(sid, imageUrl);
          onSetIsServerSettingsModalOpen(false);
        }}
        onServerRenamed={(sid, name) => {
          onServerRenamed?.(sid, name);
          onSetIsServerSettingsModalOpen(false);
        }}
      />

      <CreateCategoryModal
        isOpen={isCreateCategoryModalOpen}
        isSubmitting={isCreatingCategory}
        onClose={() => onSetIsCreateCategoryModalOpen(false)}
        onSubmit={(name) => {
          onCreateCategory(name);
          onSetIsCreateCategoryModalOpen(false);
        }}
      />

      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        isSubmitting={isCreatingRoom}
        categoryOptions={roomCategoryOptions}
        initialCategoryId={roomModalCategoryId}
        workspaceId={serverId}
        onClose={() => onSetIsCreateRoomModalOpen(false)}
        onSubmit={async (name, categoryId, visibility, memberIds) => {
          await onCreateRoom(name, categoryId, visibility, memberIds);
          onSetIsCreateRoomModalOpen(false);
        }}
      />

      {categoryContextMenu && (
        <div
          data-category-context-menu="true"
          className="fixed z-[140] w-44 rounded-md border wd-border-strong wd-bg-panel shadow-[0_14px_36px_rgba(0,0,0,0.45)] p-1"
          style={{
            left: categoryContextMenu.x,
            top: categoryContextMenu.y,
          }}
        >
          <button
            type="button"
            onClick={() => {
              onSetRenameCategoryId(categoryContextMenu.categoryId);
              onSetCategoryContextMenu(null);
            }}
            className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
          >
            Rename Category
          </button>
        </div>
      )}

      {roomContextMenu && (
        <div
          data-room-context-menu="true"
          className="fixed z-[140] w-44 rounded-md border wd-border-strong wd-bg-panel shadow-[0_14px_36px_rgba(0,0,0,0.45)] p-1"
          style={{
            left: roomContextMenu.x,
            top: roomContextMenu.y,
          }}
        >
          <button
            type="button"
            onClick={() => {
              onSetRenameRoomId(roomContextMenu.roomId);
              onSetRoomContextMenu(null);
              onSetCategoryContextMenu(null);
            }}
            className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
          >
            Rename Channel
          </button>
          <button
            type="button"
            onClick={() => {
              onSetChannelPermissionsRoomId(roomContextMenu.roomId);
              onSetRoomContextMenu(null);
              onSetCategoryContextMenu(null);
            }}
            className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
          >
            <Shield size={14} className="wd-text-muted" />
            Edit Permissions
          </button>
          <button
            type="button"
            onClick={() => {
              onSetDeleteRoomId(roomContextMenu.roomId);
              onSetRoomContextMenu(null);
              onSetCategoryContextMenu(null);
            }}
            className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-danger transition-colors hover:bg-[color:var(--wd-danger-soft)]"
          >
            Delete Channel
          </button>
        </div>
      )}

      <RenameCategoryModal
        isOpen={!!selectedRenameCategory}
        categoryName={selectedRenameCategory?.name ?? ''}
        isSubmitting={isUpdatingRoom}
        onClose={() => onSetRenameCategoryId(null)}
        onSubmit={(nextName) => {
          if (!selectedRenameCategory) return;
          onRenameCategory(selectedRenameCategory.id, nextName);
          onSetRenameCategoryId(null);
        }}
      />

      <RenameRoomModal
        isOpen={!!selectedRenameRoom}
        roomName={selectedRenameRoom?.name ?? ''}
        isSubmitting={isUpdatingRoom}
        onClose={() => onSetRenameRoomId(null)}
        onSubmit={(nextName) => {
          if (!selectedRenameRoom) return;
          onRenameRoom(selectedRenameRoom.id, nextName);
          onSetRenameRoomId(null);
        }}
      />

      <DeleteRoomModal
        isOpen={!!selectedDeleteRoom}
        roomName={selectedDeleteRoom?.name ?? ''}
        isSubmitting={isUpdatingRoom}
        onClose={() => onSetDeleteRoomId(null)}
        onConfirm={() => {
          if (!selectedDeleteRoom) return;
          onDeleteRoom(selectedDeleteRoom.id);
          onSetDeleteRoomId(null);
        }}
      />

      <ChannelPermissionsModal
        isOpen={!!channelPermissionsRoomId}
        workspaceId={serverId}
        channelId={channelPermissionsRoomId}
        channelName={
          rooms.find((r) => r.id === channelPermissionsRoomId)?.name ?? ''
        }
        onClose={() => onSetChannelPermissionsRoomId(null)}
      />
    </>
  );
}

export default SidebarModals;
