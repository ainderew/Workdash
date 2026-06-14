import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, MonitorOff, PhoneOff, SmilePlus, Hand } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import type { ConnectionQuality } from '@/common/store/callStore';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import MicSplitButton from './MicSplitButton';
import VideoSplitButton from './VideoSplitButton';
import DisplayModeSplitButton from './DisplayModeSplitButton';
import type { DisplayModeSplitButtonProps } from './DisplayModeSplitButton';
import NoiseCancelToggle from './NoiseCancelToggle';
import StageButton from './StageButton';
import SoundboardButton from '@/common/components/Soundboard/SoundboardButton';
import ReactionPickerFlyout from './ReactionPickerFlyout';
import { useCallReaction } from './hooks/useCallReaction';

export type CallControlSize = 'sm' | 'md';
export type CallControlVariant = 'inline' | 'dock';

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
  /** "dock": media / expression / leave groups with separators and a labelled Leave */
  variant?: CallControlVariant;
}

const sizeConfig = {
  sm: { btn: 'h-7 w-7', icon: 13, gap: 'gap-1' },
  md: { btn: 'h-8 w-8', icon: 15, gap: 'gap-2' },
} as const;

function GroupSeparator() {
  return (
    <span
      className="w-px h-5 mx-2 shrink-0"
      style={{ backgroundColor: 'var(--wd-border-strong)' }}
    />
  );
}

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
  variant = 'inline',
}: CallControlBarProps) {
  const { btn, icon, gap } = sizeConfig[size];
  const connectionQuality = useCallStore((s) => s.connectionQuality);
  const statsSnapshot = useCallStore((s) => s.statsSnapshot);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerAnchorRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; direction: 'up' | 'down' } | null>(null);
  const { sendReaction, toggleRaiseHand, isRaisingHand } = useCallReaction();

  const updatePickerPos = useCallback(() => {
    const anchor = pickerAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const direction = spaceAbove > spaceBelow ? 'up' : 'down';
    setPickerPos({
      top: direction === 'up' ? rect.top : rect.bottom + 8,
      left: rect.right,
      direction,
    });
  }, []);

  useLayoutEffect(() => {
    if (pickerOpen) updatePickerPos();
  }, [pickerOpen, updatePickerPos]);

  const qualityLabel =
    connectionQuality === 'unknown' ? 'Connecting...' : connectionQuality;
  const statsTooltip = statsSnapshot
    ? `${qualityLabel} | ${Math.round(statsSnapshot.bitrate / 1000)} kbps | ${statsSnapshot.rtt}ms RTT | ${statsSnapshot.packetLoss}% loss${statsSnapshot.fps ? ` | ${statsSnapshot.fps} fps` : ''}`
    : qualityLabel;

  const qualityDot = (
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
  );

  const micButton = (
    <MicSplitButton
      isMuted={isMuted}
      onToggleMic={onToggleMic}
      size={size}
      variant="pill"
    />
  );

  const noiseToggle = <NoiseCancelToggle size={size} />;

  const videoButton = (
    <VideoSplitButton
      isVideoOff={isVideoOff}
      onToggleVideo={onToggleVideo}
      size={size}
      variant="pill"
    />
  );

  const screenShareButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`inline-flex items-center justify-center ${btn} rounded-full border cursor-pointer transition-colors ${
            isScreenSharing
              ? 'border-[var(--wd-text-primary)] text-[var(--wd-text-primary)] bg-[var(--wd-surface-elevated)]'
              : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
          }`}
        >
          {isScreenSharing ? <MonitorOff size={icon} /> : <Monitor size={icon} />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {isScreenSharing ? 'Stop sharing' : 'Share screen'}
      </TooltipContent>
    </Tooltip>
  );

  const reactionButton = (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={pickerAnchorRef}
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            data-emoji-picker-trigger="true"
            className={`inline-flex items-center justify-center ${btn} rounded-full border cursor-pointer transition-colors ${
              pickerOpen
                ? 'border-[var(--wd-text-primary)] text-[var(--wd-text-primary)] bg-[var(--wd-surface-elevated)]'
                : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
            }`}
          >
            <SmilePlus size={icon} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>React</TooltipContent>
      </Tooltip>

      {pickerOpen && pickerPos && createPortal(
        <div
          className="fixed z-[200] max-h-[min(480px,calc(100vh-40px))] overflow-y-auto rounded-xl"
          style={{
            top: pickerPos.direction === 'up' ? undefined : pickerPos.top,
            bottom: pickerPos.direction === 'up' ? `${window.innerHeight - pickerPos.top + 8}px` : undefined,
            right: `${window.innerWidth - pickerPos.left}px`,
          }}
        >
          <ReactionPickerFlyout
            onSelectEmoji={(emoji) => {
              sendReaction(emoji);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </div>,
        document.body,
      )}
    </div>
  );

  const raiseHandButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleRaiseHand}
          className={`inline-flex items-center justify-center ${btn} rounded-full border cursor-pointer transition-colors ${
            isRaisingHand
              ? 'border-[var(--wd-text-primary)] text-[var(--wd-text-primary)] bg-[var(--wd-surface-elevated)]'
              : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
          }`}
        >
          <Hand size={icon} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {isRaisingHand ? 'Lower hand' : 'Raise hand'}
      </TooltipContent>
    </Tooltip>
  );

  if (variant === 'dock') {
    return (
      <div className="flex items-center gap-2.5">
        {qualityDot}
        <div className="flex items-center gap-2.5">
          {micButton}
          {noiseToggle}
          {videoButton}
          {screenShareButton}
          <StageButton size={size} />
        </div>
        <GroupSeparator />
        <div className="flex items-center gap-2.5">
          <SoundboardButton />
          {reactionButton}
          {raiseHandButton}
        </div>
        <GroupSeparator />
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold cursor-pointer transition-transform hover:-translate-y-px"
          style={{ backgroundColor: 'var(--wd-danger)', color: '#fff' }}
        >
          <PhoneOff size={13} />
          Leave
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${gap}`}>
      {qualityDot}
      {micButton}
      {noiseToggle}
      {videoButton}
      {screenShareButton}
      <StageButton size={size} />
      <SoundboardButton />
      {reactionButton}
      {raiseHandButton}

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
