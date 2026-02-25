import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ChatV2Friend } from "@/communication/chatV2/_types";
import { getDisplayName } from "@/common/utils/displayName";
import { useCharacterFaceAvatar } from "@/common/utils/characterFaceAvatar";
import DeskModalShell from "./DeskModalShell";

interface NewConversationModalProps {
    isOpen: boolean;
    friends: ChatV2Friend[];
    onClose: () => void;
    onSelectFriend: (userId: number) => void;
}

function FriendRow({
    friend,
    onSelect,
}: {
    friend: ChatV2Friend;
    onSelect: (userId: number) => void;
}) {
    const name = getDisplayName(friend.peerUser, `User ${friend.peerUser.id}`);
    const faceDataUrl = useCharacterFaceAvatar(
        friend.peerUser.characterCustomization ?? null,
    );
    const imageUrl = friend.peerUser.image?.trim() || "";

    return (
        <button
            type="button"
            onClick={() => onSelect(friend.peerUser.id)}
            className="w-full px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-[var(--wd-surface-elevated)] flex items-center gap-3"
        >
            <div className="h-8 w-8 shrink-0 rounded-full wd-bg-elevated wd-text-secondary text-xs flex items-center justify-center font-semibold overflow-hidden border wd-border-subtle">
                {faceDataUrl ? (
                    <img
                        src={faceDataUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                        style={{ imageRendering: "pixelated" }}
                    />
                ) : imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span>{name.charAt(0).toUpperCase()}</span>
                )}
            </div>
            <span className="truncate wd-text-primary">{name}</span>
        </button>
    );
}

function NewConversationModal({
    isOpen,
    friends,
    onClose,
    onSelectFriend,
}: NewConversationModalProps) {
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        setQuery("");
    }, [isOpen]);

    const normalizedQuery = query.trim().toLowerCase();

    const filteredFriends = useMemo(() => {
        if (!normalizedQuery) return [];
        return friends.filter((entry) =>
            getDisplayName(entry.peerUser, `User ${entry.peerUser.id}`)
                .toLowerCase()
                .includes(normalizedQuery),
        );
    }, [friends, normalizedQuery]);

    const suggestedFriends = useMemo(() => friends.slice(0, 5), [friends]);

    const displayList = normalizedQuery ? filteredFriends : suggestedFriends;
    const sectionLabel = normalizedQuery ? "Results" : "Suggested";

    const handleSelect = (userId: number) => {
        onSelectFriend(userId);
        onClose();
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="New Conversation"
            subtitle="Search your friends to start a direct message."
        >
            <div className="space-y-4">
                <div className="relative">
                    <Search
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
                    />
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search friends..."
                        autoFocus
                        className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-8 pr-2 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                    />
                </div>

                <div>
                    <p className="px-1 pb-2 text-[11px] uppercase tracking-wide wd-text-muted">
                        {sectionLabel}
                    </p>
                    {displayList.length === 0 ? (
                        <p className="px-3 py-2 text-xs wd-text-muted">
                            {normalizedQuery
                                ? "No friends found."
                                : "No friends yet."}
                        </p>
                    ) : (
                        <div className="space-y-0.5 max-h-64 overflow-y-auto">
                            {displayList.map((entry) => (
                                <FriendRow
                                    key={entry.friendshipId}
                                    friend={entry}
                                    onSelect={handleSelect}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DeskModalShell>
    );
}

export default NewConversationModal;
