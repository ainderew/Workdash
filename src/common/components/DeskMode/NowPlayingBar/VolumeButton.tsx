import React, { useCallback, useRef, useState } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";
import useAudioStore from "@/common/store/audioStore";

export function VolumeButton() {
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const setMusicVolume = useAudioStore((s) => s.setMusicVolume);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preMuteVolumeRef = useRef(0.5);

  const pct = Math.round(musicVolume * 100);
  const isMuted = musicVolume === 0;
  const VolumeIcon = isMuted ? VolumeX : musicVolume < 0.5 ? Volume1 : Volume2;

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 200);
  }, [cancelClose]);

  const handleMouseEnter = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMusicVolume(Number(e.target.value) / 100);
    },
    [setMusicVolume],
  );

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      setMusicVolume(preMuteVolumeRef.current || 0.5);
    } else {
      preMuteVolumeRef.current = musicVolume;
      setMusicVolume(0);
    }
  }, [isMuted, musicVolume, setMusicVolume]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={scheduleClose}
    >
      {/* Vertical volume popover — positioned above the button */}
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center wd-bg-panel rounded-lg shadow-lg border border-[var(--wd-border-subtle)] px-2 py-3 z-50 w-8">
          <span className="text-[9px] wd-text-muted tabular-nums mb-1 w-full text-center">
            {pct}%
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={handleChange}
            className="wd-volume-slider"
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
              width: "6px",
              height: "120px",
              background: `linear-gradient(to top, var(--wd-accent) ${pct}%, var(--wd-surface-elevated) ${pct}%)`,
            }}
            title={`Volume: ${pct}%`}
          />
        </div>
      )}

      {/* Volume button — click to mute/unmute, hover to open slider */}
      <button
        type="button"
        onClick={handleToggleMute}
        className={`p-1 rounded-full transition-colors cursor-pointer hover:bg-[var(--wd-surface-elevated)] ${
          isMuted ? "text-[var(--wd-danger)]" : open ? "text-[var(--wd-accent)]" : "wd-text-muted"
        }`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        <VolumeIcon size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
