import React from 'react';
import Image from 'next/image';
import {
  Bell,
  ChevronDown,
  FolderPlus,
  LogOut,
  PanelLeftClose,
  Plus,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface ServerHeaderProps {
  normalizedServerName: string;
  serverImageUrl?: string | null;
  isCreatingRoom: boolean;
  isCreatingCategory: boolean;
  isServerActionsMenuOpen: boolean;
  onToggleServerMenu: () => void;
  onDismissMenus: () => void;
  onCreateRoom: () => void;
  onCreateCategory: () => void;
  onOpenMembers?: () => void;
  onInvitePeople?: () => void;
  onOpenServerSettings: () => void;
  onCollapseSidebar?: () => void;
}

function ServerHeader({
  normalizedServerName,
  serverImageUrl,
  isCreatingRoom,
  isCreatingCategory,
  isServerActionsMenuOpen,
  onToggleServerMenu,
  onDismissMenus,
  onCreateRoom,
  onCreateCategory,
  onOpenMembers,
  onInvitePeople,
  onOpenServerSettings,
  onCollapseSidebar,
}: ServerHeaderProps) {
  return (
    <div className="px-4 h-14 border-b wd-border-subtle flex items-center justify-between gap-2 relative">
      <button
        type="button"
        data-server-actions-trigger="true"
        disabled={isCreatingCategory || isCreatingRoom}
        onClick={onToggleServerMenu}
        className="inline-flex min-w-0 max-w-[85%] items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
      >
        {serverImageUrl && (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded">
            <Image
              src={serverImageUrl}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="h-full w-full object-cover"
            />
          </span>
        )}
        <span className="truncate text-sm font-semibold">
          {normalizedServerName}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform ${
            isServerActionsMenuOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onCreateRoom}
          disabled={isCreatingRoom}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:text-[var(--wd-text-primary)] disabled:opacity-50"
          aria-label="Create room"
        >
          <UserPlus size={17} />
        </button>
        {onCollapseSidebar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onCollapseSidebar}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md wd-text-secondary transition-colors hover:bg-[var(--wd-surface-elevated)] hover:text-[var(--wd-text-primary)]"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Collapse sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      {isServerActionsMenuOpen && (
        <div
          data-server-actions-menu="true"
          className="absolute left-4 right-4 top-[calc(100%+10px)] z-[130] rounded-2xl border wd-border-strong wd-bg-panel shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2"
        >
          <div className="space-y-1 py-1">
            <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm wd-text-primary">
              <span>Notification Settings</span>
              <Bell size={17} className="wd-text-secondary" />
            </div>
          </div>

          <div className="my-1 h-px bg-[var(--wd-border-subtle)]" />

          <div className="space-y-1 py-1">
            <button
              type="button"
              onClick={() => {
                onCreateCategory();
                onDismissMenus();
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
            >
              <span>Create Category</span>
              <FolderPlus size={17} className="wd-text-secondary" />
            </button>
            <button
              type="button"
              onClick={() => {
                onCreateRoom();
                onDismissMenus();
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
            >
              <span>Create Room</span>
              <Plus size={17} className="wd-text-secondary" />
            </button>
          </div>

          <div className="my-1 h-px bg-[var(--wd-border-subtle)]" />

          <div className="space-y-1 py-1">
            {onInvitePeople && (
              <button
                type="button"
                onClick={() => {
                  onInvitePeople();
                  onDismissMenus();
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
              >
                <span>Invite People</span>
                <UserPlus size={17} className="wd-text-secondary" />
              </button>
            )}
            {onOpenMembers && (
              <button
                type="button"
                onClick={() => {
                  onOpenMembers();
                  onDismissMenus();
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
              >
                <span>Members</span>
                <Users size={17} className="wd-text-secondary" />
              </button>
            )}
          </div>

          <div className="my-1 h-px bg-[var(--wd-border-subtle)]" />

          <div className="space-y-1 py-1">
            <button
              type="button"
              onClick={() => {
                onOpenServerSettings();
                onDismissMenus();
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
            >
              <span>Server Settings</span>
              <Settings size={17} className="wd-text-secondary" />
            </button>
            <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[#ff7b7b]">
              <span>Leave Server</span>
              <LogOut size={17} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServerHeader;
