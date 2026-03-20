import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { WorkspaceMember } from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { getDisplayName } from "@/common/utils/displayName";
import UserAvatar from "../UserAvatar";
import DeskModalShell from "./DeskModalShell";

interface AddMemberModalProps {
    isOpen: boolean;
    workspaceId: string | null;
    workspaceMembers: WorkspaceMember[];
    existingMemberIds: Set<number>;
    onClose: () => void;
    onSubmit: (userId: number) => void;
}

function MemberRow({
    member,
    onSelect,
}: {
    member: WorkspaceMember;
    onSelect: (userId: number) => void;
}) {
    const name = getDisplayName(member.user, `User ${member.userId}`);

    return (
        <button
            type="button"
            onClick={() => onSelect(member.userId)}
            className="w-full px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-[var(--wd-surface-elevated)] flex items-center gap-3"
        >
            <UserAvatar
                name={name}
                image={member.user?.image}
                characterCustomization={
                    member.user?.characterCustomization ?? null
                }
                size="sm"
            />
            <span className="truncate wd-text-primary">{name}</span>
        </button>
    );
}

function AddMemberModal({
    isOpen,
    workspaceId,
    workspaceMembers,
    existingMemberIds,
    onClose,
    onSubmit,
}: AddMemberModalProps) {
    const [query, setQuery] = useState("");
    const [freshMembers, setFreshMembers] = useState<WorkspaceMember[] | null>(
        null,
    );

    useEffect(() => {
        if (!isOpen) {
            setFreshMembers(null);
            return;
        }
        setQuery("");

        if (!workspaceId) return;
        let cancelled = false;
        const service = ChatV2Service.getInstance();
        service.listWorkspaceMembers(workspaceId).then((members) => {
            if (!cancelled) setFreshMembers(members);
        }).catch(() => {
            // Fall back to parent's cached list
        });
        return () => { cancelled = true; };
    }, [isOpen, workspaceId]);

    const members = freshMembers ?? workspaceMembers;

    const availableMembers = useMemo(
        () => members.filter((m) => !existingMemberIds.has(m.userId)),
        [members, existingMemberIds],
    );

    const normalizedQuery = query.trim().toLowerCase();

    const filteredMembers = useMemo(() => {
        if (!normalizedQuery) return availableMembers;
        return availableMembers.filter((m) =>
            getDisplayName(m.user, `User ${m.userId}`)
                .toLowerCase()
                .includes(normalizedQuery),
        );
    }, [availableMembers, normalizedQuery]);

    const handleSelect = (userId: number) => {
        onSubmit(userId);
        onClose();
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Invite Member"
            subtitle="Search for a teammate by name to add them to this room."
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
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name..."
                        autoFocus
                        className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated pl-8 pr-2 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                    />
                </div>

                <div>
                    {availableMembers.length === 0 ? (
                        <p className="px-3 py-2 text-xs wd-text-muted">
                            All workspace members are already in this room.
                        </p>
                    ) : filteredMembers.length === 0 ? (
                        <p className="px-3 py-2 text-xs wd-text-muted">
                            No members found.
                        </p>
                    ) : (
                        <>
                            <p className="px-1 pb-2 text-[11px] uppercase tracking-wide wd-text-muted">
                                {normalizedQuery ? "Results" : "Members"}
                            </p>
                            <div className="space-y-0.5 max-h-64 overflow-y-auto">
                                {filteredMembers.map((member) => (
                                    <MemberRow
                                        key={member.userId}
                                        member={member}
                                        onSelect={handleSelect}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </DeskModalShell>
    );
}

export default AddMemberModal;
