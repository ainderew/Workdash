import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ChevronLeft,
    ImagePlus,
    Loader2,
    Plus,
    Settings,
    Shield,
    Trash2,
    X,
} from "lucide-react";
import { CONFIG } from "@/common/utils/config";
import type { WorkspaceRole } from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SERVER_NAME_LENGTH = 100;

type SettingsTab = "overview" | "roles";

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

const ROLE_COLORS = [
    0x5865F2, 0x57F287, 0xFEE75C, 0xEB459E, 0xED4245,
    0xE67E22, 0x1ABC9C, 0x3498DB, 0x9B59B6, 0xE91E63,
    0x11806A, 0x206694, 0x71368A, 0xAD1457, 0xF1C40F,
];

function colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

interface ServerSettingsModalProps {
    isOpen: boolean;
    serverId: string | null;
    serverName: string;
    currentImageUrl: string | null;
    onClose: () => void;
    onImageChanged: (serverId: string, imageUrl: string | null) => void;
    onServerRenamed?: (serverId: string, name: string) => void;
}

// ================================================================
// Roles Tab Component
// ================================================================

function RolesTab({ workspaceId }: { workspaceId: string }) {
    const [roles, setRoles] = useState<WorkspaceRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Edit form state
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState(0x5865F2);
    const [editPermissions, setEditPermissions] = useState(BigInt(0));
    const [isSaving, setIsSaving] = useState(false);
    const [isRoleDeleting, setIsRoleDeleting] = useState(false);

    const service = ChatV2Service.getInstance();

    const loadRoles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetched = await service.listWorkspaceRoles(workspaceId);
            setRoles(fetched);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load roles");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, service]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

    useEffect(() => {
        if (selectedRole) {
            setEditName(selectedRole.name);
            setEditColor(selectedRole.color);
            setEditPermissions(BigInt(selectedRole.permissions));
        }
    }, [selectedRole]);

    const handleCreateRole = async () => {
        setIsCreating(true);
        setError(null);
        try {
            const created = await service.createWorkspaceRole(workspaceId, {
                name: "New Role",
                permissions: "0",
                color: 0x5865F2,
            });
            setRoles((prev) => [...prev, created]);
            setSelectedRoleId(created.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create role");
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveRole = async () => {
        if (!selectedRole) return;
        setIsSaving(true);
        setError(null);
        try {
            const updated = await service.updateWorkspaceRole(
                workspaceId,
                selectedRole.id,
                {
                    name: editName.trim() || selectedRole.name,
                    permissions: editPermissions.toString(),
                    color: editColor,
                },
            );
            setRoles((prev) =>
                prev.map((r) => (r.id === updated.id ? updated : r)),
            );
            setSelectedRoleId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update role");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRole = async () => {
        if (!selectedRole || selectedRole.isEveryone) return;
        setIsRoleDeleting(true);
        setError(null);
        try {
            await service.deleteWorkspaceRole(workspaceId, selectedRole.id);
            setRoles((prev) => prev.filter((r) => r.id !== selectedRole.id));
            setSelectedRoleId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete role");
        } finally {
            setIsRoleDeleting(false);
        }
    };

    const togglePermission = (bit: bigint) => {
        setEditPermissions((prev) =>
            (prev & bit) === bit ? prev & ~bit : prev | bit,
        );
    };

    const isBusy = isSaving || isRoleDeleting || isCreating;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin wd-text-muted" />
            </div>
        );
    }

    // Role edit view
    if (selectedRole) {
        return (
            <div className="space-y-3">
                <button
                    type="button"
                    onClick={() => setSelectedRoleId(null)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 text-xs wd-text-secondary transition-colors hover:wd-text-primary disabled:opacity-50"
                >
                    <ChevronLeft size={14} />
                    Back to roles
                </button>

                {!selectedRole.isEveryone && (
                    <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                            Role Name
                        </p>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={100}
                            disabled={isBusy}
                            className="h-8 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)] disabled:opacity-50"
                        />
                        <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted mt-2">
                            Color
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {ROLE_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setEditColor(c)}
                                    disabled={isBusy}
                                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                                        editColor === c
                                            ? "border-white scale-110"
                                            : "border-transparent opacity-70 hover:opacity-100"
                                    }`}
                                    style={{ backgroundColor: colorToHex(c) }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted mb-2">
                        Permissions
                    </p>
                    <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                        {PERMISSION_CATEGORIES.map((category) => {
                            const permsInCategory = Object.entries(PERMISSIONS).filter(
                                ([, v]) => v.category === category,
                            );
                            if (permsInCategory.length === 0) return null;
                            return (
                                <div key={category}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1">
                                        {category}
                                    </p>
                                    {permsInCategory.map(([key, perm]) => {
                                        const isOn = (editPermissions & perm.bit) === perm.bit;
                                        return (
                                            <label
                                                key={key}
                                                className="flex items-center justify-between py-1 cursor-pointer group"
                                            >
                                                <span className="text-xs wd-text-primary group-hover:wd-text-primary">
                                                    {perm.label}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePermission(perm.bit)}
                                                    disabled={isBusy}
                                                    className={`relative h-5 w-9 rounded-full transition-colors ${
                                                        isOn
                                                            ? "bg-[rgba(88,101,242,0.7)]"
                                                            : "bg-[var(--wd-surface-elevated)]"
                                                    }`}
                                                >
                                                    <span
                                                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                                                            isOn ? "left-[18px]" : "left-0.5"
                                                        }`}
                                                    />
                                                </button>
                                            </label>
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
                    {!selectedRole.isEveryone ? (
                        <button
                            type="button"
                            onClick={handleDeleteRole}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-[#ff7b7b] transition-colors hover:bg-[rgba(255,123,123,0.1)] disabled:opacity-50"
                        >
                            {isRoleDeleting ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Trash2 size={12} />
                            )}
                            Delete Role
                        </button>
                    ) : (
                        <div />
                    )}
                    <button
                        type="button"
                        onClick={handleSaveRole}
                        disabled={isBusy}
                        className="inline-flex h-8 items-center gap-2 rounded-md border border-[rgba(88,101,242,0.6)] bg-[rgba(88,101,242,0.2)] px-3 text-xs font-semibold wd-text-primary transition-colors hover:bg-[rgba(88,101,242,0.3)] disabled:opacity-60"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save"
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Role list view
    return (
        <div className="space-y-3">
            {error && (
                <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
                    {error}
                </p>
            )}

            <div className="space-y-1">
                {[...roles]
                    .sort((a, b) => b.position - a.position)
                    .map((role) => (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRoleId(role.id)}
                            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[var(--wd-surface-elevated)]"
                        >
                            <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{
                                    backgroundColor: role.color
                                        ? colorToHex(role.color)
                                        : "#99aab5",
                                }}
                            />
                            <span className="text-sm wd-text-primary truncate">
                                {role.name}
                            </span>
                            {role.isEveryone && (
                                <span className="ml-auto text-[10px] wd-text-muted">
                                    default
                                </span>
                            )}
                        </button>
                    ))}
            </div>

            <button
                type="button"
                onClick={handleCreateRole}
                disabled={isCreating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border wd-border-subtle px-3 py-2 text-xs font-semibold wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-50"
            >
                {isCreating ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <Plus size={14} />
                )}
                Create Role
            </button>
        </div>
    );
}

// ================================================================
// Main Modal
// ================================================================

function ServerSettingsModal({
    isOpen,
    serverId,
    serverName,
    currentImageUrl,
    onClose,
    onImageChanged,
    onServerRenamed,
}: ServerSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editName, setEditName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEditName(serverName);
            setActiveTab("overview");
        } else {
            setPreviewUrl(null);
            setSelectedFile(null);
            setError(null);
            setIsUploading(false);
            setIsDeleting(false);
            setIsRenaming(false);
        }
    }, [isOpen, serverName]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key === "Escape" &&
                !isUploading &&
                !isDeleting &&
                !isRenaming
            ) {
                onClose();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, isUploading, isDeleting, isRenaming, onClose]);

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            const file = event.target.files?.[0];
            if (!file) return;

            if (!ALLOWED_TYPES.includes(file.type)) {
                setError(
                    "Invalid file type. Allowed: PNG, JPEG, WebP, GIF",
                );
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                setError("File size exceeds 5MB limit");
                return;
            }

            setSelectedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        },
        [],
    );

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleUpload = async () => {
        if (!selectedFile || !serverId) return;

        setIsUploading(true);
        setError(null);

        try {
            const jwt = window.__BACKEND_JWT__;
            if (!jwt) throw new Error("Not authenticated");

            const formData = new FormData();
            formData.append("image", selectedFile);

            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/servers/${serverId}/image`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${jwt}` },
                    body: formData,
                },
            );

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    body?.error || `Upload failed: ${response.status}`,
                );
            }

            onImageChanged(serverId, body.imageUrl);
            onClose();
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "Failed to upload image",
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!serverId || !currentImageUrl) return;

        setIsDeleting(true);
        setError(null);

        try {
            const jwt = window.__BACKEND_JWT__;
            if (!jwt) throw new Error("Not authenticated");

            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/servers/${serverId}/image`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${jwt}` },
                },
            );

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(
                    body?.error || `Delete failed: ${response.status}`,
                );
            }

            onImageChanged(serverId, null);
            onClose();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : "Failed to delete image",
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRename = async () => {
        if (!serverId) return;
        const trimmed = editName.trim();
        if (!trimmed || trimmed === serverName) return;

        setIsRenaming(true);
        setError(null);

        try {
            const jwt = window.__BACKEND_JWT__;
            if (!jwt) throw new Error("Not authenticated");

            const response = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/servers/${serverId}/name`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name: trimmed }),
                },
            );

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    body?.error || `Rename failed: ${response.status}`,
                );
            }

            onServerRenamed?.(serverId, body.name);
            onClose();
        } catch (renameError) {
            setError(
                renameError instanceof Error
                    ? renameError.message
                    : "Failed to rename server",
            );
        } finally {
            setIsRenaming(false);
        }
    };

    if (!isOpen || !serverId) return null;

    const displayImage = previewUrl || currentImageUrl;
    const isBusy = isUploading || isDeleting || isRenaming;
    const nameChanged = editName.trim() !== serverName && editName.trim().length > 0;
    const hasUnsavedChanges = !!selectedFile || nameChanged;

    return (
        <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/70 backdrop-blur-[1px] p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_24px_56px_rgba(0,0,0,0.5)]">
                <div className="relative h-24 border-b wd-border-subtle bg-[linear-gradient(120deg,rgba(88,101,242,0.2),rgba(15,17,21,0.96))]">
                    <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4">
                        <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border wd-border-subtle wd-bg-panel-2">
                                <Settings
                                    size={15}
                                    className="wd-text-secondary"
                                />
                            </span>
                            <div>
                                <p className="text-sm font-semibold wd-text-primary">
                                    Server Settings
                                </p>
                                <p className="text-xs wd-text-muted truncate max-w-[200px]">
                                    {serverName}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isBusy}
                            aria-label="Close server settings"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-50"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="absolute bottom-0 inset-x-0 flex px-4 gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab("overview")}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 ${
                                activeTab === "overview"
                                    ? "border-[rgba(88,101,242,0.8)] wd-text-primary"
                                    : "border-transparent wd-text-muted hover:wd-text-secondary"
                            }`}
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Settings size={12} />
                                Overview
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("roles")}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 ${
                                activeTab === "roles"
                                    ? "border-[rgba(88,101,242,0.8)] wd-text-primary"
                                    : "border-transparent wd-text-muted hover:wd-text-secondary"
                            }`}
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Shield size={12} />
                                Roles
                            </span>
                        </button>
                    </div>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {activeTab === "overview" && (
                        <div className="space-y-4">
                            <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                                    Server Name
                                </p>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    maxLength={MAX_SERVER_NAME_LENGTH}
                                    disabled={isBusy}
                                    className="mt-1.5 h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated px-3 text-sm wd-text-primary outline-none focus:border-[var(--wd-border-strong)] disabled:opacity-50"
                                />
                            </div>

                            <div className="rounded-lg border wd-border-subtle wd-bg-panel-2 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
                                    Server Image
                                </p>

                                <div className="mt-3 flex items-center gap-4">
                                    <div className="relative h-16 w-16 shrink-0 rounded-lg wd-bg-elevated overflow-hidden border wd-border-subtle">
                                        {displayImage ? (
                                            <img
                                                src={displayImage}
                                                alt={serverName}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="inline-flex h-full w-full items-center justify-center text-lg font-bold wd-text-muted">
                                                {serverName
                                                    .trim()
                                                    .charAt(0)
                                                    .toUpperCase() || "S"}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="inline-flex items-center gap-2 rounded-md border wd-border-subtle px-3 py-1.5 text-xs font-semibold wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
                                        >
                                            <ImagePlus size={14} />
                                            {currentImageUrl || previewUrl
                                                ? "Change Image"
                                                : "Upload Image"}
                                        </button>

                                        {currentImageUrl && !previewUrl && (
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={handleDelete}
                                                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-[#ff7b7b] transition-colors hover:bg-[rgba(255,123,123,0.1)] disabled:opacity-50"
                                            >
                                                {isDeleting ? (
                                                    <>
                                                        <Loader2
                                                            size={14}
                                                            className="animate-spin"
                                                        />
                                                        Removing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 size={14} />
                                                        Remove Image
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />

                                <p className="mt-2 text-[10px] wd-text-muted">
                                    PNG, JPEG, WebP, or GIF. Max 5MB.
                                </p>
                            </div>

                            {error && (
                                <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-sm wd-text-danger">
                                    {error}
                                </p>
                            )}

                            {hasUnsavedChanges && (
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setPreviewUrl(null);
                                            setEditName(serverName);
                                            setError(null);
                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = "";
                                            }
                                        }}
                                        disabled={isBusy}
                                        className="h-9 rounded-md border wd-border-subtle px-3 text-sm wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:wd-text-primary disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (selectedFile) await handleUpload();
                                            if (nameChanged) await handleRename();
                                        }}
                                        disabled={isBusy}
                                        className="inline-flex h-9 items-center gap-2 rounded-md border border-[rgba(88,101,242,0.6)] bg-[rgba(88,101,242,0.2)] px-3 text-sm font-semibold wd-text-primary transition-colors hover:bg-[rgba(88,101,242,0.3)] disabled:opacity-60"
                                    >
                                        {isBusy ? (
                                            <>
                                                <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save Changes"
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "roles" && (
                        <RolesTab workspaceId={serverId} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default ServerSettingsModal;
