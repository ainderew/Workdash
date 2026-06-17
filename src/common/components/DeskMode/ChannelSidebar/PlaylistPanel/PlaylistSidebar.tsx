import React from 'react';
import { X, Music2 } from 'lucide-react';
import usePlaylistStore from '@/common/store/playlistStore';
import { PlaylistPanel } from './PlaylistPanel';

interface PlaylistSidebarProps {
  workspaceId: string | null;
}

export function PlaylistSidebar({ workspaceId }: PlaylistSidebarProps) {
  const sidebarOpen = usePlaylistStore((s) => s.sidebarOpen);
  const setSidebarOpen = usePlaylistStore((s) => s.setSidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <aside className="wd-playlist-enter absolute inset-0 z-30 flex flex-col wd-bg-panel">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between px-3.5 border-b wd-border-subtle">
        <div className="flex items-center gap-2.5">
          <Music2 size={15} className="text-[var(--wd-accent)]" />
          <h3 className="text-[13px] font-semibold wd-text-primary tracking-tight">
            Music
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close playlists"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full wd-text-muted transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <PlaylistPanel workspaceId={workspaceId} />
    </aside>
  );
}
