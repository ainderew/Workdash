import React from 'react';
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
          <div className="mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide wd-text-muted mb-1">
              Input Device
            </p>
            <select
              value={selectedMicrophoneId}
              onChange={(e) => selectMicrophone(e.target.value)}
              className="h-9 w-full rounded-md border wd-border-subtle wd-bg-elevated px-2 text-xs wd-text-primary outline-none focus:border-[var(--wd-border-strong)]"
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
