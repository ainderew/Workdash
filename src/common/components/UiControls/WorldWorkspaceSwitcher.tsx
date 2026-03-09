import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronDown, Plus, MessageSquareMore } from "lucide-react";
import useChatV2Store from "@/common/store/chatV2Store";
import useWorkspaceStore from "@/common/store/workspaceStore";
import useUiStore from "@/common/store/uiStore";
import { EventBus } from "@/game/EventBus";
import { toWorkspaceInitials } from "@/common/utils/workspaceDisplay";

interface WorldWorkspaceSwitcherProps {
    onOpenChatDrawer?: () => void;
}

export function WorldWorkspaceSwitcher({
    onOpenChatDrawer,
}: WorldWorkspaceSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<HTMLButtonElement>(null);

    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const fetchMyWorkspaces = useWorkspaceStore((s) => s.fetchMyWorkspaces);
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const setSelectedWorkspaceId = useChatV2Store(
        (s) => s.setSelectedWorkspaceId,
    );

    const activeWorkspace = workspaces.find(
        (ws) => ws.id === selectedWorkspaceId,
    );
    const hasUnreads = workspaces.some(
        (ws) => ws.id !== selectedWorkspaceId && (ws as { unreadCount?: number }).unreadCount,
    );

    useEffect(() => {
        if (workspaces.length === 0) {
            void fetchMyWorkspaces();
        }
    }, [workspaces.length, fetchMyWorkspaces]);

    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return;

        const onClickOutside = (e: MouseEvent) => {
            if (
                panelRef.current &&
                !panelRef.current.contains(e.target as Node) &&
                pillRef.current &&
                !pillRef.current.contains(e.target as Node)
            ) {
                close();
            }
        };
        const onEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };

        document.addEventListener("mousedown", onClickOutside);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("mousedown", onClickOutside);
            document.removeEventListener("keydown", onEscape);
        };
    }, [isOpen, close]);

    const handleSwitch = (workspaceId: string) => {
        if (workspaceId === selectedWorkspaceId) {
            close();
            return;
        }

        setSelectedWorkspaceId(workspaceId);
        close();

        EventBus.emit("workspace-switch", { workspaceId });
    };

    const handleDmClick = () => {
        close();
        onOpenChatDrawer?.();
    };

    return (
        <div className="relative">
            <button
                ref={pillRef}
                onClick={() => setIsOpen((prev) => !prev)}
                className={`flex items-center gap-2 h-9 px-3 rounded-lg transition-all duration-150 cursor-pointer ${
                    isOpen
                        ? "bg-[var(--wd-accent-soft)] text-[var(--wd-accent)]"
                        : "wd-bg-elevated wd-text-primary hover:bg-[var(--wd-surface-base)]"
                }`}
                title={activeWorkspace?.name || "Select Workspace"}
            >
                {activeWorkspace ? (
                    <>
                        <span className="w-7 h-7 rounded-lg wd-bg-elevated flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                            {activeWorkspace.iconUrl ? (
                                <Image
                                    src={activeWorkspace.iconUrl}
                                    alt=""
                                    width={28}
                                    height={28}
                                    unoptimized
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                toWorkspaceInitials(activeWorkspace.name)
                            )}
                        </span>
                        <span className="max-w-[100px] truncate text-sm font-medium hidden md:inline">
                            {activeWorkspace.name}
                        </span>
                    </>
                ) : (
                    <span className="text-sm font-medium">Workspace</span>
                )}
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                />
                {hasUnreads && !isOpen && (
                    <span className="absolute top-0 right-0 w-[6px] h-[6px] rounded-full bg-[var(--wd-danger)]" />
                )}
            </button>

            {isOpen && (
                <div
                    ref={panelRef}
                    className="absolute bottom-full mb-2 right-0 w-60 max-h-[400px] overflow-y-auto rounded-xl wd-bg-panel border border-[var(--wd-border-subtle)] shadow-[0_8px_24px_rgba(0,0,0,0.45)] z-50"
                >
                    <div className="px-3 pt-3 pb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted">
                            My Workspaces
                        </span>
                    </div>

                    <div className="px-1.5 pb-1.5">
                        {workspaces.map((ws) => {
                            const isActive = ws.id === selectedWorkspaceId;
                            const unread = (ws as { unreadCount?: number }).unreadCount || 0;

                            return (
                                <button
                                    key={ws.id}
                                    onClick={() => handleSwitch(ws.id)}
                                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
                                        isActive
                                            ? "bg-[var(--wd-accent-soft)]"
                                            : "hover:bg-[var(--wd-surface-elevated)]"
                                    }`}
                                >
                                    {isActive && (
                                        <span className="w-[3px] h-6 rounded-full bg-[var(--wd-accent)] shrink-0" />
                                    )}
                                    <span className="w-8 h-8 rounded-lg wd-bg-elevated flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                        {ws.iconUrl ? (
                                            <Image
                                                src={ws.iconUrl}
                                                alt=""
                                                width={32}
                                                height={32}
                                                unoptimized
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            toWorkspaceInitials(ws.name)
                                        )}
                                    </span>
                                    <span
                                        className={`flex-1 truncate text-sm ${
                                            isActive
                                                ? "font-semibold text-[var(--wd-accent)]"
                                                : "wd-text-primary"
                                        }`}
                                    >
                                        {ws.name}
                                    </span>
                                    {isActive && (
                                        <span className="text-[var(--wd-accent)] text-xs">
                                            ✓
                                        </span>
                                    )}
                                    {!isActive && unread > 0 && (
                                        <span className="h-5 min-w-5 px-1 rounded-full bg-[var(--wd-danger)] text-white text-[10px] font-bold inline-flex items-center justify-center">
                                            {unread > 99 ? "99+" : unread}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="border-t border-[var(--wd-border-subtle)] px-1.5 py-1.5">
                        <button
                            onClick={() => {
                                close();
                                useUiStore.getState().toggleInteractionMode();
                            }}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left wd-text-secondary hover:bg-[var(--wd-surface-elevated)] transition-colors"
                        >
                            <Plus size={16} />
                            <span className="text-sm">Create Workspace</span>
                        </button>
                    </div>

                    <div className="border-t border-[var(--wd-border-subtle)] px-1.5 py-1.5">
                        <button
                            onClick={handleDmClick}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left wd-text-secondary hover:bg-[var(--wd-surface-elevated)] transition-colors"
                        >
                            <MessageSquareMore size={16} />
                            <span className="text-sm">Direct Messages</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
