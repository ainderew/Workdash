import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
    ChatV2Room,
    ChatV2RoomCategory,
} from "@/communication/chatV2/_types";
import {
    Bell,
    Check,
    ChevronDown,
    Copy,
    Fingerprint,
    FolderPlus,
    LogOut,
    MoreHorizontal,
    Plus,
    Settings,
    UserPlus,
} from "lucide-react";
import useUiStore from "@/common/store/uiStore";
import useUserStore from "@/common/store/useStore";
import { getDisplayName } from "@/common/utils/displayName";
import ChannelHashIcon from "./ChannelHashIcon";
import DeskModeControls from "./DeskModeControls";
import CreateCategoryModal from "./modals/CreateCategoryModal";
import CreateRoomModal from "./modals/CreateRoomModal";
import DeleteRoomModal from "./modals/DeleteRoomModal";
import RenameCategoryModal from "./modals/RenameCategoryModal";
import RenameRoomModal from "./modals/RenameRoomModal";
import UserSettingsModal from "./modals/UserSettingsModal";

const DEFAULT_CATEGORY_KEY = "__workspace_default__";
const DEFAULT_CATEGORY_NAME = "W";
const ROOM_CONTEXT_MENU_WIDTH = 180;
const ROOM_CONTEXT_MENU_HEIGHT = 86;

type DragState = {
    roomId: string;
    sourceCategoryId: string | null;
    sourceIndex: number;
};

type DropTarget = {
    categoryKey: string;
    index: number;
};

type CategoryDragState = {
    categoryId: string;
    sourceIndex: number;
};

type RoomContextMenuState = {
    roomId: string;
    x: number;
    y: number;
};

type CategoryContextMenuState = {
    categoryId: string;
    x: number;
    y: number;
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
    isUpdatingRoom: boolean;
    presentation?: "desk" | "drawer";
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
    isUpdatingRoom,
    presentation = "desk",
    onClosePanel,
    onSelectRoom,
    onCreateRoom,
    onCreateCategory,
    onRenameCategory,
    onArrangeCategory,
    onArrangeRoom,
    onRenameRoom,
    onDeleteRoom,
}: ChannelSidebarProps) {
    const setInteractionMode = useUiStore((state) => state.setInteractionMode);
    const user = useUserStore((state) => state.user);
    const [collapsedByCategoryKey, setCollapsedByCategoryKey] = useState<
        Record<string, boolean>
    >({});
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [categoryDragState, setCategoryDragState] =
        useState<CategoryDragState | null>(null);
    const [categoryDropIndex, setCategoryDropIndex] = useState<number | null>(
        null,
    );
    const [isAvatarLoadFailed, setIsAvatarLoadFailed] = useState(false);
    const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] =
        useState(false);
    const [roomModalCategoryId, setRoomModalCategoryId] = useState<
        string | null
    >(null);
    const [roomContextMenu, setRoomContextMenu] =
        useState<RoomContextMenuState | null>(null);
    const [categoryContextMenu, setCategoryContextMenu] =
        useState<CategoryContextMenuState | null>(null);
    const [isServerActionsMenuOpen, setIsServerActionsMenuOpen] =
        useState(false);
    const [renameCategoryId, setRenameCategoryId] = useState<string | null>(
        null,
    );
    const [renameRoomId, setRenameRoomId] = useState<string | null>(null);
    const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
    const [isUserIdExpanded, setIsUserIdExpanded] = useState(false);
    const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false);
    const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] =
        useState(false);
    const [userIdCopyState, setUserIdCopyState] = useState<
        "idle" | "copied" | "failed"
    >("idle");
    const roomNodeRefs = useRef<
        Record<string, Array<HTMLButtonElement | null>>
    >({});
    const userIdCopyResetTimeoutRef = useRef<number | null>(null);

    const categoryTree = useMemo(() => {
        const entries: Array<{ key: string; id: string | null; name: string }> =
            [
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
            rooms.reduce<Record<string, ChatV2Room>>((accumulator, room) => {
                accumulator[room.id] = room;
                return accumulator;
            }, {}),
        [rooms],
    );
    const categoryById = useMemo(
        () =>
            categories.reduce<Record<string, ChatV2RoomCategory>>(
                (accumulator, category) => {
                    accumulator[category.id] = category;
                    return accumulator;
                },
                {},
            ),
        [categories],
    );
    const categoryIndexById = useMemo(
        () =>
            categories.reduce<Record<string, number>>(
                (accumulator, category, index) => {
                    accumulator[category.id] = index;
                    return accumulator;
                },
                {},
            ),
        [categories],
    );

    const displayName = getDisplayName(
        {
            nickname:
                user.nickname ?? window.__BACKEND_USER__?.nickname ?? null,
            name: user.name || window.__BACKEND_USER__?.name || null,
        },
        "You",
    );
    const normalizedServerName = serverName.trim() || "Workdash Server";
    const localBackendUserId =
        typeof window !== "undefined" ? window.__BACKEND_USER__?.id : undefined;
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

    useEffect(
        () => () => {
            if (userIdCopyResetTimeoutRef.current !== null) {
                window.clearTimeout(userIdCopyResetTimeoutRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        if (
            !roomContextMenu &&
            !categoryContextMenu &&
            !isServerActionsMenuOpen &&
            !isUserIdExpanded &&
            !isUtilityMenuOpen
        ) {
            return undefined;
        }

        const closeMenu = () => {
            setRoomContextMenu(null);
            setCategoryContextMenu(null);
            setIsServerActionsMenuOpen(false);
            setIsUserIdExpanded(false);
            setIsUtilityMenuOpen(false);
        };
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-room-context-menu='true']")) return;
            if (target?.closest("[data-category-context-menu='true']")) return;
            if (target?.closest("[data-server-actions-menu='true']")) return;
            if (target?.closest("[data-server-actions-trigger='true']")) return;
            if (target?.closest("[data-user-id-panel='true']")) return;
            if (target?.closest("[data-user-id-trigger='true']")) return;
            if (target?.closest("[data-user-utility-menu='true']")) return;
            if (target?.closest("[data-user-utility-trigger='true']")) return;
            closeMenu();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeMenu();
            }
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", closeMenu, true);
        window.addEventListener("resize", closeMenu);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", closeMenu, true);
            window.removeEventListener("resize", closeMenu);
        };
    }, [
        categoryContextMenu,
        isUserIdExpanded,
        isUtilityMenuOpen,
        isServerActionsMenuOpen,
        roomContextMenu,
    ]);

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

    const clearCategoryDragState = () => {
        setCategoryDragState(null);
        setCategoryDropIndex(null);
    };

    const hasManageRole = (role: ChatV2Room["viewerRole"]) =>
        role === "OWNER" || role === "ADMIN" || role === "MODERATOR";

    const canManageRoom = (room: ChatV2Room) =>
        room.viewerRole === undefined || hasManageRole(room.viewerRole);

    const hasViewerRoleData = rooms.some(
        (room) => room.viewerRole !== undefined,
    );
    const canManageCategories = hasViewerRoleData
        ? rooms.some((room) => hasManageRole(room.viewerRole))
        : true;

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

    const selectedRenameCategory = renameCategoryId
        ? categoryById[renameCategoryId]
        : undefined;
    const selectedRenameRoom = renameRoomId
        ? roomById[renameRoomId]
        : undefined;
    const selectedDeleteRoom = deleteRoomId
        ? roomById[deleteRoomId]
        : undefined;

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
        return (
            <div
                className={`h-2 rounded transition-colors ${
                    isActive ? "bg-[var(--wd-accent)]" : "bg-transparent"
                }`}
            />
        );
    };

    const renderCategoryInsertionIndicator = (index: number) => {
        const isActive = !!categoryDragState && categoryDropIndex === index;
        return (
            <div
                className={`h-2 my-1 rounded transition-colors ${
                    isActive ? "bg-[var(--wd-accent)]" : "bg-transparent"
                }`}
            />
        );
    };

    const handleCopyUserId = async () => {
        if (typeof localBackendUserId !== "number") {
            setUserIdCopyState("failed");
            return;
        }

        try {
            await navigator.clipboard.writeText(String(localBackendUserId));
            setUserIdCopyState("copied");
        } catch {
            setUserIdCopyState("failed");
        }

        if (userIdCopyResetTimeoutRef.current !== null) {
            window.clearTimeout(userIdCopyResetTimeoutRef.current);
        }
        userIdCopyResetTimeoutRef.current = window.setTimeout(() => {
            setUserIdCopyState("idle");
        }, 1800);
    };

    return (
        <aside
            id="category-aside"
            className="w-80 wd-bg-panel border-r wd-border-subtle flex flex-col min-h-0"
        >
            <div className="px-4 h-14 border-b wd-border-subtle flex items-center justify-between gap-2 relative">
                <button
                    type="button"
                    data-server-actions-trigger="true"
                    disabled={isCreatingCategory || isCreatingRoom}
                    onClick={() => {
                        setRoomContextMenu(null);
                        setCategoryContextMenu(null);
                        setIsServerActionsMenuOpen((current) => !current);
                    }}
                    className="inline-flex min-w-0 max-w-[85%] items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
                >
                    <span className="truncate text-sm font-semibold">
                        {normalizedServerName}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`shrink-0 transition-transform ${
                            isServerActionsMenuOpen ? "rotate-180" : "rotate-0"
                        }`}
                    />
                </button>

                <button
                    type="button"
                    onClick={() => openCreateRoomModal(null)}
                    disabled={isCreatingRoom}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:text-[var(--wd-text-primary)] disabled:opacity-50"
                    aria-label="Create room"
                >
                    <UserPlus size={17} />
                </button>

                {isServerActionsMenuOpen && (
                    <div
                        data-server-actions-menu="true"
                        className="absolute left-4 right-4 top-[calc(100%+10px)] z-[130] rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2"
                    >
                        <div className="space-y-1 py-1">
                            <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm wd-text-primary">
                                <span>Notification Settings</span>
                                <Bell size={17} className="wd-text-secondary" />
                            </div>
                        </div>

                        <div className="my-1 h-px bg-[var(--wd-border-subtle)]" />

                        <div className="space-y-1 py-1">
                            <button
                                type="button"
                                onClick={() => {
                                    openCreateCategoryModal();
                                    setIsServerActionsMenuOpen(false);
                                }}
                                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
                            >
                                <span>Create Category</span>
                                <FolderPlus
                                    size={17}
                                    className="wd-text-secondary"
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    openCreateRoomModal(null);
                                    setIsServerActionsMenuOpen(false);
                                }}
                                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
                            >
                                <span>Create Room</span>
                                <Plus size={17} className="wd-text-secondary" />
                            </button>
                        </div>

                        <div className="my-1 h-px bg-[var(--wd-border-subtle)]" />

                        <div className="space-y-1 py-1">
                            <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm wd-text-secondary">
                                <span>Server Settings</span>
                                <Settings size={17} />
                            </div>
                            <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[#ff7b7b]">
                                <span>Leave Server</span>
                                <LogOut size={17} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div
                id="categories-container"
                className="no-scrollbar flex-1 min-h-0 overflow-y-auto px-3 py-2"
            >
                {isLoading ? (
                    <div className="text-xs wd-text-muted px-2 py-3">
                        Loading channels...
                    </div>
                ) : (
                    categoryTree.map((category) => {
                        const isCollapsed =
                            !!collapsedByCategoryKey[category.key];
                        const categoryPosition = category.id
                            ? categoryIndexById[category.id]
                            : undefined;
                        const isDraggingCategory =
                            !!category.id &&
                            categoryDragState?.categoryId === category.id;

                        return (
                            <React.Fragment key={category.key}>
                                {typeof categoryPosition === "number" &&
                                    renderCategoryInsertionIndicator(
                                        categoryPosition,
                                    )}
                                <section
                                    className={`mb-2 ${
                                        isDraggingCategory
                                            ? "opacity-40"
                                            : "opacity-100"
                                    }`}
                                >
                                    <div
                                        draggable={
                                            !!category.id &&
                                            !isArranging &&
                                            !isUpdatingRoom
                                        }
                                        className="flex items-center gap-2 px-1 py-1 text-xs uppercase tracking-wide wd-text-muted hover:text-[var(--wd-text-secondary)] cursor-pointer"
                                        onClick={() => {
                                            setCategoryContextMenu(null);
                                            toggleCollapsed(category.key);
                                        }}
                                        onContextMenu={(event) => {
                                            if (category.id) {
                                                openCategoryContextMenu(
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
                                                typeof categoryPosition !==
                                                    "number"
                                            ) {
                                                event.preventDefault();
                                                return;
                                            }
                                            event.dataTransfer.effectAllowed =
                                                "move";
                                            setCategoryDragState({
                                                categoryId: category.id,
                                                sourceIndex: categoryPosition,
                                            });
                                            setCategoryDropIndex(
                                                categoryPosition,
                                            );
                                            clearDragState();
                                        }}
                                        onDragEnd={clearCategoryDragState}
                                        onDragOver={(event) => {
                                            if (
                                                categoryDragState &&
                                                typeof categoryPosition ===
                                                    "number"
                                            ) {
                                                event.preventDefault();
                                                const rect =
                                                    event.currentTarget.getBoundingClientRect();
                                                const nextIndex =
                                                    event.clientY <
                                                    rect.top + rect.height / 2
                                                        ? categoryPosition
                                                        : categoryPosition + 1;
                                                setCategoryDropIndex(nextIndex);
                                                return;
                                            }

                                            if (!dragState || isArranging)
                                                return;
                                            event.preventDefault();
                                            updateDropTargetFromPointer(
                                                category.key,
                                                event.clientY,
                                            );
                                        }}
                                        onDrop={(event) => {
                                            if (
                                                categoryDragState &&
                                                typeof categoryPosition ===
                                                    "number"
                                            ) {
                                                event.preventDefault();
                                                const rect =
                                                    event.currentTarget.getBoundingClientRect();
                                                const nextIndex =
                                                    event.clientY <
                                                    rect.top + rect.height / 2
                                                        ? categoryPosition
                                                        : categoryPosition + 1;
                                                handleCategoryDrop(nextIndex);
                                                return;
                                            }

                                            if (!dragState || isArranging)
                                                return;
                                            event.preventDefault();
                                            const targetIndex =
                                                updateDropTargetFromPointer(
                                                    category.key,
                                                    event.clientY,
                                                );
                                            handleDrop(
                                                category.key,
                                                targetIndex,
                                            );
                                        }}
                                    >
                                        <span className="w-3 text-center">
                                            {isCollapsed ? "▸" : "▾"}
                                        </span>
                                        <span>{category.name}</span>
                                    </div>

                                    {!isCollapsed && (
                                        <div
                                            className={`pt-1 pb-2 min-h-10 rounded ${
                                                dragState &&
                                                dropTarget?.categoryKey ===
                                                    category.key
                                                    ? "wd-bg-elevated"
                                                    : ""
                                            }`}
                                            onDragOver={(event) => {
                                                if (categoryDragState) return;
                                                if (!dragState || isArranging)
                                                    return;
                                                event.preventDefault();
                                                updateDropTargetFromPointer(
                                                    category.key,
                                                    event.clientY,
                                                );
                                            }}
                                            onDrop={(event) => {
                                                if (categoryDragState) return;
                                                if (!dragState || isArranging)
                                                    return;
                                                event.preventDefault();
                                                const targetIndex =
                                                    updateDropTargetFromPointer(
                                                        category.key,
                                                        event.clientY,
                                                    );
                                                handleDrop(
                                                    category.key,
                                                    targetIndex,
                                                );
                                            }}
                                        >
                                            {renderInsertionIndicator(
                                                category.key,
                                                0,
                                            )}

                                            {category.rooms.length === 0 ? (
                                                <div className="px-2 py-3 text-xs wd-text-muted">
                                                    No rooms.
                                                </div>
                                            ) : (
                                                category.rooms.map(
                                                    (room, roomIndex) => {
                                                        const isActiveRoom =
                                                            currentRoomId ===
                                                            room.id;
                                                        const isDraggingRoom =
                                                            dragState?.roomId ===
                                                            room.id;

                                                        return (
                                                            <React.Fragment
                                                                key={room.id}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    draggable={
                                                                        !isArranging &&
                                                                        !isUpdatingRoom &&
                                                                        !categoryDragState
                                                                    }
                                                                    ref={(
                                                                        node,
                                                                    ) =>
                                                                        setRoomNodeRef(
                                                                            category.key,
                                                                            roomIndex,
                                                                            node,
                                                                        )
                                                                    }
                                                                    onDragStart={(
                                                                        event,
                                                                    ) => {
                                                                        if (
                                                                            isArranging ||
                                                                            categoryDragState
                                                                        ) {
                                                                            event.preventDefault();
                                                                            return;
                                                                        }
                                                                        event.dataTransfer.effectAllowed =
                                                                            "move";
                                                                        setDragState(
                                                                            {
                                                                                roomId: room.id,
                                                                                sourceCategoryId:
                                                                                    room.categoryId,
                                                                                sourceIndex:
                                                                                    roomIndex,
                                                                            },
                                                                        );
                                                                        setDropTarget(
                                                                            {
                                                                                categoryKey:
                                                                                    category.key,
                                                                                index: roomIndex,
                                                                            },
                                                                        );
                                                                        clearCategoryDragState();
                                                                    }}
                                                                    onDragEnd={
                                                                        clearDragState
                                                                    }
                                                                    onClick={() => {
                                                                        setRoomContextMenu(
                                                                            null,
                                                                        );
                                                                        setCategoryContextMenu(
                                                                            null,
                                                                        );
                                                                        onSelectRoom(
                                                                            room.id,
                                                                        );
                                                                    }}
                                                                    onContextMenu={(
                                                                        event,
                                                                    ) => {
                                                                        openRoomContextMenu(
                                                                            event,
                                                                            room,
                                                                        );
                                                                    }}
                                                                    className={`w-full text-left px-2 py-2 rounded-md text-sm transition-colors ${
                                                                        isActiveRoom
                                                                            ? "wd-text-primary bg-[var(--wd-surface-elevated)]"
                                                                            : "wd-text-secondary hover:text-[var(--wd-text-primary)] hover:bg-[var(--wd-surface-elevated)]"
                                                                    } ${
                                                                        isDraggingRoom
                                                                            ? "opacity-40"
                                                                            : "opacity-100"
                                                                    }`}
                                                                    style={{
                                                                        fontWeight:
                                                                            isActiveRoom
                                                                                ? 500
                                                                                : 400,
                                                                    }}
                                                                >
                                                                    <ChannelHashIcon
                                                                        size={
                                                                            18
                                                                        }
                                                                        className="inline-block shrink-0 align-text-bottom opacity-60"
                                                                    />{" "}
                                                                    <span
                                                                        style={{
                                                                            fontWeight:
                                                                                isActiveRoom
                                                                                    ? 500
                                                                                    : 400,
                                                                        }}
                                                                    >
                                                                        {
                                                                            room.name
                                                                        }
                                                                    </span>
                                                                </button>
                                                                {renderInsertionIndicator(
                                                                    category.key,
                                                                    roomIndex +
                                                                        1,
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    },
                                                )
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
                            if (!categoryDragState || isArranging) return;
                            event.preventDefault();
                            setCategoryDropIndex(categories.length);
                        }}
                        onDrop={(event) => {
                            if (!categoryDragState || isArranging) return;
                            event.preventDefault();
                            handleCategoryDrop(categories.length);
                        }}
                    >
                        {renderCategoryInsertionIndicator(categories.length)}
                    </div>
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
                            <p className="text-xs wd-text-muted">
                                {presentation === "desk"
                                    ? "Desk mode"
                                    : "2D mode"}
                            </p>
                        </div>
                    </div>

                    <div className="relative flex items-center gap-1.5">
                        <DeskModeControls
                            compact
                            showMicrophoneSelector={false}
                        />

                        <button
                            type="button"
                            data-user-utility-trigger="true"
                            title="More user actions"
                            aria-label="More user actions"
                            onClick={() => {
                                setIsUtilityMenuOpen((current) => {
                                    const next = !current;
                                    if (!next) {
                                        setIsUserIdExpanded(false);
                                    }
                                    return next;
                                });
                            }}
                            className="relative h-7 w-7 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:bg-[var(--wd-surface-base)] hover:wd-text-primary"
                        >
                            <MoreHorizontal size={15} />
                        </button>

                        {isUtilityMenuOpen && (
                            <div
                                data-user-utility-menu="true"
                                className="absolute right-0 bottom-[calc(100%+8px)] z-[260] w-48 rounded-xl border wd-border-strong wd-bg-panel shadow-[0_16px_40px_rgba(0,0,0,0.45)] p-2"
                            >
                                <p className="px-1 text-[10px] font-semibold uppercase tracking-wide wd-text-muted">
                                    User Actions
                                </p>
                                <div className="mt-2 space-y-1">
                                    <button
                                        type="button"
                                        title="Settings"
                                        aria-label="Settings"
                                        onClick={() => {
                                            setIsUserSettingsModalOpen(true);
                                            setIsUtilityMenuOpen(false);
                                            setIsUserIdExpanded(false);
                                        }}
                                        className="w-full h-8 px-2 inline-flex items-center justify-between rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:bg-[var(--wd-surface-base)] hover:wd-text-primary"
                                    >
                                        <span className="inline-flex items-center gap-2 text-xs font-medium">
                                            <Settings size={13} />
                                            Settings
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        data-user-id-trigger="true"
                                        title="User ID"
                                        aria-label="User ID"
                                        onClick={() => {
                                            setIsUserIdExpanded((current) => {
                                                return !current;
                                            });
                                        }}
                                        className="w-full h-8 px-2 inline-flex items-center justify-between rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:bg-[var(--wd-surface-base)] hover:wd-text-primary"
                                    >
                                        <span className="inline-flex items-center gap-2 text-xs font-medium">
                                            <Fingerprint size={13} />
                                            User ID
                                        </span>
                                        <span className="text-[11px] wd-text-muted">
                                            {isUserIdExpanded ? "Open" : ""}
                                        </span>
                                    </button>
                                </div>

                                {isUserIdExpanded && (
                                    <div
                                        data-user-id-panel="true"
                                        className="absolute left-[calc(100%+8px)] bottom-0 z-[280] w-56 rounded-xl border wd-border-strong wd-bg-panel shadow-[0_16px_40px_rgba(0,0,0,0.45)] p-2"
                                    >
                                        <p className="px-1 text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                                            User ID
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <code className="flex-1 h-8 rounded-md border wd-border-subtle wd-bg-panel-2 px-2 inline-flex items-center text-xs wd-text-primary font-mono truncate">
                                                {typeof localBackendUserId ===
                                                "number"
                                                    ? localBackendUserId
                                                    : "Unavailable"}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void handleCopyUserId();
                                                }}
                                                disabled={
                                                    typeof localBackendUserId !==
                                                    "number"
                                                }
                                                className="h-8 px-2 inline-flex items-center gap-1 rounded-md border wd-border-subtle wd-bg-panel-2 text-xs font-semibold wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)] disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {userIdCopyState ===
                                                "copied" ? (
                                                    <Check size={13} />
                                                ) : (
                                                    <Copy size={13} />
                                                )}
                                                <span>
                                                    {userIdCopyState ===
                                                    "copied"
                                                        ? "Copied"
                                                        : userIdCopyState ===
                                                            "failed"
                                                          ? "Retry"
                                                          : "Copy"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {presentation === "desk" ? (
                    <button
                        type="button"
                        onClick={() => setInteractionMode("world")}
                        className="mt-3 w-full inline-flex h-8 items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated px-3 text-xs font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-base)]"
                    >
                        2D Mode
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => onClosePanel?.()}
                        className="mt-3 w-full inline-flex h-8 items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated px-3 text-xs font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-base)]"
                    >
                        Close Chat
                    </button>
                )}
            </footer>
            <UserSettingsModal
                isOpen={isUserSettingsModalOpen}
                onClose={() => setIsUserSettingsModalOpen(false)}
            />

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
                            setRenameCategoryId(categoryContextMenu.categoryId);
                            setCategoryContextMenu(null);
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
                            setRenameRoomId(roomContextMenu.roomId);
                            setRoomContextMenu(null);
                            setCategoryContextMenu(null);
                        }}
                        className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
                    >
                        Rename Channel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setDeleteRoomId(roomContextMenu.roomId);
                            setRoomContextMenu(null);
                            setCategoryContextMenu(null);
                        }}
                        className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-danger transition-colors hover:bg-[color:var(--wd-danger-soft)]"
                    >
                        Delete Channel
                    </button>
                </div>
            )}

            <RenameCategoryModal
                isOpen={!!selectedRenameCategory}
                categoryName={selectedRenameCategory?.name ?? ""}
                isSubmitting={isUpdatingRoom}
                onClose={() => setRenameCategoryId(null)}
                onSubmit={(nextName) => {
                    if (!selectedRenameCategory) return;
                    onRenameCategory(selectedRenameCategory.id, nextName);
                    setRenameCategoryId(null);
                }}
            />

            <RenameRoomModal
                isOpen={!!selectedRenameRoom}
                roomName={selectedRenameRoom?.name ?? ""}
                isSubmitting={isUpdatingRoom}
                onClose={() => setRenameRoomId(null)}
                onSubmit={(nextName) => {
                    if (!selectedRenameRoom) return;
                    onRenameRoom(selectedRenameRoom.id, nextName);
                    setRenameRoomId(null);
                }}
            />

            <DeleteRoomModal
                isOpen={!!selectedDeleteRoom}
                roomName={selectedDeleteRoom?.name ?? ""}
                isSubmitting={isUpdatingRoom}
                onClose={() => setDeleteRoomId(null)}
                onConfirm={() => {
                    if (!selectedDeleteRoom) return;
                    onDeleteRoom(selectedDeleteRoom.id);
                    setDeleteRoomId(null);
                }}
            />
        </aside>
    );
}

export default ChannelSidebar;
