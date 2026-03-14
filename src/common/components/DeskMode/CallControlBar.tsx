import React from 'react';
import {
  Monitor, MonitorOff,
  PhoneOff, Maximize2, Minimize2, PictureInPicture2,
} from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import type { ConnectionQuality } from '@/common/store/callStore';
import MicSplitButton from './MicSplitButton';
import VideoSplitButton from './VideoSplitButton';

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
  /** Toggle between expanded/collapsed call view */
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  /** Navigate back to the call's channel */
  onExpandToChannel?: () => void;
  /** Pop out to floating PiP window */
  onPictureInPicture?: () => void;
  /** Toggle fullscreen mode */
  onToggleFullscreen?: () => void;
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
  onToggleCollapse,
  isCollapsed,
  onExpandToChannel,
  onPictureInPicture,
  onToggleFullscreen,
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
      <div
        className="relative flex items-center justify-center h-4 w-4 shrink-0"
        title={statsTooltip}
      >
        <span
          className="block h-2 w-2 rounded-full"
          style={{ backgroundColor: qualityColors[connectionQuality] }}
        />
      </div>

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
      <button
        type="button"
        onClick={onToggleScreenShare}
        className={`inline-flex items-center justify-center ${btn} rounded-full border transition-colors ${
          isScreenSharing
            ? 'border-[var(--wd-info)] text-[var(--wd-info)]'
            : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
        }`}
        style={
          isScreenSharing
            ? { backgroundColor: 'color-mix(in srgb, var(--wd-info) 12%, transparent)' }
            : undefined
        }
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
      >
        {isScreenSharing ? <MonitorOff size={icon} /> : <Monitor size={icon} />}
      </button>

      {/* Picture-in-picture (pop out to floating window) */}
      {onPictureInPicture && (
        <button
          type="button"
          onClick={onPictureInPicture}
          className={`inline-flex items-center justify-center ${btn} rounded-full border wd-border-subtle wd-text-secondary hover:wd-text-primary transition-colors`}
          title="Pop out to floating window"
        >
          <PictureInPicture2 size={icon} />
        </button>
      )}

      {/* Fullscreen */}
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`inline-flex items-center justify-center ${btn} rounded-full border wd-border-subtle wd-text-secondary hover:wd-text-primary transition-colors`}
          title="Fullscreen"
        >
          <Maximize2 size={icon} />
        </button>
      )}

      {/* Expand to channel */}
      {onExpandToChannel && (
        <button
          type="button"
          onClick={onExpandToChannel}
          className={`inline-flex items-center justify-center ${btn} rounded-full border wd-border-subtle wd-text-secondary hover:wd-text-primary transition-colors`}
          title="Go to call channel"
        >
          <Maximize2 size={icon} />
        </button>
      )}

      {/* Collapse/expand toggle */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`inline-flex items-center justify-center ${btn} rounded-full border wd-border-subtle wd-text-secondary hover:wd-text-primary transition-colors`}
          title={isCollapsed ? 'Expand call view' : 'Minimize to pill'}
        >
          {isCollapsed ? <Maximize2 size={icon} /> : <Minimize2 size={icon} />}
        </button>
      )}

      {/* Divider + Leave */}
      <div
        className="w-px h-5 mx-0.5"
        style={{ backgroundColor: 'var(--wd-border-subtle)' }}
      />

      <button
        type="button"
        onClick={onLeave}
        className={`inline-flex items-center justify-center ${btn} rounded-full transition-colors`}
        style={{ backgroundColor: 'var(--wd-danger)', color: '#fff' }}
        title="Leave call"
      >
        <PhoneOff size={icon} />
      </button>
    </div>
  );
}
