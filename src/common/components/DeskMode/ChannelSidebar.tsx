import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChatV2Room, ChatV2RoomCategory } from "@/communication/chatV2/_types";
import useUiStore from "@/common/store/uiStore";
import useUserStore from "@/common/store/useStore";
import DeskModeControls from "./DeskModeControls";
import CreateCategoryModal from "./modals/CreateCategoryModal";
import CreateRoomModal from "./modals/CreateRoomModal";

const DEFAULT_CATEGORY_KEY = "__workspace_default__";
const DEFAULT_CATEGORY_NAME = "W";

type DragState = {
    roomId: string;
    sourceCategoryId: string | null;
    sourceIndex: number;
};

type DropTarget = {
    categoryKey: string;
    index: number;
};

interface ChannelSidebarProps {
    serverName: string;
    rooms: ChatV2Room[];
    categories: ChatV2RoomCategory[];
    currentRoomId: string | null;
    isLoading: boolean;
    isCreatingRoom: boolean;
    isCreatingCategory: boolean;
    isArranging: boolean;
    onSelectRoom: (roomId: string) => void;
    onCreateRoom: (name: string, categoryId: string | null) => void;
    onCreateCategory: (name: string) => void;
    onArrangeRoom: (
        roomId: string,
        categoryId: string | null,
        position: number,
    ) => void;
}

function ChannelSidebar({
    serverName,
    rooms,
    categories,
    currentRoomId,
    isLoading,
    isCreatingRoom,
    isCreatingCategory,
    isArranging,
    onSelectRoom,
    onCreateRoom,
    onCreateCategory,
    onArrangeRoom,
}: ChannelSidebarProps) {
    const setInteractionMode = useUiStore((state) => state.setInteractionMode);
    const user = useUserStore((state) => state.user);
    const [collapsedByCategoryKey, setCollapsedByCategoryKey] =
        useState<Record<string, boolean>>({});
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [isAvatarLoadFailed, setIsAvatarLoadFailed] = useState(false);
    const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
    const [roomModalCategoryId, setRoomModalCategoryId] = useState<string | null>(
        null,
    );
    const roomNodeRefs = useRef<Record<string, Array<HTMLButtonElement | null>>>(
        {},
    );

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

    const displayName = user.name?.trim() || "You";
    const normalizedServerName = serverName.trim() || "Workdash Server";
    const spriteSheetDataUrl = user.spriteSheetDataUrl?.trim() || "";
    const avatarUrl = user.image?.trim() || "";
    const showAvatarImage = avatarUrl.length > 0 && !isAvatarLoadFailed;

    const avatarSpriteStyles = useMemo<React.CSSProperties>(() => {
        if (!spriteSheetDataUrl) return {};

        return {
            backgroundImage: `url('${spriteSheetDataUrl}')`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "-94px -20px",
            imageRendering: "pixelated",
        };
    }, [spriteSheetDataUrl]);

    const defaultSpriteStyles = useMemo<React.CSSProperties>(
        () => ({
            backgroundImage:
                "url('/assets/characters/Characters/Adam/Adam_idle_16x16.png')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "auto 200%",
            backgroundPosition: "-607px -16px",
            imageRendering: "pixelated",
        }),
        [],
    );

    useEffect(() => {
        setIsAvatarLoadFailed(false);
    }, [avatarUrl]);

    const toggleCollapsed = (categoryKey: string) => {
        setCollapsedByCategoryKey((current) => ({
            ...current,
            [categoryKey]: !current[categoryKey],
        }));
    };

    const openCreateRoomModal = (categoryId: string | null) => {
        setRoomModalCategoryId(categoryId);
        setIsCreateRoomModalOpen(true);
    };

    const openCreateCategoryModal = () => {
        setIsCreateCategoryModalOpen(true);
    };

    const clearDragState = () => {
        setDragState(null);
        setDropTarget(null);
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

    const updateDropTargetFromPointer = (categoryKey: string, pointerY: number) => {
        const index = getNearestDropIndex(categoryKey, pointerY);
        setDropTarget({ categoryKey, index });
        return index;
    };

    const handleDrop = (categoryKey: string, rawTargetIndex: number) => {
        if (!dragState || isArranging) {
            clearDragState();
            return;
        }

        const targetCategoryId =
            categoryKey === DEFAULT_CATEGORY_KEY ? null : categoryKey;

        let targetPosition = rawTargetIndex;
        const sourceCategoryKey = dragState.sourceCategoryId ?? DEFAULT_CATEGORY_KEY;

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

    const renderInsertionIndicator = (categoryKey: string, index: number) => {
        const isActive =
            !!dragState &&
            dropTarget?.categoryKey === categoryKey &&
            dropTarget.index === index;
        return (
            <div
                className={`h-2 my-1 rounded transition-colors ${
                    isActive ? "bg-[var(--wd-accent)]" : "bg-transparent"
                }`}
            />
        );
    };

    return (
        <aside className="w-80 wd-bg-panel border-r wd-border-subtle flex flex-col min-h-0">
            <div className="px-4 h-14 border-b wd-border-subtle flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold wd-text-primary truncate pr-2">
                    {normalizedServerName}
                </h2>
                <span className="text-xs wd-text-muted">▾</span>
            </div>

            <div className="px-4 py-2 border-b wd-border-subtle flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide wd-text-muted">Channels</p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={openCreateCategoryModal}
                        disabled={isCreatingCategory}
                        className="text-xs wd-text-secondary hover:text-[var(--wd-text-primary)] disabled:opacity-50"
                    >
                        + Category
                    </button>
                    <button
                        type="button"
                        onClick={() => openCreateRoomModal(null)}
                        disabled={isCreatingRoom}
                        className="text-xs wd-text-secondary hover:text-[var(--wd-text-primary)] disabled:opacity-50"
                    >
                        + Room
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
                {isLoading ? (
                    <div className="text-xs wd-text-muted px-2 py-3">Loading channels...</div>
                ) : (
                    categoryTree.map((category) => {
                        const isCollapsed = !!collapsedByCategoryKey[category.key];

                        return (
                            <section key={category.key} className="mb-2">
                                <div
                                    className="flex items-center gap-2 px-1 py-1 text-xs uppercase tracking-wide wd-text-muted hover:text-[var(--wd-text-secondary)] cursor-pointer"
                                    onClick={() => toggleCollapsed(category.key)}
                                    onDragOver={(event) => {
                                        if (!dragState || isArranging) return;
                                        event.preventDefault();
                                        updateDropTargetFromPointer(
                                            category.key,
                                            event.clientY,
                                        );
                                    }}
                                    onDrop={(event) => {
                                        if (!dragState || isArranging) return;
                                        event.preventDefault();
                                        const targetIndex = updateDropTargetFromPointer(
                                            category.key,
                                            event.clientY,
                                        );
                                        handleDrop(category.key, targetIndex);
                                    }}
                                >
                                    <span className="w-3 text-center">
                                        {isCollapsed ? "▸" : "▾"}
                                    </span>
                                    <span>{category.name}</span>
                                </div>

                                {!isCollapsed && (
                                    <div
                                        className={`pl-4 pt-1 pb-2 min-h-10 rounded ${
                                            dragState &&
                                            dropTarget?.categoryKey === category.key
                                                ? "wd-bg-elevated"
                                                : ""
                                        }`}
                                        onDragOver={(event) => {
                                            if (!dragState || isArranging) return;
                                            event.preventDefault();
                                            updateDropTargetFromPointer(
                                                category.key,
                                                event.clientY,
                                            );
                                        }}
                                        onDrop={(event) => {
                                            if (!dragState || isArranging) return;
                                            event.preventDefault();
                                            const targetIndex = updateDropTargetFromPointer(
                                                category.key,
                                                event.clientY,
                                            );
                                            handleDrop(category.key, targetIndex);
                                        }}
                                    >
                                        {renderInsertionIndicator(category.key, 0)}

                                        {category.rooms.length === 0 ? (
                                            <div className="px-2 py-3 text-xs wd-text-muted">
                                                No rooms.
                                            </div>
                                        ) : (
                                            category.rooms.map((room, roomIndex) => {
                                                const isDraggingRoom = dragState?.roomId === room.id;

                                                return (
                                                    <React.Fragment key={room.id}>
                                                        <button
                                                            type="button"
                                                            draggable={!isArranging}
                                                            ref={(node) =>
                                                                setRoomNodeRef(
                                                                    category.key,
                                                                    roomIndex,
                                                                    node,
                                                                )
                                                            }
                                                            onDragStart={(event) => {
                                                                if (isArranging) {
                                                                    event.preventDefault();
                                                                    return;
                                                                }
                                                                event.dataTransfer.effectAllowed = "move";
                                                                setDragState({
                                                                    roomId: room.id,
                                                                    sourceCategoryId: room.categoryId,
                                                                    sourceIndex: roomIndex,
                                                                });
                                                                setDropTarget({
                                                                    categoryKey: category.key,
                                                                    index: roomIndex,
                                                                });
                                                            }}
                                                            onDragEnd={clearDragState}
                                                            onClick={() => onSelectRoom(room.id)}
                                                            className={`w-full text-left px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                                                                currentRoomId === room.id
                                                                    ? "wd-text-accent"
                                                                    : "wd-text-secondary hover:text-[var(--wd-text-primary)]"
                                                            } ${
                                                                isDraggingRoom ? "opacity-40" : "opacity-100"
                                                            }`}
                                                        >
                                                            # {room.name}
                                                        </button>
                                                        {renderInsertionIndicator(
                                                            category.key,
                                                            roomIndex + 1,
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </section>
                        );
                    })
                )}
            </div>

            <footer className="border-t wd-border-subtle wd-bg-panel p-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        {spriteSheetDataUrl ? (
                            <div
                                className="h-9 w-9 rounded-full wd-bg-elevated wd-text-primary ring-1 wd-border-subtle bg-no-repeat"
                                style={avatarSpriteStyles}
                            />
                        ) : showAvatarImage ? (
                            <img
                                src={avatarUrl}
                                alt={`${displayName} avatar`}
                                onError={() => setIsAvatarLoadFailed(true)}
                                className="h-9 w-9 rounded-full object-cover ring-1 wd-border-subtle"
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-full wd-bg-elevated wd-text-primary text-sm font-semibold flex items-center justify-center">
                                <div
                                    className="h-full w-full rounded-full bg-no-repeat"
                                    style={defaultSpriteStyles}
                                />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold wd-text-primary">
                                {displayName}
                            </p>
                            <p className="text-xs wd-text-muted">Desk mode</p>
                        </div>
                    </div>

                    <DeskModeControls compact showMicrophoneSelector={false} />
                </div>

                <button
                    type="button"
                    onClick={() => setInteractionMode("world")}
                    className="mt-3 w-full inline-flex h-8 items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated px-3 text-xs font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-base)]"
                >
                    2D Mode
                </button>
            </footer>

            <CreateCategoryModal
                isOpen={isCreateCategoryModalOpen}
                isSubmitting={isCreatingCategory}
                onClose={() => setIsCreateCategoryModalOpen(false)}
                onSubmit={(name) => {
                    onCreateCategory(name);
                    setIsCreateCategoryModalOpen(false);
                }}
            />

            <CreateRoomModal
                isOpen={isCreateRoomModalOpen}
                isSubmitting={isCreatingRoom}
                categoryOptions={roomCategoryOptions}
                initialCategoryId={roomModalCategoryId}
                onClose={() => setIsCreateRoomModalOpen(false)}
                onSubmit={(name, categoryId) => {
                    onCreateRoom(name, categoryId);
                    setIsCreateRoomModalOpen(false);
                }}
            />
        </aside>
    );
}

export default ChannelSidebar;
