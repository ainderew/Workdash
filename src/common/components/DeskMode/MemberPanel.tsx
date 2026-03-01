import React from "react";
import type { ChatV2RoomMember } from "@/communication/chatV2/_types";
import AddMemberModal from "./modals/AddMemberModal";
import { getDisplayName } from "@/common/utils/displayName";
import { Search, UserRoundX } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import UserAvatar from "./UserAvatar";

const ROLE_ORDER: ChatV2RoomMember["role"][] = [
    "OWNER",
    "ADMIN",
    "MODERATOR",
    "MEMBER",
    "READ_ONLY",
];

const ROLE_LABELS: Record<ChatV2RoomMember["role"], string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    MODERATOR: "Moderator",
    MEMBER: "Member",
    READ_ONLY: "Read Only",
};

interface MemberPanelProps {
    members: ChatV2RoomMember[];
    isLoading: boolean;
    onAddMember: (userId: number) => void;
    onRemoveMember: (userId: number) => void;
}

function MemberPanel({
    members,
    isLoading,
    onAddMember,
    onRemoveMember,
}: MemberPanelProps) {
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] =
        React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const filteredMembers = React.useMemo(() => {
        if (!searchQuery.trim()) return members;
        const query = searchQuery.toLowerCase();
        return members.filter((m) =>
            getDisplayName(m.user, "").toLowerCase().includes(query),
        );
    }, [members, searchQuery]);

    const groupedMembers = React.useMemo(() => {
        const groups = new Map<ChatV2RoomMember["role"], ChatV2RoomMember[]>();
        for (const member of filteredMembers) {
            const existing = groups.get(member.role) ?? [];
            existing.push(member);
            groups.set(member.role, existing);
        }
        return groups;
    }, [filteredMembers]);

    return (
        <>
            <aside className="w-70 wd-bg-panel border-l wd-border-subtle hidden xl:flex xl:flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-2">
                    <h3 className="text-xs uppercase tracking-wider wd-text-muted font-semibold">
                        Members
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsAddMemberModalOpen(true)}
                        disabled={isLoading}
                        className="text-[10px] px-2 py-1 rounded wd-bg-accent-soft wd-text-accent hover:bg-[var(--wd-accent)]/25 disabled:opacity-50"
                    >
                        + Add
                    </button>
                </div>

                <div className="px-3 pb-2">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search members"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 text-xs rounded-md wd-bg-elevated border wd-border-subtle wd-text-primary placeholder:wd-text-muted focus:outline-none focus:ring-1 focus:ring-[var(--wd-accent)]/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    {isLoading ? (
                        <div className="text-xs wd-text-muted px-2">
                            Loading members...
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-xs wd-text-muted px-2">
                            No active members.
                        </div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="text-xs wd-text-muted px-2">
                            No members found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {ROLE_ORDER.map((role) => {
                                const roleMembers = groupedMembers.get(role);
                                if (!roleMembers || roleMembers.length === 0)
                                    return null;

                                return (
                                    <div key={role}>
                                        <h4 className="text-[11px] uppercase tracking-wider wd-text-muted font-semibold px-2 mb-1">
                                            {ROLE_LABELS[role]} &mdash;{" "}
                                            {roleMembers.length}
                                        </h4>
                                        <div>
                                            {roleMembers.map((member) => (
                                                <MemberRow
                                                    key={`${member.roomId}-${member.userId}`}
                                                    member={member}
                                                    onRemove={() =>
                                                        onRemoveMember(
                                                            member.userId,
                                                        )
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>

            <AddMemberModal
                isOpen={isAddMemberModalOpen}
                isSubmitting={isLoading}
                onClose={() => setIsAddMemberModalOpen(false)}
                onSubmit={(userId) => {
                    onAddMember(userId);
                    setIsAddMemberModalOpen(false);
                }}
            />
        </>
    );
}

function MemberRow({
    member,
    onRemove,
}: {
    member: ChatV2RoomMember;
    onRemove: () => void;
}) {
    const displayName = getDisplayName(member.user, `User ${member.userId}`);

    return (
        <div className="group flex items-center gap-4 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors">
            <div className="relative shrink-0">
                <UserAvatar
                    name={displayName}
                    image={member.user.image}
                    characterCustomization={
                        member.user.characterCustomization ?? null
                    }
                    size="xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-[var(--wd-bg-panel)] bg-emerald-500" />
            </div>
            <span className="text-sm wd-text-secondary truncate flex-1 group-hover:wd-text-primary transition-colors items-center">
                {displayName}
            </span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label="Remove member"
                        className="hidden group-hover:inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-red-400/70 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                        onClick={onRemove}
                    >
                        <UserRoundX size={13} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <span>Remove member</span>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export default MemberPanel;
