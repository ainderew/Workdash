import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX, RotateCcw } from 'lucide-react';
import useAudioStore from '@/common/store/audioStore';

interface ParticipantVolumeMenuProps {
  userId: number;
  displayName: string;
  x: number;
  y: number;
  onClose: () => void;
}

const MENU_WIDTH = 220;
const MENU_HEIGHT = 200;

export default function ParticipantVolumeMenu({
  userId,
  displayName,
  x,
  y,
  onClose,
}: ParticipantVolumeMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const volume = useAudioStore((s) => s.getUserVolume(userId));
  const isMuted = useAudioStore((s) => s.isUserMuted(userId));
  const setUserVolume = useAudioStore((s) => s.setUserVolume);
  const toggleUserMute = useAudioStore((s) => s.toggleUserMute);

  const pct = Math.round(volume * 100);

  const clampedX = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
  const clampedY = Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 8));

  // Dismiss on outside click, Escape, scroll, resize
  useEffect(() => {
    const close = () => onClose();
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVol = Number(e.target.value) / 100;
      // If muted and user drags slider, auto-unmute first
      if (isMuted) {
        toggleUserMute(userId);
      }
      setUserVolume(userId, newVol);
    },
    [userId, isMuted, setUserVolume, toggleUserMute],
  );

  const handleReset = useCallback(() => {
    if (isMuted) {
      toggleUserMute(userId);
    }
    setUserVolume(userId, 1.0);
  }, [userId, isMuted, setUserVolume, toggleUserMute]);

  const sliderPct = isMuted ? 0 : pct;
  const trackBg = `linear-gradient(to right, var(--wd-accent) ${sliderPct / 2}%, var(--wd-surface-elevated) ${sliderPct / 2}%)`;

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[300] rounded-lg border wd-border-strong wd-bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-1 wd-anim-ctx-menu"
      style={{ left: clampedX, top: clampedY, width: MENU_WIDTH }}
    >
      {/* Header */}
      <div className="px-3 py-2 mb-1 border-b border-[var(--wd-border-subtle)]">
        <p className="text-xs font-semibold wd-text-primary truncate">
          {displayName}
        </p>
      </div>

      {/* Volume section */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-2">
          {isMuted ? (
            <VolumeX size={14} className="wd-text-muted shrink-0" />
          ) : (
            <Volume2 size={14} className="wd-text-secondary shrink-0" />
          )}
          <span className="text-[13px] wd-text-primary flex-1">Volume</span>
          <span
            className="text-[13px] wd-text-muted"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {isMuted ? 'Muted' : `${pct}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={200}
          step={1}
          value={isMuted ? 0 : pct}
          onChange={handleSliderChange}
          className={`wd-volume-slider w-full ${isMuted ? 'opacity-40' : ''}`}
          style={{ background: trackBg }}
        />
      </div>

      {/* Divider */}
      <div className="my-1 h-px bg-[var(--wd-surface-elevated)] mx-2" />

      {/* Mute / Unmute */}
      <button
        type="button"
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
        onClick={() => toggleUserMute(userId)}
      >
        {isMuted ? (
          <>
            <Volume2 size={14} className="wd-text-secondary" />
            <span>Unmute User</span>
          </>
        ) : (
          <>
            <VolumeX size={14} className="wd-text-secondary" />
            <span>Mute User</span>
          </>
        )}
      </button>

      {/* Reset to 100% — only when volume != 100% or muted */}
      {(pct !== 100 || isMuted) && (
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)]"
          onClick={handleReset}
        >
          <RotateCcw size={14} className="wd-text-secondary" />
          <span>Reset to 100%</span>
        </button>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
