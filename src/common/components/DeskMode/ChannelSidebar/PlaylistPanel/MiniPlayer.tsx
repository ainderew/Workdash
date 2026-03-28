import React from 'react';
import Image from 'next/image';
import { Play, Pause, SkipForward } from 'lucide-react';
import { VolumeButton } from '@/common/components/DeskMode/NowPlayingBar/VolumeButton';
import { useTrackElapsed } from '@/common/components/DeskMode/NowPlayingBar/useTrackElapsed';
import type { MusicSessionState } from '@/common/store/musicStore';

interface MiniPlayerProps {
  session: MusicSessionState;
  workspaceId: string;
  hue: number;
  coverImageUrl?: string | null;
  hasQueue: boolean;
  onTogglePlayback: () => void;
  onSkip: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MiniPlayer({
  session,
  workspaceId,
  hue,
  coverImageUrl,
  hasQueue,
  onTogglePlayback,
  onSkip,
}: MiniPlayerProps) {
  const isPlaying = session.state === 'playing';
  const track = session.currentTrack;
  const elapsed = useTrackElapsed(session, workspaceId);
  const duration = track?.duration ?? 0;
  const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 0;

  return (
    <div className="shrink-0 px-2 pb-2 wd-miniplayer-enter">
      <div
        className="relative rounded-2xl border border-[var(--wd-border-subtle)]/60 shadow-lg"
        style={{
          background: `color-mix(in oklch, oklch(0.65 0.06 ${hue}) 6%, var(--wd-surface-elevated))`,
        }}
      >
        {/* Progress bar */}
        <div className="h-[2px] bg-[var(--wd-surface-base)]/30 overflow-hidden rounded-t-2xl">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: `oklch(0.65 0.18 ${hue})`,
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* Player row */}
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          {/* Artwork */}
          <div className="relative shrink-0 h-10 w-10 rounded-[10px] overflow-hidden shadow-sm">
            {coverImageUrl ? (
              <>
                <Image
                  src={coverImageUrl}
                  alt="Now playing"
                  fill
                  unoptimized
                  className="object-cover"
                />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-1.5 bg-black/30">
                    <span className="wd-eq-bar wd-eq-bar-1" />
                    <span className="wd-eq-bar wd-eq-bar-2" />
                    <span className="wd-eq-bar wd-eq-bar-3" />
                  </div>
                )}
              </>
            ) : (
              <div
                className="h-full w-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, oklch(0.65 0.18 ${hue}), oklch(0.45 0.14 ${hue + 50}))`,
                }}
              >
                {isPlaying ? (
                  <div className="flex items-end gap-[2px] h-3.5">
                    <span className="wd-eq-bar wd-eq-bar-1" />
                    <span className="wd-eq-bar wd-eq-bar-2" />
                    <span className="wd-eq-bar wd-eq-bar-3" />
                  </div>
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-white/50" />
                )}
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold wd-text-primary truncate leading-tight">
              {track?.title ?? 'Unknown'}
            </p>
            <p className="text-[10px] wd-text-muted truncate leading-tight mt-0.5">
              {isPlaying ? 'Now Playing' : 'Paused'}
              {duration > 0 && (
                <span className="tabular-nums">
                  {' \u00b7 '}{formatTime(elapsed)}/{formatTime(duration)}
                </span>
              )}
            </p>
          </div>

          {/* Transport controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onTogglePlayback}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--wd-text-primary)] text-[var(--wd-surface-base)] transition-all active:scale-90 hover:opacity-85"
              title={isPlaying ? 'Pause' : 'Resume'}
            >
              {isPlaying ? (
                <Pause size={13} fill="currentColor" />
              ) : (
                <Play size={13} fill="currentColor" className="ml-px" />
              )}
            </button>

            <button
              type="button"
              disabled={!hasQueue}
              onClick={onSkip}
              className={`p-1.5 rounded-full transition-colors ${
                hasQueue
                  ? 'wd-text-muted hover:wd-text-primary cursor-pointer'
                  : 'wd-text-muted opacity-30 cursor-not-allowed'
              }`}
              title={hasQueue ? 'Skip' : 'No next track'}
            >
              <SkipForward size={13} />
            </button>

            <VolumeButton />
          </div>
        </div>
      </div>
    </div>
  );
}
