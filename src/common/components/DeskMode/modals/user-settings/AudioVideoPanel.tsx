import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  SettingsSection,
  SettingsToggle,
  SettingsSlider,
} from '../settings-primitives';
import { useAudioVideoSettings } from '../hooks/useAudioVideoSettings';

function AudioVideoPanel() {
  const {
    isMuted,
    toggleMic,
    availableMicrophones,
    selectedMicrophoneId,
    selectMicrophone,
    isVideoOff,
    toggleVideo,
    noiseCancellation,
    toggleNoiseCancellation,
    backgroundMusicEnabled,
    musicVolume,
    toggleBackgroundMusic,
    setMusicVolume,
  } = useAudioVideoSettings();

  return (
    <div className="space-y-4">
      <SettingsSection label="Microphone">
        <SettingsToggle
          label="Microphone"
          description={isMuted ? 'Currently muted' : 'Currently active'}
          checked={!isMuted}
          onChange={() => toggleMic()}
        />
        {availableMicrophones.length > 0 && (
          <div className="mt-2 pt-2 border-t wd-border-subtle">
            <p className="text-[10px] font-bold uppercase tracking-widest wd-text-muted mb-1.5">
              Input Device
            </p>
            <div className="relative">
              <select
                value={selectedMicrophoneId}
                onChange={(e) => selectMicrophone(e.target.value)}
                className="wd-settings-select h-9 w-full appearance-none rounded-lg border wd-border-subtle px-3 pr-8 text-xs wd-text-primary outline-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_3px_var(--wd-accent-soft)]"
                style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
              >
                {availableMicrophones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
              />
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection label="Noise Cancellation">
        <SettingsToggle
          label="Noise Cancellation"
          description={noiseCancellation ? 'AI-powered noise removal' : 'Disabled'}
          checked={noiseCancellation}
          onChange={() => toggleNoiseCancellation()}
        />
      </SettingsSection>

      <SettingsSection label="Camera">
        <SettingsToggle
          label="Camera"
          description={isVideoOff ? 'Camera is off' : 'Camera is on'}
          checked={!isVideoOff}
          onChange={() => toggleVideo()}
        />
      </SettingsSection>

      <SettingsSection label="Background Music">
        <SettingsToggle
          label="Background Music"
          description={backgroundMusicEnabled ? 'Playing' : 'Muted'}
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

export default AudioVideoPanel;
