import React, { useEffect, useRef, useState } from "react";
import {
    Ban,
    Check,
    ChevronRight,
    LogOut,
    Shield,
    UserRound,
    UserRoundX,
    AlertTriangle,
} from "lucide-react";
import type { WorkspaceMember, WorkspaceRole } from "@/communication/chatV2/_types";
import { getDisplayName } from "@/common/utils/displayName";

function colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

interface WorkspaceMemberContextMenuProps {
    member: WorkspaceMember;
    roles: WorkspaceRole[];
    x: number;
    y: number;
    isViewer: boolean;
    canManageMembers: boolean;
    canBanMembers: boolean;
    canManageRoles: boolean;
    onKick: (userId: number) => void;
    onBan: (userId: number, reason?: string) => void;
    onAssignRole: (userId: number, roleId: string) => void;
    onRemoveRole: (userId: number, roleId: string) => void;
    onLeave: () => void;
    onViewProfile?: (userId: number) => void;
    onClose: () => void;
}

const MENU_WIDTH = 220;
const MENU_HEIGHT = 280;

function WorkspaceMemberContextMenu({
    member,
    roles,
    x,
    y,
    isViewer,
    canManageMembers,
    canBanMembers,
    canManageRoles,
    onKick,
    onBan,
    onAssignRole,
    onRemoveRole,
    onLeave,
    onViewProfile,
    onClose,
}: WorkspaceMemberContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [roleSubMenuOpen, setRoleSubMenuOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<"kick" | "ban" | null>(null);
    const [banReason, setBanReason] = useState("");
    const confirmTimerRef = useRef<number | null>(null);

    const clampedX = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
    const clampedY = Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 8));

    const displayName = getDisplayName(member.user, `User ${member.userId}`);
    const nonEveryoneRoles = roles.filter((r) => !r.isEveryone).sort((a, b) => b.position - a.position);

    useEffect(() => {
        const close = () => onClose();
        const onMouseDown = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                close();
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
            if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
        };
    }, [onClose]);

    const startConfirm = (action: "kick" | "ban") => {
        setConfirmAction(action);
        if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = window.setTimeout(() => {
            setConfirmAction(null);
            setBanReason("");
        }, 4000);
    };

    const executeConfirm = () => {
        if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
        if (confirmAction === "kick") {
            onKick(member.userId);
        } else if (confirmAction === "ban") {
            onBan(member.userId, banReason.trim() || undefined);
        }
        onClose();
    };

    const roleSubMenuLeft = clampedX > window.innerWidth / 2;

    return (
        <div
            ref={menuRef}
            className="fixed z-[300] rounded-lg border wd-border-strong wd-bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-1"
            style={{ left: clampedX, top: clampedY, width: MENU_WIDTH }}
        >
            <div className="px-3 py-2 mb-1 border-b border-[var(--wd-border-subtle)]">
                <p className="text-xs font-semibold wd-text-primary truncate">{displayName}</p>
                <p className="text-[11px] wd-text-muted">ID {member.userId}</p>
            </div>

            {onViewProfile && (
                <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
                    onClick={() => { onViewProfile(member.userId); onClose(); }}
                >
                    <UserRound size={14} className="wd-text-secondary" />
                    <span>View Profile</span>
                </button>
            )}

            {canManageRoles && !isViewer && nonEveryoneRoles.length > 0 && (
                <div
                    className="relative"
                    onMouseEnter={() => setRoleSubMenuOpen(true)}
                    onMouseLeave={() => setRoleSubMenuOpen(false)}
                >
                    <button
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
                    >
                        <Shield size={14} className="wd-text-secondary" />
                        <span className="flex-1">Manage Roles</span>
                        <ChevronRight size={12} className="wd-text-muted" />
                    </button>

                    {roleSubMenuOpen && (
                        <div
                            className={`absolute top-0 w-[200px] rounded-lg border wd-border-strong wd-bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-1 z-[301] ${
                                roleSubMenuLeft ? "right-full mr-1" : "left-full ml-1"
                            }`}
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted px-2.5 py-1">
                                Roles
                            </p>
                            {nonEveryoneRoles.map((role) => {
                                const isAssigned = member.roles?.some((r) => r.id === role.id);
                                return (
                                    <button
                                        key={role.id}
                                        type="button"
                                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
                                        onClick={() => {
                                            if (isAssigned) {
                                                onRemoveRole(member.userId, role.id);
                                            } else {
                                                onAssignRole(member.userId, role.id);
                                            }
                                        }}
                                    >
                                        <span
                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: role.color ? colorToHex(role.color) : "#99aab5" }}
                                        />
                                        <span className="flex-1 truncate">{role.name}</span>
                                        {isAssigned && <Check size={12} className="wd-text-accent shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {(canManageMembers || canBanMembers) && !isViewer && (
                <div className="my-1 h-px bg-[var(--wd-surface-elevated)] mx-2" />
            )}

            {canManageMembers && !isViewer && (
                confirmAction === "kick" ? (
                    <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5">
                        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                        <span className="text-[13px] wd-text-danger flex-1">Confirm Kick?</span>
                        <button
                            type="button"
                            onClick={executeConfirm}
                            className="wd-btn-danger text-[11px] px-2 py-0.5"
                        >
                            Yes
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-danger transition-colors hover:bg-[rgba(var(--wd-danger-rgb),0.12)]"
                        onClick={() => startConfirm("kick")}
                    >
                        <UserRoundX size={14} />
                        <span>Kick from Workspace</span>
                    </button>
                )
            )}

            {canBanMembers && !isViewer && (
                confirmAction === "ban" ? (
                    <div className="rounded-md px-2.5 py-1.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                            <span className="text-[13px] wd-text-danger flex-1">Confirm Ban?</span>
                            <button
                                type="button"
                                onClick={executeConfirm}
                                className="wd-btn-danger text-[11px] px-2 py-0.5"
                            >
                                Yes
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") executeConfirm(); }}
                            className="h-7 w-full text-xs rounded px-2 wd-bg-elevated border border-[var(--wd-border-subtle)] wd-text-primary outline-none"
                            autoFocus
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-red-400 transition-colors hover:bg-red-950/40"
                        onClick={() => startConfirm("ban")}
                    >
                        <Ban size={14} />
                        <span>Ban from Workspace</span>
                    </button>
                )
            )}

            {isViewer && (
                <>
                    <div className="my-1 h-px bg-[var(--wd-surface-elevated)] mx-2" />
                    <button
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-danger transition-colors hover:bg-[rgba(var(--wd-danger-rgb),0.12)]"
                        onClick={() => { onLeave(); onClose(); }}
                    >
                        <LogOut size={14} />
                        <span>Leave Workspace</span>
                    </button>
                </>
            )}
        </div>
    );
}

export default WorkspaceMemberContextMenu;
