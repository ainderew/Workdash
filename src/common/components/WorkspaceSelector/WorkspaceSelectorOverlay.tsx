import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Building2, Check, Link, Loader2, Plus, X } from "lucide-react";
import useWorkspaceStore from "@/common/store/workspaceStore";
import useChatV2Store from "@/common/store/chatV2Store";
import useUiStore from "@/common/store/uiStore";
import { EventBus } from "@/game/EventBus";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { toWorkspaceInitials, extractInviteCode } from "@/common/utils/workspaceDisplay";
import type { Workspace } from "@/communication/chatV2/_types";

const DEFAULT_WS_KEY = "workdash:defaultWorkspaceId";

type InlinePanel = "create" | "join" | null;

function WorkspaceSelectorOverlay() {
    const showWorkspaceSelector = useUiStore((s) => s.showWorkspaceSelector);
    const closeWorkspaceSelector = useUiStore((s) => s.closeWorkspaceSelector);
    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const isLoading = useWorkspaceStore((s) => s.isLoading);
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const setSelectedWorkspaceId = useChatV2Store((s) => s.setSelectedWorkspaceId);

    const [inlinePanel, setInlinePanel] = useState<InlinePanel>(null);
    const [defaultWorkspaceId, setDefaultWorkspaceId] = useState<string | null>(
        () => localStorage.getItem(DEFAULT_WS_KEY),
    );
    const [isDismissing, setIsDismissing] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const hasAutoResolved = useRef(false);

    const handleSelect = useCallback(
        (workspaceId: string) => {
            setSelectedWorkspaceId(workspaceId);
            EventBus.emit("workspace-switch", { workspaceId });
            setIsDismissing(true);
        },
        [setSelectedWorkspaceId],
    );

    const handleClose = useCallback(() => {
        setIsDismissing(true);
    }, []);

    const handleAnimationEnd = useCallback(() => {
        if (isDismissing) {
            closeWorkspaceSelector();
            setIsDismissing(false);
        }
    }, [isDismissing, closeWorkspaceSelector]);

    const handleSetDefault = useCallback(
        (workspaceId: string, isDefault: boolean) => {
            if (isDefault) {
                localStorage.setItem(DEFAULT_WS_KEY, workspaceId);
                setDefaultWorkspaceId(workspaceId);
            } else {
                localStorage.removeItem(DEFAULT_WS_KEY);
                setDefaultWorkspaceId(null);
            }
        },
        [],
    );

    // Precedence logic: auto-resolve when loading settles
    useEffect(() => {
        if (isLoading || hasAutoResolved.current) return;

        // Case 1: Already selected and exists in list
        if (
            selectedWorkspaceId &&
            workspaces.some((ws) => ws.id === selectedWorkspaceId)
        ) {
            hasAutoResolved.current = true;
            closeWorkspaceSelector();
            return;
        }

        // Case 2: Exactly one workspace
        if (workspaces.length === 1) {
            hasAutoResolved.current = true;
            requestAnimationFrame(() => {
                handleSelect(workspaces[0].id);
            });
            return;
        }

        // Case 3: Default workspace is set and exists in list
        const storedDefault = localStorage.getItem(DEFAULT_WS_KEY);
        if (
            storedDefault &&
            workspaces.some((ws) => ws.id === storedDefault)
        ) {
            hasAutoResolved.current = true;
            requestAnimationFrame(() => {
                handleSelect(storedDefault);
            });
            return;
        }

        // Case 4 & 5: multiple or zero — show UI (no auto action)
    }, [isLoading, workspaces, selectedWorkspaceId, closeWorkspaceSelector, handleSelect]);

    // Escape key handler (capture phase)
    useEffect(() => {
        if (!showWorkspaceSelector || isDismissing) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                if (inlinePanel) {
                    setInlinePanel(null);
                } else {
                    handleClose();
                }
            }
        };

        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [showWorkspaceSelector, isDismissing, inlinePanel, handleClose]);

    if (!showWorkspaceSelector) return null;

    return (
        <div
            className={`fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-8 ${
                isDismissing
                    ? "animate-out fade-out duration-200"
                    : "animate-in fade-in duration-200"
            }`}
            onAnimationEnd={handleAnimationEnd}
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="max-w-[640px] w-full flex flex-col gap-8">
                {/* Header */}
                <div className="text-center">
                    <div className="text-[11px] font-bold tracking-[0.15em] uppercase text-[var(--wd-accent)] mb-2">
                        WorkDash
                    </div>
                    <h1 className="text-[28px] font-bold leading-tight wd-text-primary">
                        Choose your workspace
                    </h1>
                    <p className="text-[15px] wd-text-secondary mt-1.5">
                        Pick where you want to work today.
                    </p>
                </div>

                {/* Content */}
                {isLoading ? (
                    <SkeletonGrid />
                ) : workspaces.length === 0 ? (
                    <EmptyState
                        onCreateClick={() => setInlinePanel("create")}
                        onJoinClick={() => setInlinePanel("join")}
                    />
                ) : (
                    <>
                        <div
                            ref={gridRef}
                            className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 max-h-[52vh] overflow-y-auto no-scrollbar relative"
                            role="listbox"
                            aria-label="Select workspace"
                        >
                            {workspaces.map((ws) => (
                                <WorkspaceCard
                                    key={ws.id}
                                    workspace={ws}
                                    isDefault={defaultWorkspaceId === ws.id}
                                    onSelect={() => handleSelect(ws.id)}
                                    onSetDefault={(isDefault) =>
                                        handleSetDefault(ws.id, isDefault)
                                    }
                                />
                            ))}
                        </div>

                        {/* Action Row */}
                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                className="wd-btn-ghost inline-flex items-center gap-1.5"
                                onClick={() => setInlinePanel("create")}
                            >
                                <Plus size={15} />
                                Create workspace
                            </button>
                            <button
                                type="button"
                                className="wd-btn-ghost inline-flex items-center gap-1.5"
                                onClick={() => setInlinePanel("join")}
                            >
                                <Link size={15} />
                                Join by invite
                            </button>
                        </div>
                    </>
                )}

                {/* Inline Panel */}
                {inlinePanel === "create" && (
                    <CreatePanel
                        onClose={() => setInlinePanel(null)}
                        onCreated={(ws) => handleSelect(ws.id)}
                    />
                )}
                {inlinePanel === "join" && (
                    <JoinPanel
                        onClose={() => setInlinePanel(null)}
                        onJoined={(ws) => handleSelect(ws.id)}
                    />
                )}
            </div>
        </div>
    );
}

// ================================================================
// Sub-components
// ================================================================

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-[14px] border wd-border-subtle wd-bg-panel p-5 flex flex-col items-center gap-3 min-h-[140px]"
                >
                    <div className="w-14 h-14 rounded-[14px] wd-bg-elevated animate-pulse" />
                    <div className="h-3 w-20 rounded-full wd-bg-elevated animate-pulse" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({
    onCreateClick,
    onJoinClick,
}: {
    onCreateClick: () => void;
    onJoinClick: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <Building2 size={48} className="wd-text-muted opacity-40" />
            <div className="text-center">
                <p className="text-base font-semibold wd-text-primary">
                    No workspaces yet
                </p>
                <p className="text-sm wd-text-muted mt-1">
                    Create one to get started, or join an existing workspace.
                </p>
            </div>
            <div className="flex gap-3">
                <button
                    type="button"
                    className="wd-btn-primary inline-flex items-center gap-1.5"
                    onClick={onCreateClick}
                >
                    <Plus size={15} />
                    Create workspace
                </button>
                <button
                    type="button"
                    className="wd-btn-ghost inline-flex items-center gap-1.5"
                    onClick={onJoinClick}
                >
                    <Link size={15} />
                    Join by invite
                </button>
            </div>
        </div>
    );
}

function WorkspaceCard({
    workspace,
    isDefault,
    onSelect,
    onSetDefault,
}: {
    workspace: Workspace;
    isDefault: boolean;
    onSelect: () => void;
    onSetDefault: (isDefault: boolean) => void;
}) {
    const viewerUserId = (
        typeof window !== "undefined"
            ? (window as unknown as Record<string, unknown>).__BACKEND_USER__
            : null
    ) as { id: number } | null;
    const isOwner = viewerUserId?.id === workspace.ownerId;

    return (
        <button
            type="button"
            role="option"
            aria-selected={isDefault}
            onClick={onSelect}
            className={`group relative rounded-[14px] border p-5 flex flex-col items-center gap-3 min-h-[140px] cursor-pointer transition-all duration-150 active:scale-[0.97] ${
                isDefault
                    ? "border-[var(--wd-accent)] shadow-[0_0_0_2px_var(--wd-accent-soft)] wd-bg-panel"
                    : "wd-border-subtle wd-bg-panel hover:border-[var(--wd-border-strong)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.28)] hover:-translate-y-0.5"
            }`}
        >
            {/* Default Badge */}
            {isDefault && (
                <span className="absolute top-2 right-2 bg-[var(--wd-accent-soft)] text-[var(--wd-accent)] text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full">
                    Default
                </span>
            )}

            {/* Avatar */}
            <div className="w-14 h-14 rounded-[14px] wd-bg-elevated flex items-center justify-center text-xl font-bold wd-text-primary overflow-hidden shrink-0">
                {workspace.iconUrl ? (
                    <Image
                        src={workspace.iconUrl}
                        alt=""
                        width={56}
                        height={56}
                        unoptimized
                        className="w-full h-full object-cover"
                    />
                ) : (
                    toWorkspaceInitials(workspace.name)
                )}
            </div>

            {/* Name */}
            <span className="text-sm font-semibold wd-text-primary text-center w-full truncate leading-tight">
                {workspace.name}
            </span>

            {/* Owner badge */}
            {isOwner && (
                <span className="text-[10px] font-medium wd-text-muted uppercase tracking-wide">
                    Owner
                </span>
            )}

            {/* Default Toggle */}
            <label
                className="mt-auto flex items-center gap-1.5 text-[11px] wd-text-muted cursor-pointer"
                onClick={(e) => e.stopPropagation()}
            >
                <span
                    className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors ${
                        isDefault
                            ? "bg-[var(--wd-accent)] border-[var(--wd-accent)]"
                            : "border-[var(--wd-border-strong)] bg-transparent"
                    }`}
                >
                    {isDefault && <Check size={10} className="text-white" />}
                </span>
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={isDefault}
                    onChange={(e) => onSetDefault(e.target.checked)}
                />
                Set as default
            </label>

            {/* Hover enter text */}
            <span className="absolute bottom-1.5 left-0 right-0 text-center text-[11px] font-semibold text-[var(--wd-accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                Enter &rarr;
            </span>
        </button>
    );
}

function CreatePanel({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (workspace: Workspace) => void;
}) {
    const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
    const [name, setName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsCreating(true);
        setError(null);
        try {
            const ws = await createWorkspace(name.trim());
            if (ws) {
                onCreated(ws);
            } else {
                setError("Failed to create workspace");
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create workspace",
            );
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="rounded-xl border wd-border-subtle wd-bg-panel p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold wd-text-primary">
                    Create Workspace
                </h3>
                <button
                    type="button"
                    className="wd-btn-ghost p-1"
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary mb-2">
                        Workspace Name
                    </label>
                    <input
                        type="text"
                        className="wd-input"
                        placeholder="e.g. Design Team"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isCreating) void handleCreate();
                        }}
                        autoFocus
                        disabled={isCreating}
                    />
                </div>

                {error && (
                    <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="wd-btn-ghost"
                        onClick={onClose}
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="wd-btn-primary inline-flex items-center gap-2"
                        onClick={handleCreate}
                        disabled={isCreating || !name.trim()}
                    >
                        {isCreating ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Workspace"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function JoinPanel({
    onClose,
    onJoined,
}: {
    onClose: () => void;
    onJoined: (workspace: Workspace) => void;
}) {
    const fetchMyWorkspaces = useWorkspaceStore((s) => s.fetchMyWorkspaces);
    const [codeValue, setCodeValue] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoin = async () => {
        const code = extractInviteCode(codeValue);
        if (!code) {
            setError("Please enter an invite code or link.");
            return;
        }

        setIsJoining(true);
        setError(null);
        try {
            const service = ChatV2Service.getInstance();
            const workspace = await service.joinWorkspaceByInvite(code);
            void fetchMyWorkspaces();
            onJoined(workspace);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to join workspace",
            );
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="rounded-xl border wd-border-subtle wd-bg-panel p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold wd-text-primary">
                    Join a Workspace
                </h3>
                <button
                    type="button"
                    className="wd-btn-ghost p-1"
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide wd-text-secondary mb-2">
                        Invite Code or Link
                    </label>
                    <input
                        type="text"
                        className="wd-input"
                        placeholder="e.g. abc123 or https://..."
                        value={codeValue}
                        onChange={(e) => setCodeValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isJoining) void handleJoin();
                        }}
                        autoFocus
                        disabled={isJoining}
                    />
                </div>

                {error && (
                    <p className="rounded-md border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.12)] px-3 py-2 text-xs wd-text-danger">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="wd-btn-ghost"
                        onClick={onClose}
                        disabled={isJoining}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="wd-btn-primary inline-flex items-center gap-2"
                        onClick={handleJoin}
                        disabled={isJoining || !codeValue.trim()}
                    >
                        {isJoining ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Joining...
                            </>
                        ) : (
                            "Join Workspace"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WorkspaceSelectorOverlay;
