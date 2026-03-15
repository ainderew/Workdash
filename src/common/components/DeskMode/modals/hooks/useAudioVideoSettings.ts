import { useCallback, useEffect, useState } from 'react';
import useUiStore from '@/common/store/uiStore';
import useAudioStore from '@/common/store/audioStore';
import { AudioChat } from '@/communication/audioChat/audioChat';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import { AudioSettingsService } from '@/game/audio/AudioSettingsService';
import { EventBus } from '@/game/EventBus';

export function useAudioVideoSettings() {
  const audioService = AudioChat.getInstance();
  const videoCamService = VideoChatService.getInstance();
  const settingsService = AudioSettingsService.getInstance();

  // Mic state from store
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

  // Video state from store
  const isVideoOff = useUiStore((state) => state.isVideoOff);
  const toggleVideoCamState = useUiStore((state) => state.toggleVideoCam);
  const availableCameras = useUiStore((state) => state.availableCameras);
  const selectedCameraId = useUiStore((state) => state.selectedCameraId);
  const setSelectedCameraId = useUiStore((state) => state.setSelectedCameraId);

  // Noise cancellation state from store
  const noiseCancellation = useAudioStore((s) => s.noiseCancellation);
  const setNoiseCancellation = useAudioStore((s) => s.setNoiseCancellation);

  // Background music local state
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(0.3);

  // Load background music settings when hook mounts
  useEffect(() => {
    settingsService.getSettings().then((settings) => {
      setBackgroundMusicEnabled(settings.backgroundMusicEnabled ?? false);
      setMusicVolumeState(settings.volume);
    });
  }, [settingsService]);

  const toggleMic = useCallback(() => {
    toggleMicState();
    if (audioService.isMuted) {
      audioService.unMuteMic();
    } else {
      audioService.muteMic();
    }
  }, [audioService, toggleMicState]);

  const selectMicrophone = useCallback(
    async (deviceId: string) => {
      try {
        setSelectedMicrophoneId(deviceId);
        await audioService.switchMicrophone(deviceId);
      } catch (error) {
        console.error('Failed to switch microphone:', error);
      }
    },
    [audioService, setSelectedMicrophoneId],
  );

  const selectCamera = useCallback(
    async (deviceId: string) => {
      try {
        setSelectedCameraId(deviceId);
        await videoCamService.switchCamera(deviceId);
      } catch (error) {
        console.error('Failed to switch camera:', error);
      }
    },
    [videoCamService, setSelectedCameraId],
  );

  const toggleVideo = useCallback(() => {
    toggleVideoCamState();
    if (!isVideoOff) {
      videoCamService.stopVideoChat();
    }
  }, [isVideoOff, toggleVideoCamState, videoCamService]);

  const toggleBackgroundMusic = useCallback(async () => {
    const newValue = !backgroundMusicEnabled;
    setBackgroundMusicEnabled(newValue);
    await settingsService.setBackgroundMusicEnabled(newValue);
    EventBus.emit('background-music-toggle', newValue);
  }, [backgroundMusicEnabled, settingsService]);

  const toggleNoiseCancellation = useCallback(async () => {
    const newValue = !noiseCancellation;
    setNoiseCancellation(newValue);
    const audioChat = AudioChat.getInstance();
    const currentMode = useAudioStore.getState().audioQualityMode;
    if (currentMode === 'standard') {
      await audioChat.applyQualityMode('standard');
    }
  }, [noiseCancellation, setNoiseCancellation]);

  const setMusicVolume = useCallback(
    (volume: number) => {
      setMusicVolumeState(volume);
      EventBus.emit('background-music-volume', volume);
    },
    [],
  );

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
    noiseCancellation,
    toggleNoiseCancellation,
    backgroundMusicEnabled,
    musicVolume,
    toggleBackgroundMusic,
    setMusicVolume,
  };
}
