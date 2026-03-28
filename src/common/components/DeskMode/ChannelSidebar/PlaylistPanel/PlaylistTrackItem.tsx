import React from 'react';
import { GripVertical, Play, Pause, ListPlus, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlaylistTrackEntry } from '@/common/store/playlistStore';

interface PlaylistTrackItemProps {
  entry: PlaylistTrackEntry;
  sortableId: string;
  onRemove: () => void;
  onPlayTrack: (trackId: string) => void;
  onTogglePlayback: () => void;
  onAddToQueue: (trackId: string) => void;
  canRemove: boolean;
  index: number;
  isPlaying?: boolean;
  isPaused?: boolean;
  insertIndicator?: 'above' | 'below' | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PlaylistTrackItem({
  entry,
  sortableId,
  onRemove,
  onPlayTrack,
  onTogglePlayback,
  onAddToQueue,
  canRemove,
  index,
  isPlaying,
  isPaused,
  insertIndicator,
}: PlaylistTrackItemProps) {
  const { track } = entry;
  const isActive = isPlaying || isPaused;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${Math.min(index * 30, 300)}ms`,
  };

  const indicatorLine = (
    <div className="mx-3 h-0.5 rounded-full bg-[var(--wd-accent)]" />
  );

  const handlePlayPause = () => {
    if (isPlaying) {
      onTogglePlayback();
    } else if (isPaused) {
      onTogglePlayback();
    } else {
      onPlayTrack(track.id);
    }
  };

  return (
    <>
      {insertIndicator === 'above' && indicatorLine}
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`wd-playlist-track-in group flex items-center gap-2.5 px-3 py-2 cursor-grab active:cursor-grabbing ${
          isDragging
            ? 'opacity-30'
            : 'hover:bg-[var(--wd-surface-base)]'
        } ${index > 0 && !isDragging ? 'border-t border-[var(--wd-border-subtle)]/30' : ''}`}
      >
        {/* Track number / play-pause button */}
        <div className="shrink-0 w-7 flex items-center justify-center">
          {isActive ? (
            /* Currently playing/paused — always show play/pause icon */
            <button
              type="button"
              aria-label={isPlaying ? `Pause ${track.title}` : `Resume ${track.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handlePlayPause}
              className="flex items-center justify-center text-[var(--wd-accent)] transition-colors"
            >
              {isPlaying ? (
                <Pause size={13} fill="currentColor" />
              ) : (
                <Play size={13} fill="currentColor" />
              )}
            </button>
          ) : (
            <>
              {/* Number — visible by default, hidden on hover */}
              <span className="text-[11px] tabular-nums wd-text-muted font-medium group-hover:hidden">
                {index + 1}
              </span>
              {/* Play button — visible on hover */}
              <button
                type="button"
                aria-label={`Play ${track.title}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handlePlayPause}
                className="hidden group-hover:flex items-center justify-center text-[var(--wd-accent)] transition-colors"
              >
                <Play size={13} fill="currentColor" />
              </button>
            </>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium truncate leading-snug ${isActive ? 'text-[var(--wd-accent)]' : 'wd-text-primary'}`}>
            {track.title}
          </p>
          {track.artist && (
            <p className="text-[11px] wd-text-muted truncate leading-snug">
              {track.artist}
            </p>
          )}
        </div>

        {/* Duration — visible when not hovered */}
        <span className="shrink-0 text-[11px] tabular-nums wd-text-muted group-hover:hidden">
          {formatDuration(track.durationSeconds)}
        </span>

        {/* Actions — visible on hover */}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <GripVertical size={13} className="wd-text-muted" />
          <button
            type="button"
            aria-label={`Add ${track.title} to queue`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onAddToQueue(track.id)}
            className="p-1 rounded-md wd-text-muted hover:text-[var(--wd-accent)] transition-colors"
          >
            <ListPlus size={13} />
          </button>
          {canRemove && (
            <button
              type="button"
              aria-label={`Remove ${track.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onRemove}
              className="p-1 rounded-md wd-text-muted hover:text-[var(--wd-danger)] transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      {insertIndicator === 'below' && indicatorLine}
    </>
  );
}
