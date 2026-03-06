import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Check,
    Copy,
    Fingerprint,
    MoreHorizontal,
    Plus,
    Search,
    Settings,
    UserRoundPlus,
} from "lucide-react";
import type {
    ChatV2DirectRoom,
    ChatV2Friend,
} from "@/communication/chatV2/_types";
import useUiStore from "@/common/store/uiStore";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { useShallow } from "zustand/react/shallow";
import DeskModeControls from "./DeskModeControls";
import UserSettingsModal from "./modals/UserSettingsModal";
import NewConversationModal from "./modals/NewConversationModal";
import { getDisplayName } from "@/common/utils/displayName";
import UserAvatar from "./UserAvatar";
import PresenceDot from "./PresenceDot";
import StatusLabel from "./StatusLabel";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";

interface DirectMessageSidebarProps {
    directRooms: ChatV2DirectRoom[];
    friends: ChatV2Friend[];
    currentRoomId: string | null;
    isLoadingDirectRooms: boolean;
    isLoadingFriends: boolean;
    presentation?: "desk" | "drawer";
    onClosePanel?: () => void;
    onSelectRoom: (roomId: string) => void;
    onOpenDirectMessage: (userId: number) => void;
}

function DirectMessageSidebar({
    directRooms,
    friends,
    currentRoomId,
    isLoadingDirectRooms,
    isLoadingFriends,
    presentation = "desk",
    onClosePanel,
    onSelectRoom,
    onOpenDirectMessage,
}: DirectMessageSidebarProps) {
    const setInteractionMode = useUiStore((state) => state.setInteractionMode);
    const user = useUserStore((state) => state.user);
    const unreadByRoomId = useChatV2Store(useShallow((state) => state.unreadByRoomId));
    const [query, setQuery] = useState("");
    const [isAvatarLoadFailed, setIsAvatarLoadFailed] = useState(false);
    const [isUserIdExpanded, setIsUserIdExpanded] = useState(false);
    const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false);
    const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] =
        useState(false);
    const [isNewConversationModalOpen, setIsNewConversationModalOpen] =
        useState(false);
    const [userIdCopyState, setUserIdCopyState] = useState<
        "idle" | "copied" | "failed"
    >("idle");
    const userIdCopyResetTimeoutRef = useRef<number | null>(null);

    const displayName = getDisplayName(
        {
            nickname:
                user.nickname ?? window.__BACKEND_USER__?.nickname ?? null,
            name: user.name || window.__BACKEND_USER__?.name || null,
        },
        "You",
    );
    const localBackendUserId =
        typeof window !== "undefined" ? window.__BACKEND_USER__?.id : undefined;
    const spriteSheetDataUrl = user.spriteSheetDataUrl?.trim() || "";
    const avatarUrl = user.image?.trim() || window.__BACKEND_USER__?.image?.trim() || "";
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

    const normalizedQuery = query.trim().toLowerCase();
    const getPeerDisplayName = useCallback(
        (peerUser: {
            id: number;
            name: string | null;
            nickname?: string | null;
        }) => getDisplayName(peerUser, `User ${peerUser.id}`),
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
        if (!isUserIdExpanded && !isUtilityMenuOpen) {
            return undefined;
        }

        const closePanel = () => {
            setIsUserIdExpanded(false);
            setIsUtilityMenuOpen(false);
        };

        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-user-id-panel='true']")) return;
            if (target?.closest("[data-user-id-trigger='true']")) return;
            if (target?.closest("[data-user-utility-menu='true']")) return;
            if (target?.closest("[data-user-utility-trigger='true']")) return;
            closePanel();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closePanel();
            }
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", closePanel, true);
        window.addEventListener("resize", closePanel);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", closePanel, true);
            window.removeEventListener("resize", closePanel);
        };
    }, [isUserIdExpanded, isUtilityMenuOpen]);

    const filteredDirectRooms = useMemo(() => {
        if (!normalizedQuery) return directRooms;
        return directRooms.filter((entry) =>
            getPeerDisplayName(entry.peerUser)
                .toLowerCase()
                .includes(normalizedQuery),
        );
    }, [directRooms, getPeerDisplayName, normalizedQuery]);

    const filteredFriends = useMemo(() => {
        if (!normalizedQuery) return [];
        return friends
            .filter((entry) =>
                getPeerDisplayName(entry.peerUser)
                    .toLowerCase()
                    .includes(normalizedQuery),
            )
            .slice(0, 6);
    }, [friends, getPeerDisplayName, normalizedQuery]);

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
        <>
            <aside className="w-80 wd-bg-panel border-r wd-border-subtle flex flex-col min-h-0">
                <div className="px-4 h-14 border-b wd-border-subtle flex items-center">
                    <p className="text-base font-semibold wd-text-primary">
                        Direct Messages
                    </p>
                </div>

                <div className="px-3 py-2 border-b wd-border-subtle">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search friends or DMs"
                            className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-8 pr-2 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                        />
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-3">
                    {normalizedQuery.length > 0 ? (
                        <section>
                            <p className="px-1 pb-1 text-[11px] uppercase tracking-wide wd-text-muted">
                                Friends
                            </p>
                            {isLoadingFriends ? (
                                <p className="px-2 py-2 text-xs wd-text-muted">
                                    Loading friends...
                                </p>
                            ) : filteredFriends.length === 0 ? (
                                <p className="px-2 py-2 text-xs wd-text-muted">
                                    No matching friends.
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {filteredFriends.map((entry) => (
                                        <button
                                            key={entry.friendshipId}
                                            type="button"
                                            onClick={() =>
                                                onOpenDirectMessage(
                                                    entry.peerUser.id,
                                                )
                                            }
                                            className="w-full px-2 py-1.5 rounded-md text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] flex items-center gap-4"
                                        >
                                            <div className="relative shrink-0">
                                                <UserAvatar
                                                    name={getPeerDisplayName(
                                                        entry.peerUser,
                                                    )}
                                                    image={entry.peerUser.image}
                                                    characterCustomization={
                                                        entry.peerUser
                                                            .characterCustomization
                                                    }
                                                />
                                                <PresenceDot userId={entry.peerUser.id} size="xs" />
                                            </div>
                                            <span className="truncate flex-1">
                                                {getPeerDisplayName(
                                                    entry.peerUser,
                                                )}
                                            </span>
                                            <UserRoundPlus
                                                size={14}
                                                className="wd-text-secondary shrink-0"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    ) : null}

                    <section>
                        <div className="flex items-center justify-between px-1 pb-2">
                            <p className="text-[11px] uppercase tracking-wide wd-text-muted">
                                Conversations
                            </p>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="New conversation"
                                        onClick={() =>
                                            setIsNewConversationModalOpen(true)
                                        }
                                        className="h-5 w-5 inline-flex items-center justify-center rounded wd-text-muted transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={4}>
                                    New conversation
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {isLoadingDirectRooms ? (
                            <p className="px-2 py-2 text-xs wd-text-muted">
                                Loading conversations...
                            </p>
                        ) : filteredDirectRooms.length === 0 ? (
                            <p className="px-2 py-2 text-xs wd-text-muted">
                                No direct messages yet.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {filteredDirectRooms.map((entry) => {
                                    const isActive =
                                        currentRoomId === entry.room.id;
                                    const unreadCount =
                                        unreadByRoomId[entry.room.id] ?? entry.room.unreadCount ?? 0;

                                    return (
                                        <button
                                            key={entry.directRoomId}
                                            type="button"
                                            onClick={() =>
                                                onSelectRoom(entry.room.id)
                                            }
                                            className={`w-full px-2 py-1.5 rounded-md text-left text-sm transition-colors flex items-center gap-4 ${
                                                isActive
                                                    ? "bg-[var(--wd-surface-elevated)] wd-text-primary"
                                                    : "wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <UserAvatar
                                                    name={getPeerDisplayName(
                                                        entry.peerUser,
                                                    )}
                                                    image={entry.peerUser.image}
                                                    characterCustomization={
                                                        entry.peerUser
                                                            .characterCustomization
                                                    }
                                                />
                                                <PresenceDot userId={entry.peerUser.id} size="xs" />
                                            </div>
                                            <span className="truncate flex-1">
                                                {getPeerDisplayName(
                                                    entry.peerUser,
                                                )}
                                            </span>
                                            {unreadCount > 0 ? (
                                                <span className="h-5 min-w-5 px-1 rounded-full bg-[var(--wd-danger)] text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                                                    {unreadCount > 99
                                                        ? "99+"
                                                        : unreadCount}
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                <footer className="border-t wd-border-subtle wd-bg-panel p-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="relative shrink-0">
                                <UserAvatar
                                    name={displayName}
                                    spriteStyle={showAvatarImage ? null : (spriteSheetDataUrl ? avatarSpriteStyles : defaultSpriteStyles)}
                                    image={showAvatarImage ? avatarUrl : null}
                                    className="ring-1 wd-border-subtle"
                                    onImageError={() => setIsAvatarLoadFailed(true)}
                                />
                                {typeof localBackendUserId === "number" && (
                                    <PresenceDot userId={localBackendUserId} size="xs" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold wd-text-primary">
                                    {displayName}
                                </p>
                                <StatusLabel />
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
                                                setIsUserSettingsModalOpen(
                                                    true,
                                                );
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
                                                setIsUserIdExpanded(
                                                    (current) => {
                                                        return !current;
                                                    },
                                                );
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
            </aside>
            <UserSettingsModal
                isOpen={isUserSettingsModalOpen}
                onClose={() => setIsUserSettingsModalOpen(false)}
            />
            <NewConversationModal
                isOpen={isNewConversationModalOpen}
                friends={friends}
                onClose={() => setIsNewConversationModalOpen(false)}
                onSelectFriend={onOpenDirectMessage}
            />
        </>
    );
}

export default DirectMessageSidebar;
