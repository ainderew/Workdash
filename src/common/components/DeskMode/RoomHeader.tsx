import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
    ChatV2Room,
    ChatV2SearchUser,
} from "@/communication/chatV2/_types";
import { Hash, Search, UserRound, X } from "lucide-react";

interface RoomHeaderProps {
    room: ChatV2Room | null;
    serverName: string;
    rooms: ChatV2Room[];
    searchQuery: string;
    searchFromUser: ChatV2SearchUser | null;
    searchRoomId: string | null;
    showCloseButton?: boolean;
    onClose?: () => void;
    onSearchQueryChange: (value: string) => void;
    onSearchFromUserChange: (user: ChatV2SearchUser | null) => void;
    onSearchRoomIdChange: (roomId: string | null) => void;
    onSearchUsers: (query: string) => Promise<ChatV2SearchUser[]>;
    onClearSearch: () => void;
}

function RoomHeader({
    room,
    serverName,
    rooms,
    searchQuery,
    searchFromUser,
    searchRoomId,
    showCloseButton = false,
    onClose,
    onSearchQueryChange,
    onSearchFromUserChange,
    onSearchRoomIdChange,
    onSearchUsers,
    onClearSearch,
}: RoomHeaderProps) {
    const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<"from" | "room" | null>(null);
    const [userQuery, setUserQuery] = useState("");
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [userResults, setUserResults] = useState<ChatV2SearchUser[]>([]);
    const searchContainerRef = useRef<HTMLDivElement | null>(null);

    const selectedRoomName = useMemo(
        () => rooms.find((entry) => entry.id === searchRoomId)?.name || "",
        [rooms, searchRoomId],
    );

    const activeFilterCount = Number(!!searchFromUser) + Number(!!searchRoomId);
    const normalizedSearchQuery = searchQuery.trim();
    const searchLabel = normalizedSearchQuery.length > 0
        ? normalizedSearchQuery
        : "messages";

    useEffect(() => {
        const normalized = userQuery.trim();
        if (normalized.length === 0) {
            setUserResults([]);
            return;
        }

        let cancelled = false;
        const timeout = window.setTimeout(async () => {
            setIsSearchingUsers(true);
            try {
                const users = await onSearchUsers(normalized);
                if (!cancelled) {
                    setUserResults(users);
                }
            } catch {
                if (!cancelled) {
                    setUserResults([]);
                }
            } finally {
                if (!cancelled) {
                    setIsSearchingUsers(false);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [onSearchUsers, userQuery]);

    useEffect(() => {
        if (!isSearchMenuOpen) {
            return;
        }

        const handleOutsidePointerDown = (event: MouseEvent) => {
            if (!searchContainerRef.current) {
                return;
            }

            if (!searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchMenuOpen(false);
                setActiveFilter(null);
            }
        };

        window.addEventListener("mousedown", handleOutsidePointerDown);
        return () => {
            window.removeEventListener("mousedown", handleOutsidePointerDown);
        };
    }, [isSearchMenuOpen]);

    return (
        <header className="h-14 border-b wd-border-subtle px-5 flex items-center justify-between gap-4 wd-bg-panel-2 backdrop-blur">
            <div className="min-w-0">
                <div className="text-sm font-semibold wd-text-primary truncate">
                    {room ? `# ${room.name}` : "Select a room"}
                </div>
                <div className="text-xs wd-text-muted truncate">
                    {room?.topic || "Persistent room chat"}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <div
                    className="flex items-center gap-2 shrink-0 relative"
                    ref={searchContainerRef}
                >
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 wd-text-muted"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => onSearchQueryChange(event.target.value)}
                            onFocus={() => setIsSearchMenuOpen(true)}
                            placeholder={`Search ${serverName}`}
                            className="h-8 w-[286px] rounded-lg border wd-border-subtle wd-bg-elevated pl-9 pr-8 text-[0.85rem] placeholder:text-[0.8rem] wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                        />
                        {searchQuery.trim().length > 0 && (
                            <button
                                type="button"
                                onClick={() => onSearchQueryChange("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                                aria-label="Clear search query"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {isSearchMenuOpen && (
                        <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[360px] rounded-xl border wd-border-strong wd-bg-panel text-[0.85rem] shadow-[0_20px_40px_rgba(0,0,0,0.45)] overflow-hidden">
                            <div className="px-4 py-3 border-b wd-border-subtle flex items-center gap-3">
                                <Search size={20} className="wd-text-muted shrink-0" />
                                <p className="text-[0.85rem] wd-text-primary leading-tight">
                                    Search for <span className="font-semibold">&apos;{searchLabel}&apos;</span>
                                </p>
                            </div>

                            <div className="px-4 py-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-[0.85rem] font-semibold wd-text-primary">
                                        Filters
                                    </p>
                                    {activeFilterCount > 0 || normalizedSearchQuery.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClearSearch();
                                                setUserQuery("");
                                                setUserResults([]);
                                                setActiveFilter(null);
                                            }}
                                            className="text-[0.85rem] wd-text-secondary transition-colors hover:wd-text-primary"
                                        >
                                            Clear all
                                        </button>
                                    ) : null}
                                </div>

                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setActiveFilter((current) =>
                                                current === "from" ? null : "from",
                                            )
                                        }
                                        className={`w-full rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                                            activeFilter === "from"
                                                ? "wd-bg-elevated border wd-border-subtle"
                                                : "hover:bg-[var(--wd-surface-elevated)]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserRound size={18} className="wd-text-muted shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[0.85rem] font-medium wd-text-primary">
                                                    From a specific user
                                                </p>
                                                <p className="text-[0.85rem] wd-text-muted truncate">
                                                    from:{" "}
                                                    {searchFromUser
                                                        ? searchFromUser.name || `User ${searchFromUser.id}`
                                                        : "user"}
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setActiveFilter((current) =>
                                                current === "room" ? null : "room",
                                            )
                                        }
                                        className={`w-full rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                                            activeFilter === "room"
                                                ? "wd-bg-elevated border wd-border-subtle"
                                                : "hover:bg-[var(--wd-surface-elevated)]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Hash size={18} className="wd-text-muted shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[0.85rem] font-medium wd-text-primary">
                                                    Sent in a specific channel
                                                </p>
                                                <p className="text-[0.85rem] wd-text-muted truncate">
                                                    in: {selectedRoomName ? `#${selectedRoomName}` : "channel"}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="px-4 py-3">
                                {activeFilter === "from" ? (
                                    <div>
                                        {searchFromUser ? (
                                            <div className="flex items-center justify-between rounded-md wd-bg-elevated border wd-border-subtle px-3 py-2 mb-2">
                                                <p className="text-[0.85rem] wd-text-primary truncate">
                                                    {searchFromUser.name || `User ${searchFromUser.id}`}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => onSearchFromUserChange(null)}
                                                    className="h-6 w-6 rounded inline-flex items-center justify-center wd-text-muted hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)]"
                                                    aria-label="Clear from filter"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        ) : null}

                                        <input
                                            type="text"
                                            value={userQuery}
                                            onChange={(event) => setUserQuery(event.target.value)}
                                            placeholder="Search user..."
                                            className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-[0.85rem] wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                                        />

                                        {userQuery.trim().length > 0 && (
                                            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border wd-border-subtle wd-bg-elevated">
                                                {isSearchingUsers ? (
                                                    <div className="px-3 py-2 text-[0.85rem] wd-text-muted">
                                                        Searching users...
                                                    </div>
                                                ) : userResults.length === 0 ? (
                                                    <div className="px-3 py-2 text-[0.85rem] wd-text-muted">
                                                        No users found.
                                                    </div>
                                                ) : (
                                                    userResults.map((userResult) => (
                                                        <button
                                                            key={userResult.id}
                                                            type="button"
                                                            onClick={() => {
                                                                onSearchFromUserChange(userResult);
                                                                setUserQuery("");
                                                                setUserResults([]);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-[0.85rem] wd-text-primary transition-colors hover:bg-[var(--wd-surface-base)]"
                                                        >
                                                            {userResult.name || `User ${userResult.id}`}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {activeFilter === "room" ? (
                                    <div>
                                        <select
                                            value={searchRoomId || ""}
                                            onChange={(event) => {
                                                const nextRoomId = event.target.value.trim();
                                                onSearchRoomIdChange(nextRoomId || null);
                                            }}
                                            className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-[0.85rem] wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                                        >
                                            <option value="">All rooms</option>
                                            {rooms.map((entry) => (
                                                <option key={entry.id} value={entry.id}>
                                                    {entry.name}
                                                </option>
                                            ))}
                                        </select>
                                        {selectedRoomName && (
                                            <p className="mt-2 text-[0.85rem] wd-text-muted truncate">
                                                Selected: #{selectedRoomName}
                                            </p>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
                
                {showCloseButton && onClose ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-base)]"
                        aria-label="Close chat"
                    >
                        <X size={16} />
                    </button>
                ) : null}
            </div>
        </header>
    );
}

export default RoomHeader;
