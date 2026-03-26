import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import useSoundboardStore from '@/common/store/soundboardStore';
import { useSoundboardPlay } from './hooks/useSoundboardPlay';
import SoundboardSoundCard from './SoundboardSoundCard';

type Tab = 'workspace' | 'personal';

function SoundboardPopover() {
  const [activeTab, setActiveTab] = useState<Tab>('workspace');
  const workspaceSounds = useSoundboardStore((s) => s.workspaceSounds);
  const personalSounds = useSoundboardStore((s) => s.personalSounds);
  const isLoading = useSoundboardStore((s) => s.isLoading);
  const { playSound, isPlaying, canPlay, cooldownRemaining } = useSoundboardPlay();

  const sounds = activeTab === 'workspace' ? workspaceSounds : personalSounds;

  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg border wd-border-subtle wd-bg-panel shadow-lg z-[170]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-xs font-semibold wd-text-primary">Soundboard</span>
        {cooldownRemaining > 0 && (
          <span className="text-[10px] wd-text-muted">
            {(cooldownRemaining / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('workspace')}
          className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
            activeTab === 'workspace'
              ? 'bg-[var(--wd-accent-soft)] wd-text-primary'
              : 'wd-text-muted hover:wd-text-secondary'
          }`}
        >
          Workspace ({workspaceSounds.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
            activeTab === 'personal'
              ? 'bg-[var(--wd-accent-soft)] wd-text-primary'
              : 'wd-text-muted hover:wd-text-secondary'
          }`}
        >
          My Sounds ({personalSounds.length})
        </button>
      </div>

      {/* Sound list */}
      <div className="max-h-48 overflow-y-auto p-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin wd-text-muted" />
          </div>
        ) : sounds.length === 0 ? (
          <p className="py-4 text-center text-[10px] wd-text-muted">
            {activeTab === 'workspace'
              ? 'No workspace sounds yet'
              : 'No personal sounds yet'}
          </p>
        ) : (
          sounds.map((sound) => (
            <SoundboardSoundCard
              key={sound.id}
              sound={sound}
              onPlay={playSound}
              disabled={!canPlay}
              isPlaying={isPlaying}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default SoundboardPopover;
