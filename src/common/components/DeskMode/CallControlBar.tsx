import React from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Maximize2, Minimize2, PictureInPicture2,
} from 'lucide-react';

export type CallControlSize = 'sm' | 'md';

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
  size = 'md',
}: CallControlBarProps) {
  const { btn, icon, gap } = sizeConfig[size];

  return (
    <div className={`flex items-center justify-center ${gap}`}>
      {/* Mute */}
      <button
        type="button"
        onClick={onToggleMic}
        className={`inline-flex items-center justify-center ${btn} rounded-full border transition-colors ${
          isMuted
            ? 'border-[var(--wd-danger)] text-[var(--wd-danger)]'
            : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
        }`}
        style={
          isMuted
            ? { backgroundColor: 'color-mix(in srgb, var(--wd-danger) 12%, transparent)' }
            : undefined
        }
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff size={icon} /> : <Mic size={icon} />}
      </button>

      {/* Video */}
      <button
        type="button"
        onClick={onToggleVideo}
        className={`inline-flex items-center justify-center ${btn} rounded-full border transition-colors ${
          isVideoOff
            ? 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
            : 'border-[var(--wd-success)] text-[var(--wd-success)]'
        }`}
        style={
          !isVideoOff
            ? { backgroundColor: 'color-mix(in srgb, var(--wd-success) 12%, transparent)' }
            : undefined
        }
        title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
      >
        {isVideoOff ? <VideoOff size={icon} /> : <Video size={icon} />}
      </button>

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
