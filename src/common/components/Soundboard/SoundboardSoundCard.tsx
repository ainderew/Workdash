import React from 'react';
import type { SoundboardSound } from './_types';

interface SoundboardSoundCardProps {
  sound: SoundboardSound;
  onPlay: (sound: SoundboardSound) => void;
  disabled: boolean;
  isPlaying: boolean;
}

function EqBars() {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[0, 0.2, 0.1, 0.3, 0.15].map((delay, i) => (
        <div
          key={i}
          className="wd-eq-bar w-[2px] h-full rounded-full bg-[var(--wd-accent)]"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

function SoundboardSoundCard({ sound, onPlay, disabled, isPlaying }: SoundboardSoundCardProps) {
  const durationSec = Math.ceil(sound.durationMs / 1000);

  return (
    <button
      type="button"
      onClick={() => onPlay(sound)}
      disabled={disabled}
      className={`wd-soundpad relative flex flex-col items-center justify-center gap-0.5 rounded-lg p-2 h-[62px] w-full text-center disabled:opacity-40 disabled:cursor-not-allowed ${
        isPlaying ? 'wd-soundpad--playing' : ''
      }`}
      style={{
        backgroundColor: isPlaying
          ? 'var(--wd-accent-soft)'
          : 'var(--wd-surface-elevated)',
      }}
    >
      {isPlaying ? (
        <EqBars />
      ) : (
        <span className="text-[9px] wd-text-muted tabular-nums">{durationSec}s</span>
      )}
      <span className="w-full truncate text-[10px] font-semibold wd-text-primary leading-tight">
        {sound.name}
      </span>
    </button>
  );
}

export default React.memo(SoundboardSoundCard);
