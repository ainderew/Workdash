import React from "react";
import { Disc3, ListMusic, Users } from "lucide-react";
import usePlaylistStore from "@/common/store/playlistStore";

interface PlaybackStatusProps {
  listenerCount: number;
  queueLength: number;
  showQueue: boolean;
  onToggleQueue: () => void;
  isListening: boolean;
  onToggleListen: () => void;
}

export function PlaybackStatus({
  listenerCount,
  queueLength,
  showQueue,
  onToggleQueue,
  isListening,
  onToggleListen,
}: PlaybackStatusProps) {
  const sidebarOpen = usePlaylistStore((s) => s.sidebarOpen);
  const toggleSidebar = usePlaylistStore((s) => s.toggleSidebar);

  return (
    <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap text-[10px]">
      {listenerCount > 0 && (
        <span
          className="flex items-center gap-0.5 tabular-nums wd-text-muted"
          title={`${listenerCount} listening`}
        >
          <Users size={11} strokeWidth={2} />
          {listenerCount}
        </span>
      )}

      {queueLength > 0 && (
        <button
          type="button"
          onClick={onToggleQueue}
          title={showQueue ? "Hide queue" : "Show queue"}
          className={`flex items-center gap-0.5 tabular-nums transition-colors cursor-pointer hover:text-[var(--wd-accent)] ${
            showQueue ? "text-[var(--wd-accent)]" : "wd-text-muted"
          }`}
        >
          <ListMusic size={11} strokeWidth={2} />
          {queueLength}
        </button>
      )}

      <button
        type="button"
        onClick={toggleSidebar}
        title="Playlists"
        className={`transition-colors cursor-pointer hover:text-[var(--wd-accent)] ${
          sidebarOpen ? "text-[var(--wd-accent)]" : "wd-text-muted"
        }`}
      >
        <Disc3 size={12} strokeWidth={2} />
      </button>

      <span className="flex-1" />

      {/* Listen / leave the music session (you auto-join on entering) */}
      {isListening ? (
        <button
          type="button"
          onClick={onToggleListen}
          title="Stop listening to the music"
          className="rounded-md border border-[var(--wd-border-strong)] px-2 py-0.5 font-medium wd-text-muted transition-colors cursor-pointer hover:wd-text-primary"
        >
          Leave
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggleListen}
          title="Listen to the music"
          className="rounded-md bg-[var(--wd-accent)] px-2 py-0.5 font-semibold text-white cursor-pointer"
        >
          Listen
        </button>
      )}
    </div>
  );
}
