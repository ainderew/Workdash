import React from 'react';
import Image from 'next/image';
import { Lock, Users } from 'lucide-react';
import type { PlaylistInfo } from '@/common/store/playlistStore';

interface PlaylistItemProps {
  playlist: PlaylistInfo;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Derives a consistent hue from a playlist name for the gradient thumbnail.
 */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function PlaylistItem({ playlist, isActive, onClick }: PlaylistItemProps) {
  const isPersonal = playlist.type === 'PERSONAL';
  const hue = nameToHue(playlist.name);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer transition-colors duration-150 ${
        isActive
          ? 'bg-[var(--wd-accent-soft)]'
          : 'hover:bg-[var(--wd-surface-base)]'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 h-10 w-10 rounded-lg overflow-hidden shadow-sm">
        {playlist.coverImageUrl ? (
          <Image
            src={playlist.coverImageUrl}
            alt={playlist.name}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div
            className="h-full w-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, oklch(0.65 0.18 ${hue}), oklch(0.55 0.15 ${hue + 40}))`,
            }}
          >
            {isPersonal ? (
              <Lock size={14} className="text-white/80" />
            ) : (
              <Users size={14} className="text-white/80" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium wd-text-primary truncate block leading-snug">
          {playlist.name}
        </span>
        <span className="text-[11px] wd-text-muted leading-snug">
          {isPersonal ? 'Personal' : 'Shared'}
          <span className="mx-1 opacity-40">&middot;</span>
          {playlist.trackCount} {playlist.trackCount === 1 ? 'song' : 'songs'}
        </span>
      </div>
    </button>
  );
}
