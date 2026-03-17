import React, { useState } from 'react';
import type { ChatV2Room, ChatV2RoomCategory } from '@/communication/chatV2/_types';
import type { CategoryTreeEntry } from './_types';
import type useRoomDragDrop from './hooks/useRoomDragDrop';
import type useContextMenus from './hooks/useContextMenus';
import RoomItem from './RoomItem';

interface CategoryListProps {
  categoryTree: CategoryTreeEntry[];
  categories: ChatV2RoomCategory[];
  currentRoomId: string | null;
  isLoading: boolean;
  isArranging: boolean;
  isUpdatingRoom: boolean;
  unreadByRoomId: Record<string, number>;
  categoryIndexById: Record<string, number>;
  roomDrag: ReturnType<typeof useRoomDragDrop>;
  contextMenus: ReturnType<typeof useContextMenus>;
  onSelectRoom: (roomId: string) => void;
}

function CategoryList({
  categoryTree,
  categories,
  currentRoomId,
  isLoading,
  isArranging,
  isUpdatingRoom,
  unreadByRoomId,
  categoryIndexById,
  roomDrag,
  contextMenus,
  onSelectRoom,
}: CategoryListProps) {
  const [collapsedByCategoryKey, setCollapsedByCategoryKey] = useState<
    Record<string, boolean>
  >({});

  const toggleCollapsed = (categoryKey: string) => {
    setCollapsedByCategoryKey((current) => ({
      ...current,
      [categoryKey]: !current[categoryKey],
    }));
  };

  const handleRoomDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    room: ChatV2Room,
    roomIndex: number,
    categoryKey: string,
  ) => {
    const isLockedRoom =
      contextMenus.hasViewerRoleData && room.viewerRole === null;
    if (isLockedRoom || isArranging || roomDrag.categoryDragState) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    roomDrag.setDragState({
      roomId: room.id,
      sourceCategoryId: room.categoryId,
      sourceIndex: roomIndex,
    });
    roomDrag.setDropTarget({
      categoryKey,
      index: roomIndex,
    });
    roomDrag.clearCategoryDragState();
  };

  return (
    <div
      id="categories-container"
      className="no-scrollbar flex-1 min-h-0 overflow-y-auto px-3 py-2"
    >
      {isLoading ? (
        <div className="space-y-4 py-2">
          {[0, 1].map((group) => (
            <div key={group} className="space-y-1">
              <div className="px-1 py-1">
                <div
                  className={`h-2.5 ${group === 0 ? 'w-20' : 'w-16'} rounded animate-pulse motion-reduce:animate-none wd-bg-elevated`}
                />
              </div>
              {Array.from({ length: group === 0 ? 4 : 3 }, (_, i) => (
                <div key={i} className="px-2 py-2">
                  <div
                    className={`h-3 ${['w-24', 'w-20', 'w-28', 'w-16'][i % 4]} rounded animate-pulse motion-reduce:animate-none wd-bg-elevated`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        categoryTree.map((category) => {
          const isCollapsed = !!collapsedByCategoryKey[category.key];
          const categoryPosition = category.id
            ? categoryIndexById[category.id]
            : undefined;
          const isDraggingCategory =
            !!category.id &&
            roomDrag.categoryDragState?.categoryId === category.id;

          return (
            <React.Fragment key={category.key}>
              {typeof categoryPosition === 'number' &&
                roomDrag.renderCategoryInsertionIndicator(categoryPosition)}
              <section
                className={`mb-2 ${
                  isDraggingCategory ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div
                  draggable={
                    !!category.id && !isArranging && !isUpdatingRoom
                  }
                  className="flex items-center gap-2 px-1 py-1 text-xs uppercase tracking-wide wd-text-muted hover:text-[var(--wd-text-secondary)] cursor-pointer"
                  onClick={() => {
                    contextMenus.setCategoryContextMenu(null);
                    toggleCollapsed(category.key);
                  }}
                  onContextMenu={(event) => {
                    if (category.id) {
                      contextMenus.openCategoryContextMenu(
                        event,
                        category.id,
                      );
                    }
                  }}
                  onDragStart={(event) => {
                    if (
                      !category.id ||
                      isArranging ||
                      isUpdatingRoom ||
                      typeof categoryPosition !== 'number'
                    ) {
                      event.preventDefault();
                      return;
                    }
                    event.dataTransfer.effectAllowed = 'move';
                    roomDrag.setCategoryDragState({
                      categoryId: category.id,
                      sourceIndex: categoryPosition,
                    });
                    roomDrag.setCategoryDropIndex(categoryPosition);
                    roomDrag.clearDragState();
                  }}
                  onDragEnd={roomDrag.clearCategoryDragState}
                  onDragOver={(event) => {
                    if (
                      roomDrag.categoryDragState &&
                      typeof categoryPosition === 'number'
                    ) {
                      event.preventDefault();
                      const rect =
                        event.currentTarget.getBoundingClientRect();
                      const nextIndex =
                        event.clientY < rect.top + rect.height / 2
                          ? categoryPosition
                          : categoryPosition + 1;
                      roomDrag.setCategoryDropIndex(nextIndex);
                      return;
                    }

                    if (!roomDrag.dragState || isArranging) return;
                    event.preventDefault();
                    roomDrag.updateDropTargetFromPointer(
                      category.key,
                      event.clientY,
                    );
                  }}
                  onDrop={(event) => {
                    if (
                      roomDrag.categoryDragState &&
                      typeof categoryPosition === 'number'
                    ) {
                      event.preventDefault();
                      const rect =
                        event.currentTarget.getBoundingClientRect();
                      const nextIndex =
                        event.clientY < rect.top + rect.height / 2
                          ? categoryPosition
                          : categoryPosition + 1;
                      roomDrag.handleCategoryDrop(nextIndex);
                      return;
                    }

                    if (!roomDrag.dragState || isArranging) return;
                    event.preventDefault();
                    const targetIndex =
                      roomDrag.updateDropTargetFromPointer(
                        category.key,
                        event.clientY,
                      );
                    roomDrag.handleDrop(category.key, targetIndex);
                  }}
                >
                  <span className="w-3 text-center">
                    {isCollapsed ? '\u25B8' : '\u25BE'}
                  </span>
                  <span>{category.name}</span>
                </div>

                {!isCollapsed && (
                  <div
                    className={`pt-1 pb-2 min-h-10 rounded ${
                      roomDrag.dragState &&
                      roomDrag.dropTarget?.categoryKey === category.key
                        ? 'wd-bg-elevated'
                        : ''
                    }`}
                    onDragOver={(event) => {
                      if (roomDrag.categoryDragState) return;
                      if (!roomDrag.dragState || isArranging) return;
                      event.preventDefault();
                      roomDrag.updateDropTargetFromPointer(
                        category.key,
                        event.clientY,
                      );
                    }}
                    onDrop={(event) => {
                      if (roomDrag.categoryDragState) return;
                      if (!roomDrag.dragState || isArranging) return;
                      event.preventDefault();
                      const targetIndex =
                        roomDrag.updateDropTargetFromPointer(
                          category.key,
                          event.clientY,
                        );
                      roomDrag.handleDrop(category.key, targetIndex);
                    }}
                  >
                    {roomDrag.renderInsertionIndicator(category.key, 0)}

                    {category.rooms.length === 0 ? (
                      <div className="px-2 py-3 text-xs wd-text-muted">
                        No rooms.
                      </div>
                    ) : (
                      category.rooms.map((room, roomIndex) => {
                        const isActiveRoom = currentRoomId === room.id;
                        const isLockedRoom =
                          contextMenus.hasViewerRoleData &&
                          room.viewerRole === null;
                        const isDraggingRoom =
                          roomDrag.dragState?.roomId === room.id;
                        const roomUnreadCount =
                          unreadByRoomId[room.id] ?? 0;
                        const hasUnread =
                          !isActiveRoom && roomUnreadCount > 0;

                        return (
                          <RoomItem
                            key={room.id}
                            room={room}
                            roomIndex={roomIndex}
                            categoryKey={category.key}
                            isActive={isActiveRoom}
                            isDragging={!!isDraggingRoom}
                            hasUnread={hasUnread}
                            unreadCount={roomUnreadCount}
                            isArranging={isArranging}
                            isUpdatingRoom={isUpdatingRoom}
                            isCategoryDragging={!!roomDrag.categoryDragState}
                            isLockedRoom={isLockedRoom}
                            onSelect={onSelectRoom}
                            onContextMenu={contextMenus.openRoomContextMenu}
                            onDismissMenus={contextMenus.dismissAll}
                            onDragStart={handleRoomDragStart}
                            onDragEnd={roomDrag.clearDragState}
                            nodeRef={roomDrag.setRoomNodeRef}
                            renderInsertionIndicator={
                              roomDrag.renderInsertionIndicator
                            }
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </section>
            </React.Fragment>
          );
        })
      )}
      {!isLoading && categories.length > 0 && (
        <div
          className="px-1"
          onDragOver={(event) => {
            if (!roomDrag.categoryDragState || isArranging) return;
            event.preventDefault();
            roomDrag.setCategoryDropIndex(categories.length);
          }}
          onDrop={(event) => {
            if (!roomDrag.categoryDragState || isArranging) return;
            event.preventDefault();
            roomDrag.handleCategoryDrop(categories.length);
          }}
        >
          {roomDrag.renderCategoryInsertionIndicator(categories.length)}
        </div>
      )}
    </div>
  );
}

export default CategoryList;
