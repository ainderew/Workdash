import React from 'react';
import { Play, Loader2 } from 'lucide-react';
import type { SoundboardSound } from './_types';

interface SoundboardSoundCardProps {
  sound: SoundboardSound;
  onPlay: (sound: SoundboardSound) => void;
  disabled: boolean;
  isPlaying: boolean;
}

function SoundboardSoundCard({ sound, onPlay, disabled, isPlaying }: SoundboardSoundCardProps) {
  const durationSec = Math.ceil(sound.durationMs / 1000);

  return (
    <button
      type="button"
      onClick={() => onPlay(sound)}
      disabled={disabled}
      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50 disabled:cursor-not-allowed w-full"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--wd-accent-soft)]">
        {isPlaying ? (
          <Loader2 size={14} className="animate-spin wd-text-primary" />
        ) : (
          <Play size={14} className="wd-text-primary" />
        )}
      </span>
      <span className="flex-1 truncate text-xs wd-text-primary">{sound.name}</span>
      <span className="text-[10px] wd-text-muted">{durationSec}s</span>
    </button>
  );
}

export default React.memo(SoundboardSoundCard);
