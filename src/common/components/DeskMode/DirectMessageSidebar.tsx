import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    PanelLeftClose,
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
    onCollapseSidebar?: () => void;
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
    onCollapseSidebar,
}: DirectMessageSidebarProps) {
    const setInteractionMode = useUiStore((state) => state.setInteractionMode);
    const user = useUserStore((state) => state.user);
    const backendUser = useUserStore((s) => s.backendUser);
    const unreadByRoomId = useChatV2Store((state) => state.unreadByRoomId);
    const [query, setQuery] = useState("");
    const [isAvatarLoadFailed, setIsAvatarLoadFailed] = useState(false);
    const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] =
        useState(false);
    const [isNewConversationModalOpen, setIsNewConversationModalOpen] =
        useState(false);

    const displayName = getDisplayName(
        {
            nickname:
                user.nickname ?? backendUser?.nickname ?? null,
            name: user.name || backendUser?.name || null,
        },
        "You",
    );
    const localBackendUserId = backendUser?.id;
    const spriteSheetDataUrl = user.spriteSheetDataUrl?.trim() || "";
    const avatarUrl = user.image?.trim() || backendUser?.image?.trim() || "";
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

    const recentFriends = useMemo(() => {
        return [...friends]
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            )
            .slice(0, 4);
    }, [friends]);

    return (
        <>
            <aside className="w-80 h-full wd-bg-panel border-r wd-border-subtle flex flex-col min-h-0">
                <div className="px-4 h-14 border-b wd-border-subtle flex items-center justify-between gap-2">
                    <p className="text-base font-semibold wd-text-primary">
                        Direct Messages
                    </p>
                    {onCollapseSidebar && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={onCollapseSidebar}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary"
                                    aria-label="Collapse sidebar"
                                >
                                    <PanelLeftClose size={16} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                Collapse sidebar
                            </TooltipContent>
                        </Tooltip>
                    )}
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
                    {normalizedQuery.length === 0 && (
                        <section>
                            <div className="flex items-center justify-between px-1 pb-2">
                                <p className="text-[11px] uppercase tracking-wide wd-text-muted">
                                    Friends
                                </p>
                                {recentFriends.length > 0 && (
                                    <span className="text-[10px] tabular-nums wd-text-muted">
                                        {friends.length}
                                    </span>
                                )}
                            </div>

                            {isLoadingFriends ? (
                                <div className="space-y-1">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 rounded-md px-2 py-1.5"
                                        >
                                            <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--wd-surface-elevated)] animate-pulse" />
                                            <div className="h-3.5 flex-1 rounded bg-[var(--wd-surface-elevated)] animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            ) : recentFriends.length === 0 ? (
                                <p className="px-2 py-3 text-xs wd-text-muted">
                                    Add friends to get started
                                </p>
                            ) : (
                                <div className="space-y-0.5">
                                    {recentFriends.map((entry) => {
                                        const name = getPeerDisplayName(entry.peerUser);
                                        return (
                                            <button
                                                key={entry.friendshipId}
                                                type="button"
                                                onClick={() =>
                                                    onOpenDirectMessage(entry.peerUser.id)
                                                }
                                                className="group flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
                                            >
                                                <div className="relative shrink-0">
                                                    <UserAvatar
                                                        name={name}
                                                        image={entry.peerUser.image}
                                                        characterCustomization={
                                                            entry.peerUser
                                                                .characterCustomization
                                                        }
                                                        size="sm"
                                                    />
                                                    <PresenceDot
                                                        userId={entry.peerUser.id}
                                                        size="xs"
                                                    />
                                                </div>
                                                <span className="truncate flex-1">
                                                    {name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

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
                                title="Settings"
                                aria-label="Settings"
                                onClick={() => setIsUserSettingsModalOpen(true)}
                                className="relative h-7 w-7 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:bg-[var(--wd-surface-base)] hover:wd-text-primary"
                            >
                                <Settings size={15} />
                            </button>
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
