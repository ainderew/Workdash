import React from "react";
import { Disc3, ListMusic } from "lucide-react";
import usePlaylistStore from "@/common/store/playlistStore";

interface PlaybackStatusProps {
  stateIcon: string;
  stateLabel: string;
  listenerCount: number;
  queueLength: number;
  showQueue: boolean;
  onToggleQueue: () => void;
}

export function PlaybackStatus({
  stateIcon,
  stateLabel,
  listenerCount,
  queueLength,
  showQueue,
  onToggleQueue,
}: PlaybackStatusProps) {
  const sidebarOpen = usePlaylistStore((s) => s.sidebarOpen);
  const toggleSidebar = usePlaylistStore((s) => s.toggleSidebar);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] wd-text-muted">
        {stateIcon} {stateLabel}
      </span>
      {listenerCount > 0 && (
        <span className="text-[10px] wd-text-muted">
          &middot; {listenerCount} listening
        </span>
      )}
      {queueLength > 0 && (
        <button
          type="button"
          onClick={onToggleQueue}
          className={`flex items-center gap-0.5 text-[10px] transition-colors rounded-sm px-0.5 -mx-0.5 cursor-pointer hover:text-[var(--wd-accent)] ${
            showQueue
              ? "text-[var(--wd-accent)]"
              : "wd-text-muted hover:wd-text-secondary"
          }`}
          title={showQueue ? "Hide queue" : "Show queue"}
        >
          &middot;
          <ListMusic size={10} strokeWidth={2} />
          <span>{queueLength} in queue</span>
        </button>
      )}
      <button
        type="button"
        onClick={toggleSidebar}
        className={`flex items-center gap-0.5 text-[10px] transition-colors rounded-sm px-0.5 -mx-0.5 cursor-pointer hover:text-[var(--wd-accent)] ${
          sidebarOpen
            ? "text-[var(--wd-accent)]"
            : "wd-text-muted hover:wd-text-secondary"
        }`}
        title={sidebarOpen ? "Hide playlists" : "Show playlists"}
      >
        &middot;
        <Disc3 size={10} strokeWidth={2} />
        <span>Playlists</span>
      </button>
    </div>
  );
}
