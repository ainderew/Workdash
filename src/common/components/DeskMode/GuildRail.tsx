import React, { useRef, useState } from "react";
import { MessageSquareMore, ImagePlus, Plus } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type GuildRailWorkspace = {
    id: string;
    name: string;
    unreadCount: number;
    imageUrl?: string | null;
};

interface GuildRailProps {
    workspaces: GuildRailWorkspace[];
    railView: "server" | "dm";
    selectedWorkspaceId: string | null;
    dmUnreadCount: number;
    onSelectWorkspace: (workspaceId: string) => void;
    onSelectDm: () => void;
    onChangeServerImage?: (workspaceId: string) => void;
    onCreateWorkspace?: () => void;
}

const toInitials = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "W";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const CONTEXT_MENU_WIDTH = 180;
const CONTEXT_MENU_HEIGHT = 40;

function RailButton({
    active,
    label,
    unreadCount,
    indicatorMode = "default",
    backgroundImageUrl,
    onClick,
    onContextMenu,
    children,
}: {
    active: boolean;
    label: string;
    unreadCount?: number;
    indicatorMode?: "default" | "dot-to-bar";
    backgroundImageUrl?: string | null;
    onClick: () => void;
    onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    onContextMenu={onContextMenu}
                    className="group relative w-11 h-11 rounded-xl wd-bg-elevated wd-text-primary transition-all duration-200 hover:bg-[var(--wd-accent-soft)] hover:wd-text-accent bg-cover bg-center"
                    style={
                        backgroundImageUrl
                            ? { backgroundImage: `url(${backgroundImageUrl})` }
                            : undefined
                    }
                    aria-label={label}
                >
                    <span
                        className={`absolute -left-[14px] top-1/2 w-1 -translate-y-1/2 rounded-full bg-[var(--wd-accent)] transition-[height,opacity] duration-150 ease-linear ${
                            indicatorMode === "dot-to-bar"
                                ? active
                                    ? "h-8 opacity-100"
                                    : "h-1 opacity-100 group-hover:h-8"
                                : active
                                  ? "h-8 opacity-100"
                                  : "h-0 opacity-0 group-hover:h-8 group-hover:opacity-100"
                        }`}
                    />
                    <span className="inline-flex h-full w-full items-center justify-center overflow-hidden rounded-lg">
                        {children}
                    </span>
                    {typeof unreadCount === "number" && unreadCount > 0 ? (
                        <span className="absolute -bottom-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[var(--wd-danger)] text-white text-[10px] font-bold inline-flex items-center justify-center z-10">
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
    onChangeServerImage,
    onCreateWorkspace,
}: GuildRailProps) {
    const primaryWorkspace = workspaces[0];
    const [contextMenu, setContextMenu] = useState<{
        workspaceId: string;
        x: number;
        y: number;
    } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = (
        event: React.MouseEvent<HTMLButtonElement>,
        workspaceId: string,
    ) => {
        if (!onChangeServerImage) return;
        event.preventDefault();
        const maxX = Math.max(8, window.innerWidth - CONTEXT_MENU_WIDTH - 8);
        const maxY = Math.max(8, window.innerHeight - CONTEXT_MENU_HEIGHT - 8);
        setContextMenu({
            workspaceId,
            x: Math.min(event.clientX, maxX),
            y: Math.min(event.clientY, maxY),
        });
    };

    React.useEffect(() => {
        if (!contextMenu) return undefined;

        const close = () => setContextMenu(null);
        const onMouseDown = (event: MouseEvent) => {
            if (
                contextMenuRef.current &&
                !contextMenuRef.current.contains(event.target as Node)
            ) {
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
        };
    }, [contextMenu]);

    const renderWorkspaceButton = (workspace: GuildRailWorkspace) => {
        return (
            <RailButton
                active={
                    railView === "server" &&
                    selectedWorkspaceId === workspace.id
                }
                label={workspace.name}
                unreadCount={workspace.unreadCount}
                backgroundImageUrl={workspace.imageUrl}
                onClick={() => onSelectWorkspace(workspace.id)}
                onContextMenu={(event) =>
                    handleContextMenu(event, workspace.id)
                }
            >
                {!workspace.imageUrl && (
                    <span className="text-sm font-bold">
                        {toInitials(workspace.name)}
                    </span>
                )}
            </RailButton>
        );
    };

    return (
        <aside className="w-[72px] wd-bg-app py-3 flex flex-col items-center gap-3">
            {primaryWorkspace ? renderWorkspaceButton(primaryWorkspace) : null}

            {workspaces.slice(1).map((workspace) => (
                <React.Fragment key={workspace.id}>
                    {renderWorkspaceButton(workspace)}
                </React.Fragment>
            ))}

            {onCreateWorkspace && (
                <RailButton
                    active={false}
                    label="Create Workspace"
                    onClick={onCreateWorkspace}
                >
                    <Plus size={18} />
                </RailButton>
            )}

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

            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[200] rounded-lg border wd-border-strong wd-bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-1"
                    style={{
                        left: contextMenu.x,
                        top: contextMenu.y,
                        width: CONTEXT_MENU_WIDTH,
                    }}
                >
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
                        onClick={() => {
                            onChangeServerImage?.(contextMenu.workspaceId);
                            setContextMenu(null);
                        }}
                    >
                        <ImagePlus size={15} className="wd-text-secondary" />
                        <span>Change Image</span>
                    </button>
                </div>
            )}
        </aside>
    );
}

export default GuildRail;
