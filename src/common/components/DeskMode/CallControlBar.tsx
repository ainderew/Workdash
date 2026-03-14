import React from 'react';
import { Monitor, MonitorOff, PhoneOff } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import type { ConnectionQuality } from '@/common/store/callStore';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import MicSplitButton from './MicSplitButton';
import VideoSplitButton from './VideoSplitButton';
import DisplayModeSplitButton from './DisplayModeSplitButton';
import type { DisplayModeSplitButtonProps } from './DisplayModeSplitButton';

export type CallControlSize = 'sm' | 'md';

const qualityColors: Record<ConnectionQuality, string> = {
  good: 'var(--wd-success)',
  fair: 'var(--wd-warning, #f59e0b)',
  poor: 'var(--wd-danger)',
  unknown: 'var(--wd-text-muted, #6b7280)',
};

interface CallControlBarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  /** Props for the display-mode split button (inline mode only) */
  displayModeProps?: DisplayModeSplitButtonProps;
  size?: CallControlSize;
}

const sizeConfig = {
  sm: { btn: 'h-7 w-7', icon: 13, gap: 'gap-1' },
  md: { btn: 'h-8 w-8', icon: 15, gap: 'gap-2' },
} as const;

export default function CallControlBar({
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  displayModeProps,
  size = 'md',
}: CallControlBarProps) {
  const { btn, icon, gap } = sizeConfig[size];
  const connectionQuality = useCallStore((s) => s.connectionQuality);
  const statsSnapshot = useCallStore((s) => s.statsSnapshot);

  const qualityLabel =
    connectionQuality === 'unknown' ? 'Connecting...' : connectionQuality;
  const statsTooltip = statsSnapshot
    ? `${qualityLabel} | ${Math.round(statsSnapshot.bitrate / 1000)} kbps | ${statsSnapshot.rtt}ms RTT | ${statsSnapshot.packetLoss}% loss${statsSnapshot.fps ? ` | ${statsSnapshot.fps} fps` : ''}`
    : qualityLabel;

  return (
    <div className={`flex items-center justify-center ${gap}`}>
      {/* Connection quality indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex items-center justify-center h-4 w-4 shrink-0 cursor-default">
            <span
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: qualityColors[connectionQuality] }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>{statsTooltip}</TooltipContent>
      </Tooltip>

      {/* Mute + mic source picker */}
      <MicSplitButton
        isMuted={isMuted}
        onToggleMic={onToggleMic}
        size={size}
        variant="pill"
      />

      {/* Video + camera source picker */}
      <VideoSplitButton
        isVideoOff={isVideoOff}
        onToggleVideo={onToggleVideo}
        size={size}
        variant="pill"
      />

      {/* Screen Share */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggleScreenShare}
            className={`inline-flex items-center justify-center ${btn} rounded-full border cursor-pointer transition-colors ${
              isScreenSharing
                ? 'border-[var(--wd-info)] text-[var(--wd-info)]'
                : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
            }`}
            style={
              isScreenSharing
                ? { backgroundColor: 'color-mix(in srgb, var(--wd-info) 12%, transparent)' }
                : undefined
            }
          >
            {isScreenSharing ? <MonitorOff size={icon} /> : <Monitor size={icon} />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {isScreenSharing ? 'Stop sharing' : 'Share screen'}
        </TooltipContent>
      </Tooltip>

      {/* Display mode split button (inline mode only) */}
      {displayModeProps && (
        <>
          <div
            className="w-px h-5 mx-0.5"
            style={{ backgroundColor: 'var(--wd-border-subtle)' }}
          />
          <DisplayModeSplitButton {...displayModeProps} size={size} />
        </>
      )}

      {/* Divider + Leave */}
      <div
        className="w-px h-5 mx-0.5"
        style={{ backgroundColor: 'var(--wd-border-subtle)' }}
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onLeave}
            className={`inline-flex items-center justify-center ${btn} rounded-full cursor-pointer transition-colors`}
            style={{ backgroundColor: 'var(--wd-danger)', color: '#fff' }}
          >
            <PhoneOff size={icon} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>Leave call</TooltipContent>
      </Tooltip>
    </div>
  );
}
