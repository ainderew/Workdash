import React from "react";
import { MessageSquareMore, Building2 } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type GuildRailWorkspace = {
    id: string;
    name: string;
    unreadCount: number;
};

interface GuildRailProps {
    workspaces: GuildRailWorkspace[];
    railView: "server" | "dm";
    selectedWorkspaceId: string | null;
    dmUnreadCount: number;
    onSelectWorkspace: (workspaceId: string) => void;
    onSelectDm: () => void;
}

const toInitials = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "W";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

function RailButton({
    active,
    label,
    unreadCount,
    indicatorMode = "default",
    onClick,
    children,
}: {
    active: boolean;
    label: string;
    unreadCount?: number;
    indicatorMode?: "default" | "dot-to-bar";
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    className="group relative w-11 h-11 rounded-lg wd-bg-elevated wd-text-primary transition-all duration-200 hover:bg-[var(--wd-accent-soft)] hover:wd-text-accent"
                    aria-label={label}
                >
                    <span
                        className={`absolute -left-2 top-1/2 w-1 -translate-y-1/2 rounded-full bg-[var(--wd-accent)] transition-[height,opacity] duration-150 ease-linear ${
                            indicatorMode === "dot-to-bar"
                                ? active
                                    ? "h-8 opacity-100"
                                    : "h-1 opacity-100 group-hover:h-8"
                                : active
                                  ? "h-8 opacity-100"
                                  : "h-0 opacity-0 group-hover:h-8 group-hover:opacity-100"
                        }`}
                    />
                    <span className="inline-flex h-full w-full items-center justify-center">
                        {children}
                    </span>
                    {typeof unreadCount === "number" && unreadCount > 0 ? (
                        <span className="absolute -bottom-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[var(--wd-danger)] text-white text-[10px] font-bold inline-flex items-center justify-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    ) : null}
                </button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
                <span>{label}</span>
            </TooltipContent>
        </Tooltip>
    );
}

function GuildRail({
    workspaces,
    railView,
    selectedWorkspaceId,
    dmUnreadCount,
    onSelectWorkspace,
    onSelectDm,
}: GuildRailProps) {
    const primaryWorkspace = workspaces[0];

    return (
        <aside className="w-16 wd-bg-app p-3 flex flex-col items-center gap-3">
            {primaryWorkspace ? (
                <RailButton
                    active={
                        railView === "server" &&
                        selectedWorkspaceId === primaryWorkspace.id
                    }
                    label={primaryWorkspace.name}
                    unreadCount={primaryWorkspace.unreadCount}
                    onClick={() => onSelectWorkspace(primaryWorkspace.id)}
                >
                    <span className="text-sm font-bold">
                        {toInitials(primaryWorkspace.name)}
                    </span>
                </RailButton>
            ) : null}

            {workspaces.slice(1).map((workspace) => (
                <RailButton
                    key={workspace.id}
                    active={
                        railView === "server" &&
                        selectedWorkspaceId === workspace.id
                    }
                    label={workspace.name}
                    unreadCount={workspace.unreadCount}
                    onClick={() => onSelectWorkspace(workspace.id)}
                >
                    <Building2 size={18} />
                </RailButton>
            ))}

            <div className="h-px w-10 bg-[var(--wd-border-subtle)] my-1" />

            <RailButton
                active={railView === "dm"}
                label="Direct Messages"
                unreadCount={dmUnreadCount}
                indicatorMode="dot-to-bar"
                onClick={onSelectDm}
            >
                <MessageSquareMore size={18} />
            </RailButton>
        </aside>
    );
}

export default GuildRail;
