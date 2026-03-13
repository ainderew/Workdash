'use client';

import React, { useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import useUiStore from '@/common/store/uiStore';
import { AudioChat } from '@/communication/audioChat/audioChat';
import DeviceSplitButton from './DeviceSplitButton';
import type { DeviceSplitSize, DeviceSplitVariant } from './DeviceSplitButton';

export type MicSplitSize = DeviceSplitSize;
export type MicSplitVariant = DeviceSplitVariant;

interface MicSplitButtonProps {
  isMuted: boolean;
  onToggleMic: () => void;
  size?: MicSplitSize;
  variant?: MicSplitVariant;
}

export default function MicSplitButton({
  isMuted,
  onToggleMic,
  size = 'md',
  variant = 'pill',
}: MicSplitButtonProps) {
  const devices = useUiStore((s) => s.availableMicrophones);
  const selectedDeviceId = useUiStore((s) => s.selectedMicrophoneId);

  const handleSwitchDevice = useCallback(async (deviceId: string) => {
    useUiStore.getState().setSelectedMicrophoneId(deviceId);
    await AudioChat.getInstance().switchMicrophone(deviceId);
  }, []);

  return (
    <DeviceSplitButton
      isOff={isMuted}
      onToggle={onToggleMic}
      ActiveIcon={Mic}
      InactiveIcon={MicOff}
      devices={devices}
      selectedDeviceId={selectedDeviceId}
      onSwitchDevice={handleSwitchDevice}
      label="Microphone"
      offTitle="Unmute"
      onTitle="Mute"
      pillOffStyle="danger"
      size={size}
      variant={variant}
    />
  );
}
