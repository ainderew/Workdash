import { useCallback, useEffect, useState } from 'react';
import useUiStore from '@/common/store/uiStore';
import { AudioSettingsService } from '@/game/audio/AudioSettingsService';
import { EventBus } from '@/game/EventBus';

export function useAudioVideoSettings(isOpen: boolean) {
  const isMuted = useUiStore((state) => state.isMuted);
  const toggleMic = useUiStore((state) => state.toggleMic);
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
  const toggleVideo = useUiStore((state) => state.toggleVideoCam);

  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);

  const settingsService = AudioSettingsService.getInstance();

  // Load audio settings on open
  useEffect(() => {
    if (!isOpen) return;
    settingsService.getSettings().then((settings) => {
      setBackgroundMusicEnabled(settings.backgroundMusicEnabled ?? false);
      setMusicVolume(settings.volume);
    });
  }, [isOpen, settingsService]);

  const handleToggleBackgroundMusic = useCallback(async () => {
    const newValue = !backgroundMusicEnabled;
    setBackgroundMusicEnabled(newValue);
    await settingsService.setBackgroundMusicEnabled(newValue);
    EventBus.emit('background-music-toggle', newValue);
  }, [backgroundMusicEnabled, settingsService]);

  const handleSetMusicVolume = useCallback(
    (volume: number) => {
      setMusicVolume(volume);
      EventBus.emit('background-music-volume', volume);
    },
    [],
  );

  const selectMicrophone = useCallback(
    (id: string) => {
      setSelectedMicrophoneId(id);
    },
    [setSelectedMicrophoneId],
  );

  return {
    isMuted,
    toggleMic,
    availableMicrophones,
    selectedMicrophoneId,
    selectMicrophone,
    isVideoOff,
    toggleVideo,
    backgroundMusicEnabled,
    musicVolume,
    toggleBackgroundMusic: handleToggleBackgroundMusic,
    setMusicVolume: handleSetMusicVolume,
  };
}
