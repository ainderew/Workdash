import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Link, Loader2, Plus, Users, X } from "lucide-react";
import NoWorkspaceLandingPage from "./NoWorkspaceLandingPage";
import useWorkspaceStore from "@/common/store/workspaceStore";
import useChatV2Store from "@/common/store/chatV2Store";
import useUiStore from "@/common/store/uiStore";
import { EventBus } from "@/game/EventBus";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { toWorkspaceInitials, extractInviteCode } from "@/common/utils/workspaceDisplay";
import { tokenStore } from "@/common/utils/tokenStore";
import { CONFIG } from "@/common/utils/config";
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

        // Case 1: Already selected — validate it exists in the list
        if (selectedWorkspaceId) {
            if (workspaces.some((ws) => ws.id === selectedWorkspaceId)) {
                hasAutoResolved.current = true;
                closeWorkspaceSelector();
                return;
            }
            // Stale workspace ID — clear it and fall through to show UI
            setSelectedWorkspaceId(null);
            localStorage.removeItem(DEFAULT_WS_KEY);
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
    }, [isLoading, workspaces, selectedWorkspaceId, closeWorkspaceSelector, handleSelect, setSelectedWorkspaceId]);

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

    const hasWorkspaces = workspaces.length > 0;

    return (
        <div
            className={`fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto p-6 ${
                isDismissing
                    ? "animate-out fade-out duration-200"
                    : "animate-in fade-in duration-200"
            }`}
            style={{ backgroundColor: "rgb(0 0 0 / 0.85)", backdropFilter: "blur(12px)" }}
            onAnimationEnd={handleAnimationEnd}
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            {/* Decorative background orb */}
            <div
                className="wd-ws-float-orb pointer-events-none fixed w-[500px] h-[500px] rounded-full left-1/2 top-1/2"
                style={{
                    background: `radial-gradient(circle, rgb(var(--wd-accent-rgb) / 0.08) 0%, transparent 70%)`,
                }}
            />

            <div className="relative max-w-[680px] w-full flex flex-col gap-6">
                {/* Shared header area */}
                <div className="text-center space-y-3">
                    {/* Wordmark */}
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full mx-auto"
                        style={{
                            backgroundColor: "rgb(var(--wd-accent-rgb) / 0.08)",
                            border: "1px solid rgb(var(--wd-accent-rgb) / 0.15)",
                        }}
                    >
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: "var(--wd-accent)" }}
                        />
                        <span
                            className="text-[11px] font-semibold tracking-[0.12em] uppercase"
                            style={{ color: "var(--wd-accent)" }}
                        >
                            WorkDash
                        </span>
                    </div>

                    {hasWorkspaces ? (
                        <>
                            <h1 className="text-[32px] font-bold leading-[1.1] wd-text-primary tracking-[-0.02em]">
                                Choose your workspace
                            </h1>
                            <p className="text-[15px] wd-text-muted max-w-[380px] mx-auto leading-relaxed">
                                Pick where you want to work today.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-[32px] font-bold leading-[1.1] wd-text-primary tracking-[-0.02em]">
                                Welcome to WorkDash
                            </h1>
                            <p className="text-[15px] wd-text-muted max-w-[380px] mx-auto leading-relaxed">
                                Find a workspace to join, or create your own.
                            </p>
                        </>
                    )}
                </div>

                {/* Divider shimmer */}
                <div className="wd-ws-shimmer h-px w-full rounded-full" />

                {/* Content */}
                {isLoading ? (
                    <SkeletonGrid />
                ) : !hasWorkspaces ? (
                    <NoWorkspaceLandingPage
                        onCreateClick={() => setInlinePanel("create")}
                        onJoinClick={() => setInlinePanel("join")}
                        onJoinedWorkspace={() => {
                            hasAutoResolved.current = false;
                        }}
                    />
                ) : (
                    <>
                        <div
                            ref={gridRef}
                            className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 max-h-[50vh] overflow-y-auto no-scrollbar relative px-1 py-1"
                            role="listbox"
                            aria-label="Select workspace"
                        >
                            {workspaces.map((ws, i) => (
                                <WorkspaceCard
                                    key={ws.id}
                                    workspace={ws}
                                    isDefault={defaultWorkspaceId === ws.id}
                                    index={i}
                                    onSelect={() => handleSelect(ws.id)}
                                    onSetDefault={(isDefault) =>
                                        handleSetDefault(ws.id, isDefault)
                                    }
                                />
                            ))}
                        </div>

                        {/* Action Row */}
                        <div className="flex justify-center gap-2">
                            <button
                                type="button"
                                className="wd-btn-ghost inline-flex items-center gap-1.5 text-[13px]"
                                onClick={() => setInlinePanel("create")}
                            >
                                <Plus size={14} />
                                Create workspace
                            </button>
                            <span className="wd-text-muted self-center text-[11px] select-none">
                                or
                            </span>
                            <button
                                type="button"
                                className="wd-btn-ghost inline-flex items-center gap-1.5 text-[13px]"
                                onClick={() => setInlinePanel("join")}
                            >
                                <Link size={14} />
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-2xl border wd-border-subtle wd-bg-panel p-5 flex flex-col items-center gap-3 min-h-[152px]"
                    style={{ opacity: 1 - i * 0.15 }}
                >
                    <div className="w-[52px] h-[52px] rounded-xl wd-bg-elevated animate-pulse" />
                    <div className="h-3 w-24 rounded-full wd-bg-elevated animate-pulse" />
                    <div className="h-2.5 w-16 rounded-full wd-bg-elevated animate-pulse mt-auto" />
                </div>
            ))}
        </div>
    );
}

function WorkspaceCard({
    workspace,
    isDefault,
    index,
    onSelect,
    onSetDefault,
}: {
    workspace: Workspace;
    isDefault: boolean;
    index: number;
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
            className={`wd-ws-card-enter group relative rounded-2xl border p-5 flex flex-col items-center gap-2.5 min-h-[152px] cursor-pointer transition-all duration-200 active:scale-[0.97] ${
                isDefault
                    ? "border-[var(--wd-accent)] wd-bg-panel"
                    : "wd-border-subtle wd-bg-panel hover:border-[var(--wd-border-strong)] hover:-translate-y-0.5"
            }`}
            style={{
                animationDelay: `${index * 60}ms`,
                boxShadow: isDefault
                    ? `0 0 0 1px var(--wd-accent), 0 0 20px -4px rgb(var(--wd-accent-rgb) / 0.2)`
                    : undefined,
            }}
        >
            {/* Hover glow (non-default only) */}
            {!isDefault && (
                <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                        boxShadow: `0 4px 24px -4px rgb(var(--wd-accent-rgb) / 0.12), 0 0 0 1px rgb(var(--wd-border-strong-rgb) / 0.3)`,
                    }}
                />
            )}

            {/* Default Badge */}
            {isDefault && (
                <span
                    className="absolute top-2.5 right-2.5 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
                    style={{
                        backgroundColor: "rgb(var(--wd-accent-rgb) / 0.12)",
                        color: "var(--wd-accent)",
                    }}
                >
                    Default
                </span>
            )}

            {/* Avatar */}
            <div
                className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-lg font-bold wd-text-primary overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{
                    backgroundColor: "var(--wd-surface-elevated)",
                    boxShadow: `inset 0 1px 2px rgb(0 0 0 / 0.08)`,
                }}
            >
                {workspace.iconUrl ? (
                    <Image
                        src={workspace.iconUrl}
                        alt=""
                        width={52}
                        height={52}
                        unoptimized
                        className="w-full h-full object-cover"
                    />
                ) : (
                    toWorkspaceInitials(workspace.name)
                )}
            </div>

            {/* Name */}
            <span className="text-[13px] font-semibold wd-text-primary text-center w-full truncate leading-tight">
                {workspace.name}
            </span>

            {/* Owner badge */}
            {isOwner && (
                <span
                    className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                        color: "var(--wd-accent)",
                        backgroundColor: "rgb(var(--wd-accent-rgb) / 0.08)",
                    }}
                >
                    Owner
                </span>
            )}

            {/* Default Toggle */}
            <label
                className="mt-auto flex items-center gap-1.5 text-[11px] wd-text-muted cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150"
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

            {/* Hover enter hint */}
            <span
                className="absolute bottom-2 left-0 right-0 text-center text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                style={{ color: "var(--wd-accent)" }}
            >
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
        <div
            className="rounded-2xl border wd-border-subtle wd-bg-panel p-6 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
                boxShadow: `0 8px 32px -8px rgb(0 0 0 / 0.3), 0 0 0 1px rgb(var(--wd-border-subtle-rgb) / 0.5)`,
            }}
        >
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-[15px] font-semibold wd-text-primary">
                    Create Workspace
                </h3>
                <button
                    type="button"
                    className="wd-btn-ghost p-1 rounded-lg"
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide wd-text-muted mb-2">
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
                    <p className="rounded-lg border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.08)] px-3 py-2 text-xs wd-text-danger">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
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

interface InvitePreview {
    name: string;
    iconUrl: string | null;
    memberCount: number;
    inviterName: string | null;
    inviterAvatarUrl: string | null;
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
    const [resolvedCode, setResolvedCode] = useState<string | null>(null);
    const [preview, setPreview] = useState<InvitePreview | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLookup = async () => {
        const code = extractInviteCode(codeValue);
        if (!code) {
            setError("Please enter an invite code or link.");
            return;
        }

        setIsFetching(true);
        setError(null);
        setPreview(null);
        try {
            const headers: Record<string, string> = {};
            const jwt = tokenStore.getJwt();
            if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

            const res = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/invites/${encodeURIComponent(code)}/metadata`,
                { headers },
            );
            if (!res.ok) {
                setError("Failed to look up invite.");
                return;
            }
            const data = await res.json();
            if (!data.valid) {
                setError(data.reason || "This invite is no longer valid.");
                return;
            }
            setResolvedCode(code);
            setPreview({
                name: data.workspace.name,
                iconUrl: data.workspace.iconUrl,
                memberCount: data.workspace.memberCount,
                inviterName: data.inviter?.name ?? null,
                inviterAvatarUrl: data.inviter?.avatarUrl ?? null,
            });
        } catch {
            setError("Failed to look up invite.");
        } finally {
            setIsFetching(false);
        }
    };

    const handleJoin = async () => {
        const code = resolvedCode ?? extractInviteCode(codeValue);
        if (!code) return;

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

    const handleBack = () => {
        setPreview(null);
        setResolvedCode(null);
        setError(null);
    };

    return (
        <div
            className="rounded-2xl border wd-border-subtle wd-bg-panel p-6 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
                boxShadow: `0 8px 32px -8px rgb(0 0 0 / 0.3), 0 0 0 1px rgb(var(--wd-border-subtle-rgb) / 0.5)`,
            }}
        >
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-[15px] font-semibold wd-text-primary">
                    Join a Workspace
                </h3>
                <button
                    type="button"
                    className="wd-btn-ghost p-1 rounded-lg"
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Step 2: Preview */}
            {preview ? (
                <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 py-3">
                        {/* Workspace icon */}
                        <div
                            className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold wd-text-primary overflow-hidden shrink-0"
                            style={{
                                backgroundColor: "var(--wd-surface-elevated)",
                                boxShadow: `inset 0 1px 2px rgb(0 0 0 / 0.08)`,
                            }}
                        >
                            {preview.iconUrl ? (
                                <Image
                                    src={preview.iconUrl}
                                    alt=""
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span>{toWorkspaceInitials(preview.name)}</span>
                            )}
                        </div>
                        <span className="text-base font-semibold wd-text-primary text-center">
                            {preview.name}
                        </span>
                        <div className="flex items-center gap-1.5 wd-text-muted text-xs">
                            <Users size={12} />
                            <span>
                                {preview.memberCount} member{preview.memberCount !== 1 ? "s" : ""}
                            </span>
                        </div>
                        {preview.inviterName && (
                            <div className="flex items-center gap-1.5 text-xs wd-text-muted">
                                {preview.inviterAvatarUrl ? (
                                    <Image
                                        src={preview.inviterAvatarUrl}
                                        alt=""
                                        width={16}
                                        height={16}
                                        unoptimized
                                        className="w-4 h-4 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-4 h-4 rounded-full wd-bg-elevated" />
                                )}
                                <span>Invited by {preview.inviterName}</span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="rounded-lg border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.08)] px-3 py-2 text-xs wd-text-danger">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            className="wd-btn-ghost"
                            onClick={handleBack}
                            disabled={isJoining}
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            className="wd-btn-primary inline-flex items-center gap-2"
                            onClick={handleJoin}
                            disabled={isJoining}
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                `Join ${preview.name}`
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                /* Step 1: Code input */
                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wide wd-text-muted mb-2">
                            Invite Code or Link
                        </label>
                        <input
                            type="text"
                            className="wd-input"
                            placeholder="e.g. abc123 or https://..."
                            value={codeValue}
                            onChange={(e) => setCodeValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !isFetching) void handleLookup();
                            }}
                            autoFocus
                            disabled={isFetching}
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg border border-[rgba(237,66,69,0.35)] bg-[rgba(237,66,69,0.08)] px-3 py-2 text-xs wd-text-danger">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            className="wd-btn-ghost"
                            onClick={onClose}
                            disabled={isFetching}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="wd-btn-primary inline-flex items-center gap-2"
                            onClick={handleLookup}
                            disabled={isFetching || !codeValue.trim()}
                        >
                            {isFetching ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Looking up...
                                </>
                            ) : (
                                "Continue"
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceSelectorOverlay;
