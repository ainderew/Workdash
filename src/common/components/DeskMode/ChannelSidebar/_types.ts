import type {
  ChatV2Room,
  ChatV2RoomCategory,
} from '@/communication/chatV2/_types';

export const DEFAULT_CATEGORY_KEY = '__workspace_default__';
export const DEFAULT_CATEGORY_NAME = 'Channels';
export const ROOM_CONTEXT_MENU_WIDTH = 180;
export const ROOM_CONTEXT_MENU_HEIGHT = 122;

export type DragState = {
  roomId: string;
  sourceCategoryId: string | null;
  sourceIndex: number;
};

export type DropTarget = {
  categoryKey: string;
  index: number;
};

export type CategoryDragState = {
  categoryId: string;
  sourceIndex: number;
};

export type RoomContextMenuState = {
  roomId: string;
  x: number;
  y: number;
};

export type CategoryContextMenuState = {
  categoryId: string;
  x: number;
  y: number;
};

export type CategoryTreeEntry = {
  key: string;
  id: string | null;
  name: string;
  rooms: ChatV2Room[];
};

export interface ChannelSidebarProps {
  serverName: string;
  serverImageUrl?: string | null;
  serverId: string | null;
  rooms: ChatV2Room[];
  categories: ChatV2RoomCategory[];
  currentRoomId: string | null;
  isLoading: boolean;
  isCreatingRoom: boolean;
  isCreatingCategory: boolean;
  isArranging: boolean;
  isUpdatingRoom: boolean;
  presentation?: 'desk' | 'drawer';
  onClosePanel?: () => void;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: (name: string, categoryId: string | null) => void;
  onCreateCategory: (name: string) => void;
  onRenameCategory: (categoryId: string, name: string) => void;
  onArrangeCategory: (categoryId: string, position: number) => void;
  onArrangeRoom: (
    roomId: string,
    categoryId: string | null,
    position: number,
  ) => void;
  onRenameRoom: (roomId: string, name: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onServerImageChanged?: (serverId: string, imageUrl: string | null) => void;
  onServerRenamed?: (serverId: string, name: string) => void;
  onOpenMembers?: () => void;
  onInvitePeople?: () => void;
}
