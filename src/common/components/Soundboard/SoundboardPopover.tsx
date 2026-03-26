import React, { useState } from 'react';
import { Loader2, Volume2, Volume1, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import useSoundboardStore from '@/common/store/soundboardStore';
import { useSoundboardPlay } from './hooks/useSoundboardPlay';
import SoundboardSoundCard from './SoundboardSoundCard';

type Tab = 'workspace' | 'personal';

function SoundboardPopover() {
  const [activeTab, setActiveTab] = useState<Tab>('workspace');
  const workspaceSounds = useSoundboardStore((s) => s.workspaceSounds);
  const personalSounds = useSoundboardStore((s) => s.personalSounds);
  const isLoading = useSoundboardStore((s) => s.isLoading);
  const volume = useSoundboardStore((s) => s.volume);
  const setVolume = useSoundboardStore((s) => s.setVolume);
  const { playSound, isPlaying, canPlay, cooldownRemaining } = useSoundboardPlay();

  const sounds = activeTab === 'workspace' ? workspaceSounds : personalSounds;
  const hasCooldown = cooldownRemaining > 0;
  const volumePct = Math.round(volume * 100);
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className="wd-anim-popover-up absolute bottom-full left-1/2 mb-2 w-72 rounded-xl border shadow-lg z-[170] overflow-hidden"
      style={{
        backgroundColor: 'var(--wd-surface-overlay)',
        borderColor: 'var(--wd-border-subtle)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-1.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold wd-text-primary uppercase tracking-widest">
            Soundboard
          </span>
          {hasCooldown && (
            <span className="text-[10px] font-medium wd-text-muted tabular-nums">
              {(cooldownRemaining / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        {/* Volume control */}
        <div className="flex items-center gap-2">
          <VolumeIcon size={12} className="wd-text-muted flex-shrink-0" />
          <input
            type="range"
            min={0}
            max={100}
            value={volumePct}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="wd-volume-slider flex-1 h-1 cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--wd-accent) ${volumePct}%, var(--wd-surface-elevated) ${volumePct}%)`,
            }}
            aria-label="Soundboard volume"
            title={`Volume: ${volumePct}%`}
          />
          <span className="text-[9px] wd-text-muted tabular-nums w-6 text-right">
            {volumePct}%
          </span>
        </div>
      </div>

      {/* Tabs with sliding pill */}
      <div className="relative flex mx-3.5 mb-2.5 p-[3px] rounded-lg bg-[var(--wd-surface-elevated)]">
        <motion.div
          className="absolute top-[3px] bottom-[3px] rounded-md"
          style={{ backgroundColor: 'var(--wd-accent-soft)' }}
          animate={{
            left: activeTab === 'workspace' ? 3 : '50%',
            width: 'calc(50% - 3px)',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
        <button
          type="button"
          onClick={() => setActiveTab('workspace')}
          className="relative z-10 flex-1 py-1.5 text-[10px] font-semibold rounded-md text-center transition-colors"
          style={{
            color: activeTab === 'workspace'
              ? 'var(--wd-text-primary)'
              : 'var(--wd-text-muted)',
          }}
        >
          Shared ({workspaceSounds.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className="relative z-10 flex-1 py-1.5 text-[10px] font-semibold rounded-md text-center transition-colors"
          style={{
            color: activeTab === 'personal'
              ? 'var(--wd-text-primary)'
              : 'var(--wd-text-muted)',
          }}
        >
          Mine ({personalSounds.length})
        </button>
      </div>

      {/* Sound grid */}
      <div className="max-h-52 overflow-y-auto px-3.5 pb-3 no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin wd-text-muted" />
          </div>
        ) : sounds.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2">
            <div className="flex items-end gap-[3px] h-5">
              {[0.4, 0.7, 1, 0.6, 0.3].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{
                    backgroundColor: 'var(--wd-accent)',
                    opacity: 0.35,
                  }}
                  animate={{ height: [h * 10, h * 20, h * 10] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
            <p className="text-[11px] wd-text-muted">
              {activeTab === 'workspace'
                ? 'No shared sounds yet'
                : 'No personal sounds yet'}
            </p>
            <p className="text-[10px] wd-text-muted opacity-50">
              Add sounds in server settings
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {sounds.map((sound, i) => (
              <motion.div
                key={sound.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.18,
                  delay: i * 0.025,
                  ease: [0.25, 1, 0.5, 1],
                }}
              >
                <SoundboardSoundCard
                  sound={sound}
                  onPlay={playSound}
                  disabled={!canPlay}
                  isPlaying={isPlaying}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Cooldown progress bar */}
      {hasCooldown && (
        <div
          className="h-[2px] w-full"
          style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
        >
          <motion.div
            className="h-full rounded-r-full"
            style={{ backgroundColor: 'var(--wd-accent)' }}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{
              duration: cooldownRemaining / 1000,
              ease: 'linear',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default SoundboardPopover;
