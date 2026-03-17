import React, { useRef, useState } from 'react';
import type { ChatV2RoomCategory } from '@/communication/chatV2/_types';
import type { DragState, DropTarget, CategoryDragState } from '../_types';
import { DEFAULT_CATEGORY_KEY } from '../_types';

interface UseRoomDragDropArgs {
  onArrangeRoom: (
    roomId: string,
    categoryId: string | null,
    position: number,
  ) => void;
  onArrangeCategory: (categoryId: string, position: number) => void;
  isArranging: boolean;
  categories: ChatV2RoomCategory[];
}

function useRoomDragDrop({
  onArrangeRoom,
  onArrangeCategory,
  isArranging,
  categories,
}: UseRoomDragDropArgs) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [categoryDragState, setCategoryDragState] =
    useState<CategoryDragState | null>(null);
  const [categoryDropIndex, setCategoryDropIndex] = useState<number | null>(
    null,
  );
  const roomNodeRefs = useRef<
    Record<string, Array<HTMLButtonElement | null>>
  >({});

  const clearDragState = () => {
    setDragState(null);
    setDropTarget(null);
  };

  const clearCategoryDragState = () => {
    setCategoryDragState(null);
    setCategoryDropIndex(null);
  };

  const setRoomNodeRef = (
    categoryKey: string,
    roomIndex: number,
    node: HTMLButtonElement | null,
  ) => {
    if (!roomNodeRefs.current[categoryKey]) {
      roomNodeRefs.current[categoryKey] = [];
    }
    roomNodeRefs.current[categoryKey][roomIndex] = node;
  };

  const getNearestDropIndex = (categoryKey: string, pointerY: number) => {
    const roomNodes = roomNodeRefs.current[categoryKey] || [];
    const nodeCount = roomNodes.length;
    if (nodeCount === 0) return 0;

    for (let index = 0; index < nodeCount; index += 1) {
      const node = roomNodes[index];
      if (!node) continue;

      const rect = node.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (pointerY < midpoint) {
        return index;
      }
    }

    return nodeCount;
  };

  const updateDropTargetFromPointer = (
    categoryKey: string,
    pointerY: number,
  ) => {
    const index = getNearestDropIndex(categoryKey, pointerY);
    setDropTarget({ categoryKey, index });
    return index;
  };

  const handleDrop = (categoryKey: string, rawTargetIndex: number) => {
    if (!dragState || categoryDragState || isArranging) {
      clearDragState();
      return;
    }

    const targetCategoryId =
      categoryKey === DEFAULT_CATEGORY_KEY ? null : categoryKey;

    let targetPosition = rawTargetIndex;
    const sourceCategoryKey =
      dragState.sourceCategoryId ?? DEFAULT_CATEGORY_KEY;

    if (
      sourceCategoryKey === categoryKey &&
      dragState.sourceIndex < rawTargetIndex
    ) {
      targetPosition = rawTargetIndex - 1;
    }

    targetPosition = Math.max(0, targetPosition);

    if (
      targetCategoryId === dragState.sourceCategoryId &&
      targetPosition === dragState.sourceIndex
    ) {
      clearDragState();
      return;
    }

    onArrangeRoom(dragState.roomId, targetCategoryId, targetPosition);
    clearDragState();
  };

  const handleCategoryDrop = (rawTargetIndex: number) => {
    if (!categoryDragState || isArranging || categories.length === 0) {
      clearCategoryDragState();
      return;
    }

    let targetPosition = rawTargetIndex;
    if (categoryDragState.sourceIndex < rawTargetIndex) {
      targetPosition = rawTargetIndex - 1;
    }

    targetPosition = Math.max(
      0,
      Math.min(targetPosition, categories.length - 1),
    );

    if (targetPosition === categoryDragState.sourceIndex) {
      clearCategoryDragState();
      return;
    }

    onArrangeCategory(categoryDragState.categoryId, targetPosition);
    clearCategoryDragState();
  };

  const renderInsertionIndicator = (categoryKey: string, index: number) => {
    const isActive =
      !!dragState &&
      dropTarget?.categoryKey === categoryKey &&
      dropTarget.index === index;
    return React.createElement('div', {
      className: `h-2 rounded transition-colors ${
        isActive ? 'bg-[var(--wd-accent)]' : 'bg-transparent'
      }`,
    });
  };

  const renderCategoryInsertionIndicator = (index: number) => {
    const isActive = !!categoryDragState && categoryDropIndex === index;
    return React.createElement('div', {
      className: `h-2 my-1 rounded transition-colors ${
        isActive ? 'bg-[var(--wd-accent)]' : 'bg-transparent'
      }`,
    });
  };

  return {
    dragState,
    setDragState,
    dropTarget,
    setDropTarget,
    categoryDragState,
    setCategoryDragState,
    categoryDropIndex,
    setCategoryDropIndex,
    clearDragState,
    clearCategoryDragState,
    setRoomNodeRef,
    updateDropTargetFromPointer,
    handleDrop,
    handleCategoryDrop,
    renderInsertionIndicator,
    renderCategoryInsertionIndicator,
  };
}

export default useRoomDragDrop;
