import React from 'react';
import { Mic, Video } from 'lucide-react';
import {
  SettingsSection,
  SettingsToggle,
  SettingsSlider,
  DeviceSelector,
  MicLevelMeter,
  CameraPreview,
  SpeakerTest,
} from '../settings-primitives';
import { useAudioVideoSettings } from '../hooks/useAudioVideoSettings';
import { useDeviceTest } from '../hooks/useDeviceTest';

function AudioVideoPanel() {
  const {
    availableMicrophones,
    selectedMicrophoneId,
    selectMicrophone,
    availableCameras,
    selectedCameraId,
    selectCamera,
    availableOutputDevices,
    selectedOutputDeviceId,
    selectOutputDevice,
    supportsOutputDeviceSelection,
    isInCall,
    noiseCancellation,
    toggleNoiseCancellation,
    backgroundMusicEnabled,
    musicVolume,
    toggleBackgroundMusic,
    setMusicVolume,
  } = useAudioVideoSettings();

  const {
    micLevel,
    isMicTesting,
    startMicTest,
    stopMicTest,
    cameraStream,
    isCameraPreviewActive,
    startCameraPreview,
    stopCameraPreview,
    isSpeakerTesting,
    playSpeakerTest,
    micError,
    cameraError,
  } = useDeviceTest();

  return (
    <div className="space-y-4">
      {/* Microphone Section */}
      <SettingsSection label="Microphone">
        <DeviceSelector
          label="Input Device"
          devices={availableMicrophones}
          selectedDeviceId={selectedMicrophoneId}
          onSelect={selectMicrophone}
          isInCall={isInCall}
          placeholder="No microphones found"
        />
        <div className="mt-2 pt-2 border-t wd-border-subtle">
          <SettingsToggle
            label="Noise Cancellation"
            description={
              noiseCancellation ? 'AI-powered noise removal' : 'Disabled'
            }
            checked={noiseCancellation}
            onChange={() => toggleNoiseCancellation()}
          />
        </div>
        <div className="mt-2 pt-2 border-t wd-border-subtle">
          <button
            onClick={isMicTesting ? stopMicTest : startMicTest}
            className="flex items-center gap-2 rounded-md border wd-border-subtle bg-[var(--wd-surface-elevated)] px-4 py-2 text-xs font-medium wd-text-primary transition-all duration-150 hover:bg-[var(--wd-accent-soft)]"
          >
            <Mic
              size={14}
              className={
                isMicTesting ? 'text-[var(--wd-success)]' : ''
              }
            />
            {isMicTesting ? 'Stop Test' : 'Test Microphone'}
          </button>
          {isMicTesting && (
            <div className="mt-2">
              <MicLevelMeter level={micLevel} isActive={isMicTesting} />
              <p className="mt-1 text-[10px] wd-text-muted">
                Speak to test your microphone
              </p>
            </div>
          )}
          {micError && (
            <p className="mt-1.5 text-xs text-[var(--wd-danger)]">
              {micError}
            </p>
          )}
        </div>
      </SettingsSection>

      {/* Camera Section */}
      <SettingsSection label="Camera">
        <DeviceSelector
          label="Video Device"
          devices={availableCameras}
          selectedDeviceId={selectedCameraId}
          onSelect={selectCamera}
          isInCall={isInCall}
          placeholder="No cameras found"
        />
        <div className="mt-2 pt-2 border-t wd-border-subtle">
          <button
            onClick={
              isCameraPreviewActive ? stopCameraPreview : startCameraPreview
            }
            className="flex items-center gap-2 rounded-md border wd-border-subtle bg-[var(--wd-surface-elevated)] px-4 py-2 text-xs font-medium wd-text-primary transition-all duration-150 hover:bg-[var(--wd-accent-soft)]"
          >
            <Video
              size={14}
              className={
                isCameraPreviewActive ? 'text-[var(--wd-success)]' : ''
              }
            />
            {isCameraPreviewActive ? 'Stop Preview' : 'Test Camera'}
          </button>
          {isCameraPreviewActive && (
            <div className="mt-2">
              <CameraPreview
                stream={cameraStream}
                isActive={isCameraPreviewActive}
              />
            </div>
          )}
          {cameraError && (
            <p className="mt-1.5 text-xs text-[var(--wd-danger)]">
              {cameraError}
            </p>
          )}
        </div>
      </SettingsSection>

      {/* Speaker / Output Section */}
      <SettingsSection label="Speaker / Output">
        {supportsOutputDeviceSelection ? (
          <>
            <DeviceSelector
              label="Output Device"
              devices={availableOutputDevices}
              selectedDeviceId={selectedOutputDeviceId}
              onSelect={selectOutputDevice}
              isInCall={isInCall}
              placeholder="No output devices found"
            />
            <div className="mt-2 pt-2 border-t wd-border-subtle">
              <SpeakerTest
                onTest={playSpeakerTest}
                isTesting={isSpeakerTesting}
              />
              <p className="mt-1 text-[10px] wd-text-muted">
                You should hear a short tone through your selected device
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs wd-text-muted">
            Output device selection is not supported in this browser.
          </p>
        )}
      </SettingsSection>

      {/* Background Music Section */}
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
