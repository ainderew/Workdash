import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Loader2, Plus, Shield, X } from "lucide-react";
import type {
    ChannelOverwrite,
    WorkspaceRole,
} from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";

// Permission constants (mirrors backend P object)
// Using BigInt() constructor since TS target is ES2017 (no bigint literals)
const B1 = BigInt(1);
const bit = (shift: number) => B1 << BigInt(shift);

const PERMISSIONS: Record<
    string,
    { bit: bigint; label: string; category: string }
> = {
    VIEW_CHANNEL: { bit: bit(0), label: "View Channel", category: "General" },
    SEND_MESSAGES: { bit: bit(1), label: "Send Messages", category: "Text" },
    MANAGE_MESSAGES: { bit: bit(2), label: "Manage Messages", category: "Moderation" },
    MANAGE_CHANNELS: { bit: bit(3), label: "Manage Channels", category: "Administration" },
    MANAGE_WORKSPACE: { bit: bit(4), label: "Manage Workspace", category: "Administration" },
    KICK_MEMBERS: { bit: bit(5), label: "Kick Members", category: "Moderation" },
    BAN_MEMBERS: { bit: bit(6), label: "Ban Members", category: "Moderation" },
    ADMINISTRATOR: { bit: bit(7), label: "Administrator", category: "Administration" },
    MANAGE_ROLES: { bit: bit(8), label: "Manage Roles", category: "Administration" },
    MENTION_EVERYONE: { bit: bit(9), label: "Mention Everyone", category: "Text" },
    ADD_REACTIONS: { bit: bit(10), label: "Add Reactions", category: "Text" },
    READ_HISTORY: { bit: bit(11), label: "Read History", category: "General" },
    CONNECT: { bit: bit(12), label: "Connect", category: "Voice" },
    SPEAK: { bit: bit(13), label: "Speak", category: "Voice" },
    MUTE_MEMBERS: { bit: bit(14), label: "Mute Members", category: "Voice" },
    MOVE_MEMBERS: { bit: bit(15), label: "Move Members", category: "Voice" },
    MANAGE_CATEGORIES: { bit: bit(16), label: "Manage Categories", category: "Administration" },
    CREATE_INVITE: { bit: bit(17), label: "Create Invite", category: "General" },
    MANAGE_WORLD: { bit: bit(18), label: "Manage World", category: "Administration" },
    MODERATE_MEMBERS: { bit: bit(19), label: "Moderate Members", category: "Moderation" },
    ATTACH_FILES: { bit: bit(20), label: "Attach Files", category: "Text" },
    EMBED_LINKS: { bit: bit(21), label: "Embed Links", category: "Text" },
};

const PERMISSION_CATEGORIES = ["General", "Text", "Voice", "Moderation", "Administration"] as const;

type OverwriteState = "inherit" | "allow" | "deny";

function colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

interface ChannelPermissionsModalProps {
    isOpen: boolean;
    workspaceId: string | null;
    channelId: string | null;
    channelName: string;
    onClose: () => void;
}

function ChannelPermissionsModal({
    isOpen,
    workspaceId,
    channelId,
    channelName,
    onClose,
}: ChannelPermissionsModalProps) {
    const [roles, setRoles] = useState<WorkspaceRole[]>([]);
    const [overwrites, setOverwrites] = useState<ChannelOverwrite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [showAddRoleList, setShowAddRoleList] = useState(false);

    // Local edit state for the selected role's overwrite
    const [editAllow, setEditAllow] = useState(BigInt(0));
    const [editDeny, setEditDeny] = useState(BigInt(0));

    const service = ChatV2Service.getInstance();

    const loadData = useCallback(async () => {
        if (!workspaceId || !channelId) return;
        setIsLoading(true);
        setError(null);
        try {
            const [fetchedRoles, fetchedOverwrites] = await Promise.all([
                service.listWorkspaceRoles(workspaceId),
                service.listChannelOverwrites(workspaceId, channelId),
            ]);
            setRoles(fetchedRoles);
            setOverwrites(fetchedOverwrites);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, channelId, service]);

    useEffect(() => {
        if (isOpen) {
            loadData();
            setSelectedRoleId(null);
            setShowAddRoleList(false);
        }
    }, [isOpen, loadData]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isSaving && !isRemoving) {
                onClose();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, isSaving, isRemoving, onClose]);

    // When selecting a role, populate edit state from existing overwrite
    useEffect(() => {
        if (!selectedRoleId) return;
        const existing = overwrites.find(
            (ow) => ow.targetId === selectedRoleId && ow.targetType === 0,
        );
        setEditAllow(existing ? BigInt(existing.allow) : BigInt(0));
        setEditDeny(existing ? BigInt(existing.deny) : BigInt(0));
    }, [selectedRoleId, overwrites]);

    const getPermState = (bit: bigint): OverwriteState => {
        if ((editAllow & bit) === bit) return "allow";
        if ((editDeny & bit) === bit) return "deny";
        return "inherit";
    };

    const cyclePermState = (bit: bigint) => {
        const current = getPermState(bit);
        if (current === "inherit") {
            // -> allow
            setEditAllow((prev) => prev | bit);
            setEditDeny((prev) => prev & ~bit);
        } else if (current === "allow") {
            // -> deny
            setEditAllow((prev) => prev & ~bit);
            setEditDeny((prev) => prev | bit);
        } else {
            // -> inherit
            setEditAllow((prev) => prev & ~bit);
            setEditDeny((prev) => prev & ~bit);
        }
    };

    const handleSaveOverwrite = async () => {
        if (!workspaceId || !channelId || !selectedRoleId) return;
        setIsSaving(true);
        setError(null);
        try {
            const result = await service.setChannelOverwrite(
                workspaceId,
                channelId,
                {
                    targetId: selectedRoleId,
                    targetType: 0,
                    allow: editAllow.toString(),
                    deny: editDeny.toString(),
                },
            );
            setOverwrites((prev) => {
                const idx = prev.findIndex(
                    (ow) => ow.targetId === selectedRoleId && ow.targetType === 0,
                );
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = result;
                    return next;
                }
                return [...prev, result];
            });
            setSelectedRoleId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save overwrite");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveOverwrite = async () => {
        if (!workspaceId || !channelId || !selectedRoleId) return;
        setIsRemoving(true);
        setError(null);
        try {
            await service.deleteChannelOverwrite(
                workspaceId,
                channelId,
                selectedRoleId,
                0,
            );
            setOverwrites((prev) =>
                prev.filter(
                    (ow) =>
                        !(ow.targetId === selectedRoleId && ow.targetType === 0),
                ),
            );
            setSelectedRoleId(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to remove overwrite",
            );
        } finally {
            setIsRemoving(false);
        }
    };

    const handleAddRoleOverride = (roleId: string) => {
        setShowAddRoleList(false);
        setSelectedRoleId(roleId);
    };

    if (!isOpen || !workspaceId || !channelId) return null;

    const rolesWithOverwrites = roles.filter((r) =>
        overwrites.some((ow) => ow.targetId === r.id && ow.targetType === 0),
    );
    const rolesWithoutOverwrites = roles.filter(
        (r) =>
            !overwrites.some(
                (ow) => ow.targetId === r.id && ow.targetType === 0,
            ),
    );

    const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
    const hasExistingOverwrite = overwrites.some(
        (ow) => ow.targetId === selectedRoleId && ow.targetType === 0,
    );
    const isBusy = isSaving || isRemoving;

    return (
        <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/70 backdrop-blur-[1px] p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)]">
                <div className="relative h-20 border-b wd-border-subtle bg-[linear-gradient(120deg,rgba(88,101,242,0.2),rgba(15,17,21,0.96))]">
                    <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4">
                        <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border wd-border-subtle wd-bg-panel-2">
                                <Shield size={15} className="wd-text-secondary" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold wd-text-primary">
                                    Channel Permissions
                                </p>
                                <p className="text-xs wd-text-muted truncate max-w-[200px]">
                                    #{channelName}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isBusy}
                            aria-label="Close channel permissions"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-50"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={20} className="animate-spin wd-text-muted" />
                        </div>
                    ) : selectedRole ? (
                        /* Edit overwrite for selected role */
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setSelectedRoleId(null)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 text-xs wd-text-secondary transition-colors hover:wd-text-primary disabled:opacity-50"
                            >
                                <ChevronLeft size={14} />
                                Back
                            </button>

                            <div className="flex items-center gap-2 rounded-lg border wd-border-subtle wd-bg-panel-2 px-3 py-2">
                                <span
                                    className="h-3 w-3 shrink-0 rounded-full"
                                    style={{
                                        backgroundColor: selectedRole.color
                                            ? colorToHex(selectedRole.color)
                                            : "#99aab5",
                                    }}
                                />
                                <span className="text-sm font-semibold wd-text-primary">
                                    {selectedRole.name}
                                </span>
                            </div>

                            <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                                        Permission Overwrites
                                    </p>
                                    <div className="flex gap-3 text-[9px] font-semibold uppercase tracking-wider wd-text-muted">
                                        <span className="w-8 text-center">Allow</span>
                                        <span className="w-8 text-center">Deny</span>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {PERMISSION_CATEGORIES.map((category) => {
                                        const permsInCategory = Object.entries(
                                            PERMISSIONS,
                                        ).filter(([, v]) => v.category === category);
                                        if (permsInCategory.length === 0) return null;
                                        return (
                                            <div key={category}>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1">
                                                    {category}
                                                </p>
                                                {permsInCategory.map(([key, perm]) => {
                                                    const state = getPermState(perm.bit);
                                                    return (
                                                        <div
                                                            key={key}
                                                            className="flex items-center justify-between py-1"
                                                        >
                                                            <span className="text-xs wd-text-primary">
                                                                {perm.label}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    cyclePermState(perm.bit)
                                                                }
                                                                disabled={isBusy}
                                                                className={`h-6 min-w-[52px] rounded-md px-2 text-[10px] font-semibold transition-colors ${
                                                                    state === "allow"
                                                                        ? "bg-[rgba(87,242,135,0.2)] text-[#57F287]"
                                                                        : state === "deny"
                                                                          ? "bg-[rgba(237,66,69,0.2)] text-[#ED4245]"
                                                                          : "bg-[var(--wd-surface-elevated)] wd-text-muted"
                                                                }`}
                                                            >
                                                                {state === "allow"
                                                                    ? "Allow"
                                                                    : state === "deny"
                                                                      ? "Deny"
                                                                      : "Inherit"}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {error && (
                                <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
                                    {error}
                                </p>
                            )}

                            <div className="flex items-center justify-between">
                                {hasExistingOverwrite ? (
                                    <button
                                        type="button"
                                        onClick={handleRemoveOverwrite}
                                        disabled={isBusy}
                                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-[#ff7b7b] transition-colors hover:bg-[rgba(255,123,123,0.1)] disabled:opacity-50"
                                    >
                                        {isRemoving ? (
                                            <Loader2
                                                size={12}
                                                className="animate-spin"
                                            />
                                        ) : null}
                                        Remove Override
                                    </button>
                                ) : (
                                    <div />
                                )}
                                <button
                                    type="button"
                                    onClick={handleSaveOverwrite}
                                    disabled={isBusy}
                                    className="inline-flex h-8 items-center gap-2 rounded-md border border-[rgba(88,101,242,0.6)] bg-[rgba(88,101,242,0.2)] px-3 text-xs font-semibold wd-text-primary transition-colors hover:bg-[rgba(88,101,242,0.3)] disabled:opacity-60"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2
                                                size={12}
                                                className="animate-spin"
                                            />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Role list with overwrites */
                        <div className="space-y-3">
                            {error && (
                                <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
                                    {error}
                                </p>
                            )}

                            {rolesWithOverwrites.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted mb-1">
                                        Roles with overrides
                                    </p>
                                    <div className="space-y-1">
                                        {rolesWithOverwrites.map((role) => (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedRoleId(role.id)
                                                }
                                                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[var(--wd-surface-elevated)]"
                                            >
                                                <span
                                                    className="h-3 w-3 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            role.color
                                                                ? colorToHex(
                                                                      role.color,
                                                                  )
                                                                : "#99aab5",
                                                    }}
                                                />
                                                <span className="text-sm wd-text-primary truncate">
                                                    {role.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {rolesWithOverwrites.length === 0 && (
                                <p className="py-4 text-center text-xs wd-text-muted">
                                    No channel permission overrides set.
                                </p>
                            )}

                            {showAddRoleList ? (
                                <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-2 space-y-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted px-1">
                                        Select a role
                                    </p>
                                    {rolesWithoutOverwrites.length === 0 ? (
                                        <p className="px-1 py-2 text-xs wd-text-muted">
                                            All roles already have overrides.
                                        </p>
                                    ) : (
                                        rolesWithoutOverwrites.map((role) => (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() =>
                                                    handleAddRoleOverride(
                                                        role.id,
                                                    )
                                                }
                                                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--wd-surface-elevated)]"
                                            >
                                                <span
                                                    className="h-3 w-3 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            role.color
                                                                ? colorToHex(
                                                                      role.color,
                                                                  )
                                                                : "#99aab5",
                                                    }}
                                                />
                                                <span className="text-xs wd-text-primary">
                                                    {role.name}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowAddRoleList(false)}
                                        className="w-full rounded-md px-2 py-1.5 text-xs wd-text-muted text-center transition-colors hover:bg-[var(--wd-surface-elevated)]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowAddRoleList(true)}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border wd-border-subtle px-3 py-2 text-xs font-semibold wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary"
                                >
                                    <Plus size={14} />
                                    Add Role Override
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChannelPermissionsModal;
