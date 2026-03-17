import { useEffect, useState } from 'react';
import type { ChatV2Room } from '@/communication/chatV2/_types';
import type {
  RoomContextMenuState,
  CategoryContextMenuState,
} from '../_types';
import { ROOM_CONTEXT_MENU_WIDTH, ROOM_CONTEXT_MENU_HEIGHT } from '../_types';

interface UseContextMenusArgs {
  rooms: ChatV2Room[];
  isUpdatingRoom: boolean;
}

function useContextMenus({ rooms, isUpdatingRoom }: UseContextMenusArgs) {
  const [roomContextMenu, setRoomContextMenu] =
    useState<RoomContextMenuState | null>(null);
  const [categoryContextMenu, setCategoryContextMenu] =
    useState<CategoryContextMenuState | null>(null);
  const [isServerActionsMenuOpen, setIsServerActionsMenuOpen] = useState(false);

  const hasManageRole = (role: ChatV2Room['viewerRole']) =>
    role === 'OWNER' || role === 'ADMIN' || role === 'MODERATOR';

  const canManageRoom = (room: ChatV2Room) =>
    room.viewerRole === undefined || hasManageRole(room.viewerRole);

  const hasViewerRoleData = rooms.some(
    (room) => room.viewerRole !== undefined,
  );
  const canManageCategories = hasViewerRoleData
    ? rooms.some((room) => hasManageRole(room.viewerRole))
    : true;

  const dismissAll = () => {
    setRoomContextMenu(null);
    setCategoryContextMenu(null);
    setIsServerActionsMenuOpen(false);
  };

  useEffect(() => {
    if (
      !roomContextMenu &&
      !categoryContextMenu &&
      !isServerActionsMenuOpen
    ) {
      return undefined;
    }

    const closeMenu = () => {
      setRoomContextMenu(null);
      setCategoryContextMenu(null);
      setIsServerActionsMenuOpen(false);
    };
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-room-context-menu='true']")) return;
      if (target?.closest("[data-category-context-menu='true']")) return;
      if (target?.closest("[data-server-actions-menu='true']")) return;
      if (target?.closest("[data-server-actions-trigger='true']")) return;
      closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [categoryContextMenu, isServerActionsMenuOpen, roomContextMenu]);

  const openCategoryContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    categoryId: string,
  ) => {
    if (!canManageCategories || isUpdatingRoom) {
      return;
    }
    event.preventDefault();

    const maxX = Math.max(
      8,
      window.innerWidth - ROOM_CONTEXT_MENU_WIDTH - 8,
    );
    const maxY = Math.max(
      8,
      window.innerHeight - ROOM_CONTEXT_MENU_HEIGHT - 8,
    );
    setCategoryContextMenu({
      categoryId,
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
    });
    setRoomContextMenu(null);
    setIsServerActionsMenuOpen(false);
  };

  const openRoomContextMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    room: ChatV2Room,
  ) => {
    if (!canManageRoom(room) || isUpdatingRoom) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const maxX = Math.max(
      8,
      window.innerWidth - ROOM_CONTEXT_MENU_WIDTH - 8,
    );
    const maxY = Math.max(
      8,
      window.innerHeight - ROOM_CONTEXT_MENU_HEIGHT - 8,
    );
    setRoomContextMenu({
      roomId: room.id,
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
    });
    setCategoryContextMenu(null);
    setIsServerActionsMenuOpen(false);
  };

  return {
    roomContextMenu,
    setRoomContextMenu,
    categoryContextMenu,
    setCategoryContextMenu,
    isServerActionsMenuOpen,
    setIsServerActionsMenuOpen,
    openRoomContextMenu,
    openCategoryContextMenu,
    dismissAll,
    hasViewerRoleData,
    canManageCategories,
  };
}

export default useContextMenus;
