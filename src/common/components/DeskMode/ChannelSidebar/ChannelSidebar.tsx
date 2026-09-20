import React, { useMemo, useState } from 'react';
import type {
  ChatV2Room,
  ChatV2RoomCategory,
} from '@/communication/chatV2/_types';
import useChatV2Store from '@/common/store/chatV2Store';
import useWorkspaceStore from '@/common/store/workspaceStore';
import { NowPlayingBar } from '../NowPlayingBar';
import type { ChannelSidebarProps } from './_types';
import { DEFAULT_CATEGORY_KEY, DEFAULT_CATEGORY_NAME } from './_types';
import useContextMenus from './hooks/useContextMenus';
import useRoomDragDrop from './hooks/useRoomDragDrop';
import ServerHeader from './ServerHeader';
import LoungeCard from './LoungeCard';
import CategoryList from './CategoryList';
import SidebarFooter from './SidebarFooter';
import SidebarModals from './SidebarModals';

function ChannelSidebar({
  serverName,
  serverImageUrl,
  serverId,
  rooms,
  categories,
  currentRoomId,
  isLoading,
  isCreatingRoom,
  isCreatingCategory,
  isArranging,
  isUpdatingRoom,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  presentation = 'desk',
  onSelectRoom,
  onCreateRoom,
  onCreateCategory,
  onRenameCategory,
  onArrangeCategory,
  onArrangeRoom,
  onRenameRoom,
  onDeleteRoom,
  onServerImageChanged,
  onServerRenamed,
  onOpenMembers,
  onInvitePeople,
  onCollapseSidebar,
}: ChannelSidebarProps) {
  const unreadByRoomId = useChatV2Store((state) => state.unreadByRoomId);
  const loungeChannelId = useWorkspaceStore(
    (state) =>
      state.workspaces.find((ws) => ws.id === serverId)?.loungeChannelId ??
      null,
  );

  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] =
    useState(false);
  const [roomModalCategoryId, setRoomModalCategoryId] = useState<
    string | null
  >(null);
  const [renameCategoryId, setRenameCategoryId] = useState<string | null>(
    null,
  );
  const [renameRoomId, setRenameRoomId] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] =
    useState(false);
  const [isServerSettingsModalOpen, setIsServerSettingsModalOpen] =
    useState(false);
  const [channelPermissionsRoomId, setChannelPermissionsRoomId] =
    useState<string | null>(null);

  const contextMenus = useContextMenus({ rooms, isUpdatingRoom });
  const roomDrag = useRoomDragDrop({
    onArrangeRoom,
    onArrangeCategory,
    isArranging,
    categories,
  });

  const categoryTree = useMemo(() => {
    const entries: Array<{ key: string; id: string | null; name: string }> = [
      {
        key: DEFAULT_CATEGORY_KEY,
        id: null,
        name: DEFAULT_CATEGORY_NAME,
      },
      ...categories.map((category) => ({
        key: category.id,
        id: category.id,
        name: category.name,
      })),
    ];

    const groupedRooms: Record<string, ChatV2Room[]> = {};
    for (const entry of entries) {
      groupedRooms[entry.key] = [];
    }

    for (const room of rooms) {
      const key = room.categoryId ?? DEFAULT_CATEGORY_KEY;
      if (!groupedRooms[key]) {
        groupedRooms[key] = [];
      }
      groupedRooms[key].push(room);
    }

    for (const roomGroup of Object.values(groupedRooms)) {
      roomGroup.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return a.id.localeCompare(b.id);
      });
    }

    return entries.map((entry) => ({
      ...entry,
      rooms: groupedRooms[entry.key] || [],
    }));
  }, [categories, rooms]);

  const roomCategoryOptions = useMemo(
    () => [
      { id: null, name: `${DEFAULT_CATEGORY_NAME} (uncategorized)` },
      ...categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    ],
    [categories],
  );

  const roomById = useMemo(
    () =>
      rooms.reduce<Record<string, ChatV2Room>>((acc, room) => {
        acc[room.id] = room;
        return acc;
      }, {}),
    [rooms],
  );

  const categoryById = useMemo(
    () =>
      categories.reduce<Record<string, ChatV2RoomCategory>>((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      }, {}),
    [categories],
  );

  const categoryIndexById = useMemo(
    () =>
      categories.reduce<Record<string, number>>((acc, cat, index) => {
        acc[cat.id] = index;
        return acc;
      }, {}),
    [categories],
  );

  const normalizedServerName = serverName.trim() || 'WorkDash Server';
  const selectedRenameCategory = renameCategoryId
    ? categoryById[renameCategoryId]
    : undefined;
  const selectedRenameRoom = renameRoomId
    ? roomById[renameRoomId]
    : undefined;
  const selectedDeleteRoom = deleteRoomId
    ? roomById[deleteRoomId]
    : undefined;

  const openCreateRoomModal = (categoryId: string | null) => {
    setRoomModalCategoryId(categoryId);
    setIsCreateRoomModalOpen(true);
  };

  return (
    <aside
      id="category-aside"
      className="w-75 h-full wd-bg-panel border-r wd-border-subtle flex flex-col min-h-0"
    >
      <ServerHeader
        normalizedServerName={normalizedServerName}
        serverImageUrl={serverImageUrl}
        isCreatingRoom={isCreatingRoom}
        isCreatingCategory={isCreatingCategory}
        isServerActionsMenuOpen={contextMenus.isServerActionsMenuOpen}
        onToggleServerMenu={() => {
          contextMenus.setRoomContextMenu(null);
          contextMenus.setCategoryContextMenu(null);
          contextMenus.setIsServerActionsMenuOpen((c) => !c);
        }}
        onDismissMenus={contextMenus.dismissAll}
        onCreateRoom={() => openCreateRoomModal(null)}
        onCreateCategory={() => setIsCreateCategoryModalOpen(true)}
        onOpenMembers={onOpenMembers}
        onInvitePeople={onInvitePeople}
        onOpenServerSettings={() => setIsServerSettingsModalOpen(true)}
        onCollapseSidebar={onCollapseSidebar}
      />

      {loungeChannelId && roomById[loungeChannelId] && (
        <LoungeCard
          loungeChannelId={loungeChannelId}
          onSelectRoom={onSelectRoom}
        />
      )}

      <CategoryList
        categoryTree={categoryTree}
        categories={categories}
        currentRoomId={currentRoomId}
        isLoading={isLoading}
        isArranging={isArranging}
        isUpdatingRoom={isUpdatingRoom}
        unreadByRoomId={unreadByRoomId}
        categoryIndexById={categoryIndexById}
        roomDrag={roomDrag}
        contextMenus={contextMenus}
        onSelectRoom={onSelectRoom}
      />

      <NowPlayingBar />

      <SidebarFooter
        onOpenSettings={() => setIsUserSettingsModalOpen(true)}
      />

      <SidebarModals
        serverId={serverId}
        normalizedServerName={normalizedServerName}
        serverImageUrl={serverImageUrl}
        rooms={rooms}
        isCreatingRoom={isCreatingRoom}
        isCreatingCategory={isCreatingCategory}
        isUpdatingRoom={isUpdatingRoom}
        roomCategoryOptions={roomCategoryOptions}
        selectedRenameCategory={selectedRenameCategory}
        selectedRenameRoom={selectedRenameRoom}
        selectedDeleteRoom={selectedDeleteRoom}
        isCreateRoomModalOpen={isCreateRoomModalOpen}
        isCreateCategoryModalOpen={isCreateCategoryModalOpen}
        roomModalCategoryId={roomModalCategoryId}
        isUserSettingsModalOpen={isUserSettingsModalOpen}
        isServerSettingsModalOpen={isServerSettingsModalOpen}
        channelPermissionsRoomId={channelPermissionsRoomId}
        roomContextMenu={contextMenus.roomContextMenu}
        categoryContextMenu={contextMenus.categoryContextMenu}
        onSetIsCreateRoomModalOpen={setIsCreateRoomModalOpen}
        onSetIsCreateCategoryModalOpen={setIsCreateCategoryModalOpen}
        onSetIsUserSettingsModalOpen={setIsUserSettingsModalOpen}
        onSetIsServerSettingsModalOpen={setIsServerSettingsModalOpen}
        onSetRenameCategoryId={setRenameCategoryId}
        onSetRenameRoomId={setRenameRoomId}
        onSetDeleteRoomId={setDeleteRoomId}
        onSetChannelPermissionsRoomId={setChannelPermissionsRoomId}
        onSetRoomContextMenu={contextMenus.setRoomContextMenu}
        onSetCategoryContextMenu={contextMenus.setCategoryContextMenu}
        onCreateRoom={onCreateRoom}
        onCreateCategory={onCreateCategory}
        onRenameCategory={onRenameCategory}
        onRenameRoom={onRenameRoom}
        onDeleteRoom={onDeleteRoom}
        onServerImageChanged={onServerImageChanged}
        onServerRenamed={onServerRenamed}
      />
    </aside>
  );
}

export default ChannelSidebar;
