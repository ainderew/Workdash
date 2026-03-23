import React, { useEffect, useMemo, useState } from "react";
import { Hash, Lock, Search, X } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { WorkspaceMember } from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { getDisplayName } from "@/common/utils/displayName";
import useUserStore from "@/common/store/useStore";
import UserAvatar from "../UserAvatar";
import DeskModalShell from "./DeskModalShell";

type RoomCategoryOption = {
    id: string | null;
    name: string;
};

type ChannelVisibility = "PUBLIC" | "PRIVATE";

interface CreateRoomModalProps {
    isOpen: boolean;
    isSubmitting?: boolean;
    categoryOptions: RoomCategoryOption[];
    initialCategoryId: string | null;
    workspaceId: string | null;
    onClose: () => void;
    onSubmit: (
        name: string,
        categoryId: string | null,
        visibility: ChannelVisibility,
        memberIds: number[],
    ) => void;
}

const UNCATEGORIZED_KEY = "__workspace_default__";

function CreateRoomModal({
    isOpen,
    isSubmitting = false,
    categoryOptions,
    initialCategoryId,
    workspaceId,
    onClose,
    onSubmit,
}: CreateRoomModalProps) {
    const currentUserId = useUserStore((state) => state.backendUser?.id ?? null);
    const [name, setName] = useState("");
    const [categoryKey, setCategoryKey] = useState(UNCATEGORIZED_KEY);
    const [error, setError] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<ChannelVisibility>("PUBLIC");
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [memberQuery, setMemberQuery] = useState("");
    const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[] | null>(null);
    const [memberFetchError, setMemberFetchError] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setName("");
        setError(null);
        setMemberFetchError(false);
        setCategoryKey(initialCategoryId ?? UNCATEGORIZED_KEY);
        setVisibility("PUBLIC");
        setSelectedMemberIds([]);
        setMemberQuery("");
        setWorkspaceMembers(null);
    }, [initialCategoryId, isOpen, workspaceId]);

    useEffect(() => {
        if (!isOpen || !workspaceId || visibility !== "PRIVATE" || workspaceMembers !== null) return;
        let cancelled = false;
        const service = ChatV2Service.getInstance();
        service.listWorkspaceMembers(workspaceId).then((members) => {
            if (!cancelled) setWorkspaceMembers(members);
        }).catch(() => {
            if (!cancelled) setMemberFetchError(true);
        });
        return () => { cancelled = true; };
    }, [isOpen, workspaceId, visibility, workspaceMembers]);

    const selectedIdSet = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds]);

    const availableMembers = useMemo(() => {
        return (workspaceMembers ?? []).filter(
            (m) => m.userId !== currentUserId && !selectedIdSet.has(m.userId),
        );
    }, [workspaceMembers, currentUserId, selectedIdSet]);

    const filteredMembers = useMemo(() => {
        const query = memberQuery.trim().toLowerCase();
        if (!query) return availableMembers;
        return availableMembers.filter((m) =>
            getDisplayName(m.user, `User ${m.userId}`)
                .toLowerCase()
                .includes(query),
        );
    }, [availableMembers, memberQuery]);

    const selectedMembers = useMemo(() => {
        return (workspaceMembers ?? []).filter((m) => selectedIdSet.has(m.userId));
    }, [workspaceMembers, selectedIdSet]);

    const submit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Channel name is required.");
            return;
        }

        setError(null);
        onSubmit(
            trimmedName,
            categoryKey === UNCATEGORIZED_KEY ? null : categoryKey,
            visibility,
            selectedMemberIds,
        );
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Create Channel"
            subtitle="Text channels are where your team collaborates."
        >
            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="create-room-name"
                        className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary"
                    >
                        Channel Name
                    </label>
                    <input
                        id="create-room-name"
                        type="text"
                        value={name}
                        maxLength={64}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                submit();
                            }
                        }}
                        placeholder="e.g. design-updates"
                        autoFocus
                        className="mt-2 wd-input"
                    />
                </div>

                <div>
                    <label
                        htmlFor="create-room-category"
                        className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary"
                    >
                        Category
                    </label>
                    <select
                        id="create-room-category"
                        value={categoryKey}
                        onChange={(event) => setCategoryKey(event.target.value)}
                        className="mt-2 h-11 w-full rounded-md border wd-border-subtle wd-bg-app px-3 text-sm wd-text-primary outline-none transition-colors focus:border-[var(--wd-accent)]"
                    >
                        {categoryOptions.map((category) => (
                            <option
                                key={category.id ?? UNCATEGORIZED_KEY}
                                value={category.id ?? UNCATEGORIZED_KEY}
                            >
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <span className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary">
                        Channel Type
                    </span>
                    <div className="mt-2 flex gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-pressed={visibility === "PUBLIC"}
                                    onClick={() => { setVisibility("PUBLIC"); setSelectedMemberIds([]); }}
                                    className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                                        visibility === "PUBLIC"
                                            ? "border-[var(--wd-accent)] bg-[var(--wd-accent-soft)] wd-text-primary"
                                            : "wd-border-subtle wd-bg-app wd-text-secondary hover:bg-[var(--wd-surface-elevated)]"
                                    }`}
                                >
                                    <Hash size={16} />
                                    Public
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                All workspace members will be added automatically
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-pressed={visibility === "PRIVATE"}
                                    onClick={() => setVisibility("PRIVATE")}
                                    className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                                        visibility === "PRIVATE"
                                            ? "border-[var(--wd-accent)] bg-[var(--wd-accent-soft)] wd-text-primary"
                                            : "wd-border-subtle wd-bg-app wd-text-secondary hover:bg-[var(--wd-surface-elevated)]"
                                    }`}
                                >
                                    <Lock size={16} />
                                    Private
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                Only members you choose can access this channel
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {visibility === "PRIVATE" && (
                    <div>
                        <span className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary">
                            Members
                        </span>

                        {selectedMembers.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedMembers.map((member) => {
                                    const displayName = getDisplayName(member.user, `User ${member.userId}`);
                                    return (
                                        <span
                                            key={member.userId}
                                            className="inline-flex items-center gap-1 rounded-full border wd-border-subtle wd-bg-elevated px-2 py-0.5 text-xs wd-text-primary"
                                        >
                                            <UserAvatar
                                                name={displayName}
                                                image={member.user?.image}
                                                characterCustomization={member.user?.characterCustomization ?? null}
                                                size="xs"
                                            />
                                            {displayName}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedMemberIds((prev) =>
                                                        prev.filter((id) => id !== member.userId),
                                                    )
                                                }
                                                className="ml-0.5 rounded-full p-0.5 wd-text-muted transition-colors hover:wd-text-primary"
                                                aria-label={`Remove ${displayName}`}
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        <div className="relative mt-2">
                            <Search
                                size={14}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
                            />
                            <input
                                type="text"
                                value={memberQuery}
                                onChange={(e) => setMemberQuery(e.target.value)}
                                placeholder="Search members..."
                                className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-8 pr-2 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                            />
                        </div>

                        <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
                            {memberFetchError ? (
                                <p className="px-3 py-2 text-xs wd-text-danger">
                                    Could not load members. Please close and try again.
                                </p>
                            ) : filteredMembers.length === 0 ? (
                                <p className="px-3 py-2 text-xs wd-text-muted">
                                    {availableMembers.length === 0
                                        ? "No more members to add."
                                        : "No members found."}
                                </p>
                            ) : (
                                filteredMembers.map((member) => {
                                    const displayName = getDisplayName(member.user, `User ${member.userId}`);
                                    return (
                                        <button
                                            key={member.userId}
                                            type="button"
                                            aria-label={`Add ${displayName}`}
                                            onClick={() =>
                                                setSelectedMemberIds((prev) => [...prev, member.userId])
                                            }
                                            className="w-full px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-[var(--wd-surface-elevated)] flex items-center gap-3"
                                        >
                                            <UserAvatar
                                                name={displayName}
                                                image={member.user?.image}
                                                characterCustomization={member.user?.characterCustomization ?? null}
                                                size="sm"
                                            />
                                            <span className="truncate wd-text-primary">{displayName}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-xs wd-text-danger">{error}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="wd-btn-ghost"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={isSubmitting}
                        className="wd-btn-primary"
                    >
                        {isSubmitting ? "Creating..." : "Create Channel"}
                    </button>
                </div>
            </div>
        </DeskModalShell>
    );
}

export default CreateRoomModal;
