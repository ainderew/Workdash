import { useCallback, useEffect, useState } from 'react';
import useUiStore from '@/common/store/uiStore';
import useAudioStore from '@/common/store/audioStore';
import useCallStore from '@/common/store/callStore';
import { AudioChat } from '@/communication/audioChat/audioChat';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import { AudioSettingsService } from '@/game/audio/AudioSettingsService';
import { EventBus } from '@/game/EventBus';

// Module-level so references are stable and don't defeat useCallback/useEffect memoization
const audioService = AudioChat.getInstance();
const videoCamService = VideoChatService.getInstance();
const settingsService = AudioSettingsService.getInstance();

export function useAudioVideoSettings() {
  const isMuted = useUiStore((state) => state.isMuted);
  const toggleMicState = useUiStore((state) => state.toggleMic);
  const availableMicrophones = useUiStore(
    (state) => state.availableMicrophones,
  );
  const selectedMicrophoneId = useUiStore(
    (state) => state.selectedMicrophoneId,
  );
  const setSelectedMicrophoneId = useUiStore(
    (state) => state.setSelectedMicrophoneId,
  );

  const isVideoOff = useUiStore((state) => state.isVideoOff);
  const toggleVideoCamState = useUiStore((state) => state.toggleVideoCam);
  const availableCameras = useUiStore((state) => state.availableCameras);
  const selectedCameraId = useUiStore((state) => state.selectedCameraId);
  const setSelectedCameraId = useUiStore(
    (state) => state.setSelectedCameraId,
  );

  const availableOutputDevices = useUiStore(
    (state) => state.availableOutputDevices,
  );
  const selectedOutputDeviceId = useUiStore(
    (state) => state.selectedOutputDeviceId,
  );
  const setSelectedOutputDeviceId = useUiStore(
    (state) => state.setSelectedOutputDeviceId,
  );

  const noiseCancellation = useAudioStore((s) => s.noiseCancellation);
  const setNoiseCancellation = useAudioStore((s) => s.setNoiseCancellation);

  const isInCall = useCallStore((state) => state.currentCall !== null);

  const supportsOutputDeviceSelection =
    typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype;

  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(0.3);

  // State (not ref) so the restoration effect re-fires when settings load
  // after devices are already enumerated
  const [persistedDeviceIds, setPersistedDeviceIds] = useState<{
    mic: string | null;
    camera: string | null;
    output: string | null;
  } | null>(null);

  useEffect(() => {
    settingsService.getSettings().then((settings) => {
      setBackgroundMusicEnabled(settings.backgroundMusicEnabled ?? false);
      setMusicVolumeState(settings.volume);

      setPersistedDeviceIds({
        mic: settings.selectedMicrophoneId ?? null,
        camera: settings.selectedCameraId ?? null,
        output: settings.selectedOutputDeviceId ?? null,
      });
    });
  }, []);

  // Restore persisted device selections once device lists are populated
  useEffect(() => {
    if (!persistedDeviceIds) return;
    const { mic, camera, output } = persistedDeviceIds;

    let allHandled = true;

    if (mic) {
      if (availableMicrophones.length > 0) {
        if (availableMicrophones.some((m) => m.deviceId === mic)) {
          setSelectedMicrophoneId(mic);
        }
      } else {
        allHandled = false;
      }
    }
    if (camera) {
      if (availableCameras.length > 0) {
        if (availableCameras.some((c) => c.deviceId === camera)) {
          setSelectedCameraId(camera);
        }
      } else {
        allHandled = false;
      }
    }
    if (output) {
      if (availableOutputDevices.length > 0) {
        if (availableOutputDevices.some((o) => o.deviceId === output)) {
          setSelectedOutputDeviceId(output);
        }
      } else {
        allHandled = false;
      }
    }

    if (allHandled) {
      setPersistedDeviceIds(null);
    }
  }, [
    persistedDeviceIds,
    availableMicrophones,
    availableCameras,
    availableOutputDevices,
    setSelectedMicrophoneId,
    setSelectedCameraId,
    setSelectedOutputDeviceId,
  ]);

  // Read mute state BEFORE toggling to avoid inverted logic
  const toggleMic = useCallback(() => {
    const wasMuted = audioService.isMuted;
    toggleMicState();
    if (wasMuted) {
      audioService.unMuteMic();
    } else {
      audioService.muteMic();
    }
  }, [toggleMicState]);

  const selectMicrophone = useCallback(
    async (deviceId: string) => {
      const previousId = selectedMicrophoneId;
      try {
        setSelectedMicrophoneId(deviceId);
        await audioService.switchMicrophone(deviceId);
        await settingsService.setSelectedMicrophoneId(deviceId);
      } catch {
        setSelectedMicrophoneId(previousId);
      }
    },
    [selectedMicrophoneId, setSelectedMicrophoneId],
  );

  const selectCamera = useCallback(
    async (deviceId: string) => {
      const previousId = selectedCameraId;
      try {
        setSelectedCameraId(deviceId);
        await videoCamService.switchCamera(deviceId);
        await settingsService.setSelectedCameraId(deviceId);
      } catch {
        setSelectedCameraId(previousId);
      }
    },
    [selectedCameraId, setSelectedCameraId],
  );

  const selectOutputDevice = useCallback(
    async (deviceId: string) => {
      const previousId = selectedOutputDeviceId;
      try {
        setSelectedOutputDeviceId(deviceId);

        if (supportsOutputDeviceSelection) {
          const audioElements = document.querySelectorAll('audio');
          const sinkPromises = Array.from(audioElements).map((el) =>
            (el as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> })
              .setSinkId(deviceId)
              .catch(() => {}),
          );
          await Promise.all(sinkPromises);
        }

        await settingsService.setSelectedOutputDeviceId(deviceId);
      } catch {
        setSelectedOutputDeviceId(previousId);
      }
    },
    [selectedOutputDeviceId, setSelectedOutputDeviceId, supportsOutputDeviceSelection],
  );

  const toggleVideo = useCallback(() => {
    toggleVideoCamState();
    if (!isVideoOff) {
      videoCamService.stopVideoChat();
    }
  }, [isVideoOff, toggleVideoCamState]);

  const toggleBackgroundMusic = useCallback(async () => {
    const newValue = !backgroundMusicEnabled;
    setBackgroundMusicEnabled(newValue);
    await settingsService.setBackgroundMusicEnabled(newValue);
    EventBus.emit('background-music-toggle', newValue);
  }, [backgroundMusicEnabled]);

  const toggleNoiseCancellation = useCallback(async () => {
    const newValue = !noiseCancellation;
    setNoiseCancellation(newValue);
    const audioChat = AudioChat.getInstance();
    const currentMode = useAudioStore.getState().audioQualityMode;
    if (currentMode === 'standard') {
      await audioChat.applyQualityMode('standard');
    }
  }, [noiseCancellation, setNoiseCancellation]);

  const setMusicVolume = useCallback((volume: number) => {
    setMusicVolumeState(volume);
    EventBus.emit('background-music-volume', volume);
    void settingsService.setVolume(volume);
  }, []);

  return {
    isMuted,
    toggleMic,
    availableMicrophones,
    selectedMicrophoneId,
    selectMicrophone,
    isVideoOff,
    toggleVideo,
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
  };
}
