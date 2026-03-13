'use client';

import React, { useCallback } from 'react';
import { Video, VideoOff } from 'lucide-react';
import useUiStore from '@/common/store/uiStore';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import DeviceSplitButton from './DeviceSplitButton';
import type { DeviceSplitSize, DeviceSplitVariant } from './DeviceSplitButton';

export type VideoSplitSize = DeviceSplitSize;
export type VideoSplitVariant = DeviceSplitVariant;

interface VideoSplitButtonProps {
  isVideoOff: boolean;
  onToggleVideo: () => void;
  size?: VideoSplitSize;
  variant?: VideoSplitVariant;
}

export default function VideoSplitButton({
  isVideoOff,
  onToggleVideo,
  size = 'md',
  variant = 'pill',
}: VideoSplitButtonProps) {
  const devices = useUiStore((s) => s.availableCameras);
  const selectedDeviceId = useUiStore((s) => s.selectedCameraId);

  const handleSwitchDevice = useCallback(async (deviceId: string) => {
    useUiStore.getState().setSelectedCameraId(deviceId);
    await VideoChatService.getInstance().switchCamera(deviceId);
  }, []);

  return (
    <DeviceSplitButton
      isOff={isVideoOff}
      onToggle={onToggleVideo}
      ActiveIcon={Video}
      InactiveIcon={VideoOff}
      devices={devices}
      selectedDeviceId={selectedDeviceId}
      onSwitchDevice={handleSwitchDevice}
      label="Camera"
      offTitle="Turn on camera"
      onTitle="Turn off camera"
      pillOffStyle="subtle"
      size={size}
      variant={variant}
    />
  );
}
