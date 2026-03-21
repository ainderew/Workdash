import React from "react";
import type {
    ChatV2RoomMember,
    WorkspaceMember,
    WorkspaceRole,
} from "@/communication/chatV2/_types";
import AddMemberModal from "./modals/AddMemberModal";
import { getDisplayName } from "@/common/utils/displayName";
import { Search, UserRoundX } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import UserAvatar from "./UserAvatar";
import PresenceDot from "./PresenceDot";
import { ActivityText } from "./ActivityText";
import useChatV2Store from "@/common/store/chatV2Store";
import { usePresenceStore } from "@/common/store/presenceStore";
import { colorToHex } from "@/common/utils/roleColor";

type RoleGroup = {
    role: WorkspaceRole;
    members: ChatV2RoomMember[];
};

interface MemberPanelProps {
    members: ChatV2RoomMember[];
    memberRoleColors?: Map<number, string>;
    isLoading: boolean;
    workspaceMembers: WorkspaceMember[];
    onAddMember: (userId: number) => void;
    onRemoveMember: (userId: number) => void;
}

function getTopHoistedRole(
    userId: number,
    wsMemberMap: Map<number, WorkspaceMember>,
): WorkspaceRole | null {
    const wsMember = wsMemberMap.get(userId);
    if (!wsMember?.roles?.length) return null;
    const hoisted = wsMember.roles
        .filter((r) => !r.isEveryone && r.isHoisted)
        .sort((a, b) => b.position - a.position);
    return hoisted[0] ?? null;
}

function MemberPanel({
    members,
    memberRoleColors,
    isLoading,
    workspaceMembers,
    onAddMember,
    onRemoveMember,
}: MemberPanelProps) {
    const selectedWorkspaceId = useChatV2Store(
        (s) => s.selectedWorkspaceId,
    );
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] =
        React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const presenceMap = usePresenceStore((s) => s.presenceMap);
    const [isOfflineCollapsed, setIsOfflineCollapsed] = React.useState(false);

    const existingMemberIds = React.useMemo(
        () => new Set(members.map((m) => m.userId)),
        [members],
    );

    const wsMemberMap = React.useMemo(() => {
        const map = new Map<number, WorkspaceMember>();
        for (const wm of workspaceMembers) {
            map.set(wm.userId, wm);
        }
        return map;
    }, [workspaceMembers]);

    const filteredMembers = React.useMemo(() => {
        if (!searchQuery.trim()) return members;
        const query = searchQuery.toLowerCase();
        return members.filter((m) =>
            getDisplayName(m.user, "").toLowerCase().includes(query),
        );
    }, [members, searchQuery]);

    const { onlineRoleGroups, onlineUngrouped, offlineMembers, offlineCount } =
        React.useMemo(() => {
            const roleGroupMap = new Map<string, RoleGroup>();
            const ungrouped: ChatV2RoomMember[] = [];
            const offline: ChatV2RoomMember[] = [];
            let count = 0;

            for (const member of filteredMembers) {
                const presence = presenceMap[member.userId];
                const isOffline =
                    !presence || presence.statusId === "offline";

                if (isOffline) {
                    offline.push(member);
                    count++;
                    continue;
                }

                const topRole = getTopHoistedRole(member.userId, wsMemberMap);
                if (!topRole) {
                    ungrouped.push(member);
                    continue;
                }

                const existing = roleGroupMap.get(topRole.id);
                if (existing) {
                    existing.members.push(member);
                } else {
                    roleGroupMap.set(topRole.id, {
                        role: topRole,
                        members: [member],
                    });
                }
            }

            const sorted = Array.from(roleGroupMap.values()).sort(
                (a, b) => b.role.position - a.role.position,
            );

            return {
                onlineRoleGroups: sorted,
                onlineUngrouped: ungrouped,
                offlineMembers: offline,
                offlineCount: count,
            };
        }, [filteredMembers, presenceMap, wsMemberMap]);

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
                            {onlineRoleGroups.map(({ role, members: roleMembers }) => (
                                <div key={role.id}>
                                    <h4
                                        className="text-[11px] uppercase tracking-wider font-semibold px-2 mb-1"
                                        style={
                                            role.color
                                                ? { color: colorToHex(role.color) }
                                                : undefined
                                        }
                                    >
                                        {role.name} &mdash;{" "}
                                        {roleMembers.length}
                                    </h4>
                                    <div>
                                        {roleMembers.map((member) => (
                                            <MemberRow
                                                key={`${member.roomId}-${member.userId}`}
                                                member={member}
                                                nameColor={memberRoleColors?.get(member.userId)}
                                                onRemove={() =>
                                                    onRemoveMember(
                                                        member.userId,
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {onlineUngrouped.length > 0 && (
                                <div>
                                    <h4 className="text-[11px] uppercase tracking-wider wd-text-muted font-semibold px-2 mb-1">
                                        Members &mdash;{" "}
                                        {onlineUngrouped.length}
                                    </h4>
                                    <div>
                                        {onlineUngrouped.map((member) => (
                                            <MemberRow
                                                key={`${member.roomId}-${member.userId}`}
                                                member={member}
                                                nameColor={memberRoleColors?.get(member.userId)}
                                                onRemove={() =>
                                                    onRemoveMember(
                                                        member.userId,
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {offlineCount > 0 && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsOfflineCollapsed(
                                                (prev) => !prev,
                                            )
                                        }
                                        className="flex items-center gap-1 text-[11px] uppercase tracking-wider wd-text-muted font-semibold px-2 mb-1 hover:text-[var(--wd-text-secondary)] transition-colors w-full text-left"
                                    >
                                        <span
                                            className={`text-[8px] transition-transform ${isOfflineCollapsed ? "-rotate-90" : ""}`}
                                        >
                                            &#9662;
                                        </span>
                                        <span>
                                            Offline &mdash; {offlineCount}
                                        </span>
                                    </button>
                                    {!isOfflineCollapsed && (
                                        <div>
                                            {offlineMembers.map((member) => (
                                                <MemberRow
                                                    key={`${member.roomId}-${member.userId}`}
                                                    member={member}
                                                    nameColor={memberRoleColors?.get(member.userId)}
                                                    onRemove={() =>
                                                        onRemoveMember(
                                                            member.userId,
                                                        )
                                                    }
                                                    isOffline
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            <AddMemberModal
                isOpen={isAddMemberModalOpen}
                workspaceId={selectedWorkspaceId}
                workspaceMembers={workspaceMembers}
                existingMemberIds={existingMemberIds}
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
    nameColor,
    onRemove,
    isOffline = false,
}: {
    member: ChatV2RoomMember;
    nameColor?: string;
    onRemove: () => void;
    isOffline?: boolean;
}) {
    const displayName = getDisplayName(member.user, `User ${member.userId}`);
    const selectedWorkspaceId = useChatV2Store(
        (s) => s.selectedWorkspaceId,
    );

    return (
        <div className={`group flex items-start gap-4 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors ${isOffline ? "opacity-50" : ""}`}>
            <div className="relative shrink-0 mt-0.5">
                <UserAvatar
                    name={displayName}
                    image={member.user.image}
                    characterCustomization={
                        member.user.characterCustomization ?? null
                    }
                    size="xs"
                />
                <PresenceDot userId={member.userId} size="xs" />
            </div>
            <div className="flex-1 min-w-0">
                <span
                    className={`text-sm truncate block transition-colors ${nameColor ? "font-medium" : "wd-text-secondary group-hover:wd-text-primary"}`}
                    style={nameColor ? { color: nameColor } : undefined}
                >
                    {displayName}
                </span>
                <ActivityText
                    userId={member.userId}
                    workspaceId={selectedWorkspaceId}
                />
            </div>
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
