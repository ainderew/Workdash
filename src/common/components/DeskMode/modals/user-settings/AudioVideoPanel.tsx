import React from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useAudioVideoSettings } from '../hooks/useAudioVideoSettings';
import {
  SettingsSection,
  SettingsToggle,
  SettingsSlider,
} from '../settings-primitives';

interface AudioVideoPanelProps {
  isOpen: boolean;
}

export function AudioVideoPanel({ isOpen }: AudioVideoPanelProps) {
  const {
    isMuted,
    toggleMic,
    availableMicrophones,
    selectedMicrophoneId,
    selectMicrophone,
    isVideoOff,
    toggleVideo,
    backgroundMusicEnabled,
    musicVolume,
    toggleBackgroundMusic,
    setMusicVolume,
  } = useAudioVideoSettings(isOpen);

  return (
    <div className="space-y-5">
      {/* Microphone */}
      <SettingsSection label="Microphone">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                isMuted
                  ? 'bg-[var(--wd-danger-soft)] text-[var(--wd-danger)]'
                  : 'bg-[var(--wd-accent-soft)] text-[var(--wd-accent)]'
              }`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </span>
            <div>
              <p className="text-sm font-medium wd-text-primary">
                {isMuted ? 'Microphone Muted' : 'Microphone Active'}
              </p>
              <p className="text-xs wd-text-muted">
                {isMuted
                  ? 'Others cannot hear you'
                  : 'Your microphone is live'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!isMuted}
            onClick={() => toggleMic()}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
              !isMuted
                ? 'bg-[var(--wd-accent)]'
                : 'bg-[var(--wd-surface-elevated)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                !isMuted ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {availableMicrophones.length > 0 && (
          <div className="mt-3 pt-3 border-t wd-border-subtle">
            <label className="text-xs font-semibold uppercase tracking-wide wd-text-muted">
              Input Device
            </label>
            <select
              value={selectedMicrophoneId}
              onChange={(e) => selectMicrophone(e.target.value)}
              className="mt-1.5 h-9 w-full rounded-lg border wd-border-subtle wd-bg-elevated px-3 text-xs wd-text-primary outline-none transition-colors focus:border-[var(--wd-accent)]"
            >
              {availableMicrophones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </SettingsSection>

      {/* Camera */}
      <SettingsSection label="Camera">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                isVideoOff
                  ? 'bg-[var(--wd-danger-soft)] text-[var(--wd-danger)]'
                  : 'bg-[var(--wd-accent-soft)] text-[var(--wd-accent)]'
              }`}
            >
              {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
            </span>
            <div>
              <p className="text-sm font-medium wd-text-primary">
                {isVideoOff ? 'Camera Off' : 'Camera On'}
              </p>
              <p className="text-xs wd-text-muted">
                {isVideoOff
                  ? 'Your camera is disabled'
                  : 'Others can see your video'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!isVideoOff}
            onClick={() => toggleVideo()}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
              !isVideoOff
                ? 'bg-[var(--wd-accent)]'
                : 'bg-[var(--wd-surface-elevated)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                !isVideoOff ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </SettingsSection>

      {/* Background Music */}
      <SettingsSection label="Background Music">
        <SettingsToggle
          label="Enable Background Music"
          description={backgroundMusicEnabled ? 'Music is playing' : 'Music is off'}
          checked={backgroundMusicEnabled}
          onChange={() => toggleBackgroundMusic()}
        />

        {backgroundMusicEnabled && (
          <div className="mt-2 pt-2 border-t wd-border-subtle">
            <SettingsSlider
              label="Volume"
              value={musicVolume}
              min={0}
              max={1}
              step={0.01}
              onChange={setMusicVolume}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
