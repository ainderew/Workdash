import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Copy,
    Ellipsis,
    Link,
    Loader2,
    RefreshCw,
    Search,
    Users,
    X,
} from "lucide-react";
import type {
    WorkspaceInvite,
    WorkspaceMember,
    WorkspaceRole,
} from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { getDisplayName } from "@/common/utils/displayName";
import UserAvatar from "../UserAvatar";
import WorkspaceMemberContextMenu from "../WorkspaceMemberContextMenu";

function colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

// ================================================================
// Types
// ================================================================

type MemberContextMenuState = {
    member: WorkspaceMember;
    x: number;
    y: number;
};

interface WorkspaceMembersModalProps {
    isOpen: boolean;
    workspaceId: string | null;
    workspaceName: string;
    workspaceOwnerId: number;
    viewerUserId: number;
    viewerCanManageMembers: boolean;
    viewerCanBanMembers: boolean;
    viewerCanManageRoles: boolean;
    viewerCanCreateInvite: boolean;
    onClose: () => void;
    onViewProfile?: (userId: number) => void;
    onLeaveWorkspace?: () => void;
    initialTab?: "members" | "invites";
}

// ================================================================
// Members Tab
// ================================================================

function WorkspaceMembersTab({
    members,
    roles,
    isLoading,
    workspaceOwnerId,
    viewerUserId,
    viewerCanManageMembers,
    viewerCanBanMembers,
    viewerCanManageRoles,
    onContextMenu,
    onRefresh,
}: {
    members: WorkspaceMember[];
    roles: WorkspaceRole[];
    isLoading: boolean;
    workspaceOwnerId: number;
    viewerUserId: number;
    viewerCanManageMembers: boolean;
    viewerCanBanMembers: boolean;
    viewerCanManageRoles: boolean;
    onContextMenu: (member: WorkspaceMember, x: number, y: number) => void;
    onRefresh: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members;
        const q = searchQuery.toLowerCase();
        return members.filter((m) =>
            getDisplayName(m.user, "").toLowerCase().includes(q),
        );
    }, [members, searchQuery]);

    const nonEveryoneRoles = useMemo(
        () =>
            roles
                .filter((r) => !r.isEveryone)
                .sort((a, b) => b.position - a.position),
        [roles],
    );

    const roleGroups = useMemo(() => {
        const groups: { role: WorkspaceRole | null; members: WorkspaceMember[] }[] = [];
        const ungrouped: WorkspaceMember[] = [];

        const membersByRole = new Map<string, WorkspaceMember[]>();

        for (const m of filteredMembers) {
            const topRole = m.roles
                ?.filter((r) => !r.isEveryone)
                .sort((a, b) => b.position - a.position)[0];
            if (topRole) {
                const arr = membersByRole.get(topRole.id) ?? [];
                arr.push(m);
                membersByRole.set(topRole.id, arr);
            } else {
                ungrouped.push(m);
            }
        }

        for (const role of nonEveryoneRoles) {
            const ms = membersByRole.get(role.id);
            if (ms && ms.length > 0) {
                groups.push({ role, members: ms });
            }
        }

        if (ungrouped.length > 0) {
            groups.push({ role: null, members: ungrouped });
        }

        return groups;
    }, [filteredMembers, nonEveryoneRoles]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin wd-text-muted" />
            </div>
        );
    }

    const canManage = viewerCanManageMembers || viewerCanBanMembers || viewerCanManageRoles;

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                    <Search
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 text-xs rounded-md wd-bg-elevated border border-[var(--wd-border-subtle)] wd-text-primary placeholder:wd-text-muted focus:outline-none focus:ring-1 focus:ring-[var(--wd-accent)]/50"
                    />
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    aria-label="Refresh members"
                    className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] transition-colors"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            <p className="text-[11px] uppercase tracking-wider wd-text-muted font-semibold mb-2">
                {filteredMembers.length} Member{filteredMembers.length !== 1 ? "s" : ""}
            </p>

            {filteredMembers.length === 0 && searchQuery.trim() ? (
                <p className="text-sm wd-text-muted text-center py-4">
                    No members match &quot;{searchQuery}&quot;.
                </p>
            ) : (
                roleGroups.map((group) => (
                    <div key={group.role?.id ?? "__members__"}>
                        <div className="flex items-center gap-1.5 px-1 mb-1 mt-3 first:mt-0">
                            {group.role && (
                                <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{
                                        backgroundColor: group.role.color
                                            ? colorToHex(group.role.color)
                                            : "#99aab5",
                                    }}
                                />
                            )}
                            <span className="text-[11px] uppercase tracking-wider wd-text-muted font-semibold">
                                {group.role?.name ?? "Members"} &mdash; {group.members.length}
                            </span>
                        </div>
                        {group.members.map((member) => (
                            <WorkspaceMemberRow
                                key={member.userId}
                                member={member}
                                isViewer={member.userId === viewerUserId}
                                isOwner={member.userId === workspaceOwnerId}
                                canManage={canManage}
                                onContextMenu={onContextMenu}
                            />
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}

// ================================================================
// Member Row
// ================================================================

function WorkspaceMemberRow({
    member,
    isViewer,
    isOwner,
    canManage,
    onContextMenu,
}: {
    member: WorkspaceMember;
    isViewer: boolean;
    isOwner: boolean;
    canManage: boolean;
    onContextMenu: (member: WorkspaceMember, x: number, y: number) => void;
}) {
    const displayName = getDisplayName(member.user, `User ${member.userId}`);
    const topRole = member.roles
        ?.filter((r) => !r.isEveryone)
        .sort((a, b) => b.position - a.position)[0];

    const handleCtxMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu(member, e.clientX, e.clientY);
    };

    const handleEllipsisClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        onContextMenu(member, rect.right, rect.top);
    };

    return (
        <div
            className="group flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-default"
            onContextMenu={handleCtxMenu}
        >
            <div className="relative shrink-0">
                <UserAvatar
                    name={displayName}
                    image={member.user?.image}
                    characterCustomization={member.user?.characterCustomization ?? null}
                    size="xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-[var(--wd-surface-panel)] bg-[var(--wd-surface-elevated)]" />
            </div>

            <div className="flex-1 min-w-0">
                <span className="text-sm wd-text-secondary truncate group-hover:wd-text-primary transition-colors block">
                    {displayName}
                    {isOwner && (
                        <span className="ml-1.5 text-[10px] wd-text-muted">(Owner)</span>
                    )}
                </span>
                {topRole && (
                    <span className="inline-flex items-center gap-1 mt-0.5">
                        <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{
                                backgroundColor: topRole.color
                                    ? colorToHex(topRole.color)
                                    : "#99aab5",
                            }}
                        />
                        <span className="text-[11px] wd-text-muted truncate">
                            {topRole.name}
                        </span>
                    </span>
                )}
            </div>

            {(canManage || isViewer) && (
                <button
                    type="button"
                    aria-label="Member options"
                    onClick={handleEllipsisClick}
                    className="hidden group-hover:inline-flex h-6 w-6 shrink-0 items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] transition-colors"
                >
                    <Ellipsis size={14} />
                </button>
            )}
        </div>
    );
}

// ================================================================
// Invites Tab
// ================================================================

function WorkspaceInvitesTab({
    workspaceId,
    viewerCanCreateInvite,
}: {
    workspaceId: string;
    viewerCanCreateInvite: boolean;
}) {
    const [isCreating, setIsCreating] = useState(false);
    const [latestInvite, setLatestInvite] = useState<WorkspaceInvite | null>(null);
    const [expiresInHours, setExpiresInHours] = useState<string>("");
    const [maxUses, setMaxUses] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreateInvite = async () => {
        setIsCreating(true);
        setError(null);
        try {
            const service = ChatV2Service.getInstance();
            const input: {
                workspaceId: string;
                maxUses?: number;
                expiresInHours?: number;
            } = { workspaceId };
            if (expiresInHours) input.expiresInHours = Number(expiresInHours);
            if (maxUses) input.maxUses = Number(maxUses);

            const invite = await service.createWorkspaceInvite(input);
            setLatestInvite(invite);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create invite");
        } finally {
            setIsCreating(false);
        }
    };

    const inviteUrl = latestInvite
        ? `${window.location.origin}/app?mode=desk&invite=${latestInvite.code}`
        : "";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback: select text
        }
    };

    if (!viewerCanCreateInvite) {
        return (
            <div className="text-center py-8">
                <Link size={24} className="wd-text-muted mx-auto mb-2 opacity-40" />
                <p className="text-sm wd-text-muted">
                    You don&apos;t have permission to create invites.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel-2)] p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                Create Invite Link
            </p>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[11px] wd-text-muted block mb-1">
                        Expires after
                    </label>
                    <select
                        value={expiresInHours}
                        onChange={(e) => setExpiresInHours(e.target.value)}
                        className="h-8 w-full rounded-md border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-elevated)] px-2 text-xs wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                    >
                        <option value="">Never</option>
                        <option value="1">1 hour</option>
                        <option value="6">6 hours</option>
                        <option value="24">24 hours</option>
                        <option value="168">7 days</option>
                        <option value="720">30 days</option>
                    </select>
                </div>
                <div>
                    <label className="text-[11px] wd-text-muted block mb-1">
                        Max uses
                    </label>
                    <select
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        className="h-8 w-full rounded-md border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-elevated)] px-2 text-xs wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
                    >
                        <option value="">Unlimited</option>
                        <option value="1">1 use</option>
                        <option value="5">5 uses</option>
                        <option value="10">10 uses</option>
                        <option value="25">25 uses</option>
                        <option value="50">50 uses</option>
                        <option value="100">100 uses</option>
                    </select>
                </div>
            </div>

            <button
                type="button"
                disabled={isCreating}
                className="wd-btn-primary w-full h-9 text-sm"
                onClick={handleCreateInvite}
            >
                {isCreating ? (
                    <span className="inline-flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Generating...
                    </span>
                ) : (
                    "Generate Invite Link"
                )}
            </button>

            {latestInvite && (
                <div className="flex items-center gap-2 rounded-md border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-elevated)] px-3 py-2">
                    <span className="flex-1 text-xs wd-text-primary font-mono truncate">
                        {inviteUrl}
                    </span>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-base)] transition-colors"
                        aria-label="Copy invite link"
                    >
                        <Copy size={13} className={copied ? "wd-text-success" : ""} />
                    </button>
                </div>
            )}

            {error && (
                <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}

// ================================================================
// Main Modal
// ================================================================

function WorkspaceMembersModal({
    isOpen,
    workspaceId,
    workspaceName,
    workspaceOwnerId,
    viewerUserId,
    viewerCanManageMembers,
    viewerCanBanMembers,
    viewerCanManageRoles,
    viewerCanCreateInvite,
    onClose,
    onViewProfile,
    onLeaveWorkspace,
    initialTab = "members",
}: WorkspaceMembersModalProps) {
    const [activeTab, setActiveTab] = useState<"members" | "invites">(initialTab);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [roles, setRoles] = useState<WorkspaceRole[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [contextMenu, setContextMenu] = useState<MemberContextMenuState | null>(null);
    const [error, setError] = useState<string | null>(null);

    const service = useMemo(() => ChatV2Service.getInstance(), []);

    const loadMembers = useCallback(async () => {
        if (!workspaceId) return;
        setIsLoadingMembers(true);
        setError(null);
        try {
            const [fetchedMembers, fetchedRoles] = await Promise.all([
                service.listWorkspaceMembers(workspaceId),
                service.listWorkspaceRoles(workspaceId),
            ]);
            setMembers(fetchedMembers);
            setRoles(fetchedRoles);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load members");
        } finally {
            setIsLoadingMembers(false);
        }
    }, [workspaceId, service]);

    useEffect(() => {
        if (isOpen && workspaceId) {
            setActiveTab(initialTab);
            loadMembers();
        } else {
            setMembers([]);
            setRoles([]);
            setContextMenu(null);
            setError(null);
        }
    }, [isOpen, workspaceId, initialTab, loadMembers]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !contextMenu) onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, contextMenu, onClose]);

    const handleKick = useCallback(
        async (userId: number) => {
            if (!workspaceId) return;
            const prev = members;
            setMembers((ms) => ms.filter((m) => m.userId !== userId));
            setContextMenu(null);
            try {
                await service.kickWorkspaceMember(workspaceId, userId);
            } catch {
                setMembers(prev);
            }
        },
        [workspaceId, members, service],
    );

    const handleBan = useCallback(
        async (userId: number, reason?: string) => {
            if (!workspaceId) return;
            const prev = members;
            setMembers((ms) => ms.filter((m) => m.userId !== userId));
            setContextMenu(null);
            try {
                await service.banWorkspaceMember(workspaceId, userId, reason);
            } catch {
                setMembers(prev);
            }
        },
        [workspaceId, members, service],
    );

    const handleAssignRole = useCallback(
        async (userId: number, roleId: string) => {
            if (!workspaceId) return;
            const role = roles.find((r) => r.id === roleId);
            if (!role) return;
            setMembers((ms) =>
                ms.map((m) => {
                    if (m.userId !== userId) return m;
                    return { ...m, roles: [...(m.roles ?? []), role] };
                }),
            );
            try {
                await service.assignWorkspaceRole(workspaceId, userId, roleId);
            } catch {
                await loadMembers();
            }
        },
        [workspaceId, roles, service, loadMembers],
    );

    const handleRemoveRole = useCallback(
        async (userId: number, roleId: string) => {
            if (!workspaceId) return;
            setMembers((ms) =>
                ms.map((m) => {
                    if (m.userId !== userId) return m;
                    return { ...m, roles: (m.roles ?? []).filter((r) => r.id !== roleId) };
                }),
            );
            try {
                await service.removeWorkspaceRole(workspaceId, userId, roleId);
            } catch {
                await loadMembers();
            }
        },
        [workspaceId, service, loadMembers],
    );

    const handleLeave = useCallback(async () => {
        if (!workspaceId) return;
        try {
            await service.leaveWorkspace(workspaceId);
            onLeaveWorkspace?.();
            onClose();
        } catch {
            setError("Failed to leave workspace");
        }
    }, [workspaceId, service, onLeaveWorkspace, onClose]);

    if (!isOpen || !workspaceId) return null;

    return (
        <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/70 backdrop-blur-[1px] p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)]">
                {/* Header */}
                <div className="relative h-[88px] border-b border-[var(--wd-border-subtle)] bg-[linear-gradient(120deg,rgba(88,101,242,0.2),rgba(15,17,21,0.96))]">
                    <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4">
                        <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border wd-border-subtle bg-[var(--wd-surface-panel-2)]">
                                <Users size={15} className="wd-text-secondary" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold wd-text-primary">
                                    Workspace Members
                                </p>
                                <p className="text-xs wd-text-muted truncate max-w-[200px]">
                                    {workspaceName}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close members"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="absolute bottom-0 inset-x-0 flex px-4 gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab("members")}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 ${
                                activeTab === "members"
                                    ? "border-[rgba(88,101,242,0.8)] wd-text-primary"
                                    : "border-transparent wd-text-muted hover:wd-text-secondary"
                            }`}
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Users size={12} />
                                Members
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("invites")}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 ${
                                activeTab === "invites"
                                    ? "border-[rgba(88,101,242,0.8)] wd-text-primary"
                                    : "border-transparent wd-text-muted hover:wd-text-secondary"
                            }`}
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Link size={12} />
                                Invites
                            </span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger mb-3">
                            {error}
                        </p>
                    )}

                    {activeTab === "members" && (
                        <WorkspaceMembersTab
                            members={members}
                            roles={roles}
                            isLoading={isLoadingMembers}
                            workspaceOwnerId={workspaceOwnerId}
                            viewerUserId={viewerUserId}
                            viewerCanManageMembers={viewerCanManageMembers}
                            viewerCanBanMembers={viewerCanBanMembers}
                            viewerCanManageRoles={viewerCanManageRoles}
                            onContextMenu={(member, x, y) =>
                                setContextMenu({ member, x, y })
                            }
                            onRefresh={loadMembers}
                        />
                    )}

                    {activeTab === "invites" && (
                        <WorkspaceInvitesTab
                            workspaceId={workspaceId}
                            viewerCanCreateInvite={viewerCanCreateInvite}
                        />
                    )}
                </div>
            </div>

            {contextMenu && (
                <WorkspaceMemberContextMenu
                    member={contextMenu.member}
                    roles={roles}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    isViewer={contextMenu.member.userId === viewerUserId}
                    canManageMembers={viewerCanManageMembers && contextMenu.member.userId !== workspaceOwnerId}
                    canBanMembers={viewerCanBanMembers && contextMenu.member.userId !== workspaceOwnerId}
                    canManageRoles={viewerCanManageRoles}
                    onKick={handleKick}
                    onBan={handleBan}
                    onAssignRole={handleAssignRole}
                    onRemoveRole={handleRemoveRole}
                    onLeave={handleLeave}
                    onViewProfile={onViewProfile}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}

export default WorkspaceMembersModal;
