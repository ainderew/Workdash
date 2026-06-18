import React, { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Mic, MicOff, Video, Monitor, Pin, PinOff, HeadphoneOff, Wifi } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import useFocusStore from '@/common/store/focusStore';
import useCallReactionStore from '@/common/store/callReactionStore';
import type { CallParticipant } from '@/common/store/callStore';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import useUiStore from '@/common/store/uiStore';
import { useCharacterFaceAvatar } from '@/common/utils/characterFaceAvatar';
import { VideoChatViewer } from '@/communication/videoChat/videoChatViewer';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import { useActiveSpeaker } from '@/common/hooks/useActiveSpeaker';
import ParticipantVolumeMenu from './ParticipantVolumeMenu';
import FloatingReactionOverlay from './FloatingReactionOverlay';

interface CallParticipantTileProps {
  participant: CallParticipant;
  channelId: string;
  isLocal: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  /** When true, fill the parent cell instead of enforcing 4:3 aspect ratio */
  fillCell?: boolean;
}

export default function CallParticipantTile({
  participant,
  channelId,
  isLocal,
  isPinned,
  onTogglePin,
  fillCell,
}: CallParticipantTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [volumeMenu, setVolumeMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isLocal) return; // no self-volume control
      e.preventDefault();
      setVolumeMenu({ x: e.clientX, y: e.clientY });
    },
    [isLocal],
  );

  const isFocused = useFocusStore((s) =>
    isLocal
      ? s.localFocusMode
      : (s.remoteFocusByUserId[participant.userId] ?? false),
  );

  const raisedHands = useCallReactionStore((s) => s.raisedHands);
  const isHandRaised = raisedHands.has(participant.userId);

  // For local user, use uiStore.isMuted (updates instantly on toggle).
  // participant.media.audio only updates after a server round-trip, causing
  // the voice indicator to flash even when muted.
  const localMuted = useUiStore((s) => s.isMuted);
  const isMuted = isLocal ? localMuted : !participant.media.audio;

  // Active speaker highlight — directly toggles data-speaking attr (no re-renders)
  useActiveSpeaker(participant.userId, isLocal, isMuted, tileRef);

  // Look up the member data for profile image + character customization
  const members = useChatV2Store((s) => s.membersByRoomId[channelId]);
  const member = members?.find((m) => m.userId === participant.userId);
  const profileImage = member?.user?.image;
  const characterCustomization = member?.user?.characterCustomization ?? null;

  // Generate sprite face avatar as fallback
  const spriteAvatar = useCharacterFaceAvatar(characterCustomization);

  // O(1) reverse lookup: userId → producerId for remote video
  const producerId = useCallStore(
    (s) => s.userToProducerId[participant.userId],
  );

  // Per-participant connection quality (remote peers only) — surfaces a weak
  // link so a single choppy person is attributable, not just "the call".
  const remoteQuality = useCallStore((s) => s.participantQuality?.[participant.userId]);
  const showWeakLink = !isLocal && (remoteQuality === 'fair' || remoteQuality === 'poor');

  // Mount video element into the tile
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    // Clear previous content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (!participant.media.video) return;

    if (isLocal) {
      // Local self-view
      const stream = VideoChatService.getInstance().getCurrentStream();
      if (!stream) return;

      const videoEl = document.createElement('video');
      videoEl.srcObject = stream;
      videoEl.autoplay = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.style.transform = 'scaleX(-1)';
      container.appendChild(videoEl);

      return () => {
        videoEl.srcObject = null;
        videoEl.remove();
      };
    } else {
      if (!producerId) return;

      let mounted: HTMLVideoElement | null = null;

      const tryAttach = () => {
        if (!container) return;
        const viewer = VideoChatViewer.getInstance();
        const stream = viewer.videoStreams.get(producerId);
        if (!stream) return;

        const videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        mounted = videoEl;
        container.appendChild(videoEl);
      };

      // Try immediately in case stream is already available
      tryAttach();

      // If not yet available, register a listener for stream arrivals
      const viewer = VideoChatViewer.getInstance();
      if (!mounted) {
        viewer.onStateUpdate(tryAttach);
      }

      return () => {
        viewer.offStateUpdate(tryAttach);
        if (mounted) {
          mounted.srcObject = null;
          mounted.remove();
        }
      };
    }
  }, [participant.media.video, participant.userId, isLocal, producerId]);

  const initials = participant.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={tileRef}
      onContextMenu={handleContextMenu}
      className="relative overflow-hidden rounded-lg border wd-border-subtle h-full min-w-0 group/tile wd-speaker-tile"
      style={{
        aspectRatio: fillCell ? 'auto' : '4 / 3',
        backgroundColor: 'var(--wd-surface-panel)',
      }}
    >
      {/* Pin button — top-right. Spotlights this person as the big tile. */}
      {onTogglePin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              aria-pressed={isPinned}
              className={`absolute top-1 right-1 z-10 inline-flex items-center justify-center h-6 w-6 rounded transition-opacity ${
                isPinned
                  ? 'opacity-100 bg-[var(--wd-accent)]/80'
                  : 'opacity-60 group-hover/tile:opacity-100 bg-[var(--wd-surface-base)]/50 hover:bg-[var(--wd-surface-base)]/70'
              }`}
            >
              {isPinned ? (
                <PinOff size={12} className="text-white" />
              ) : (
                <Pin size={12} className="text-white" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={6}>
            {isPinned ? 'Unpin' : 'Pin to spotlight'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Focus mode overlay + badge */}
      {isFocused && (
        <>
          <div className="absolute inset-0 z-[5] pointer-events-none rounded-lg bg-[rgb(var(--wd-surface-base-rgb)/0.45)] wd-focus-overlay" />
          <span
            className="absolute top-1 left-1 z-10 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--wd-warning)] text-[var(--wd-surface-base)]"
          >
            <HeadphoneOff size={10} />
            Focused
          </span>
        </>
      )}

      {/* Background layer: profile pic → sprite → initials */}
      {!participant.media.video && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="wd-speaker-halo">
            {profileImage ? (
              <Image
                src={profileImage}
                alt={participant.displayName}
                width={64}
                height={64}
                className="rounded-full object-cover"
                unoptimized
              />
            ) : spriteAvatar ? (
              <Image
                src={spriteAvatar}
                alt={participant.displayName}
                width={64}
                height={64}
                style={{ imageRendering: 'pixelated' }}
                unoptimized
              />
            ) : (
              <span
                className="inline-flex items-center justify-center h-16 w-16 rounded-full text-xl font-bold"
                style={{
                  backgroundColor: 'var(--wd-surface-elevated)',
                  color: 'var(--wd-text-primary)',
                }}
              >
                {initials}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Video overlay */}
      {participant.media.video && (
        <div ref={videoContainerRef} className="absolute inset-0" />
      )}

      {/* Floating emoji reactions */}
      <FloatingReactionOverlay userId={participant.userId} />

      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2 py-1"
        style={{
          background:
            'linear-gradient(transparent, rgba(0,0,0,0.6))',
        }}
      >
        {isHandRaised && (
          <span className="inline-flex items-center shrink-0 rounded-full px-1 py-0.5 text-[10px] font-semibold bg-[var(--wd-surface-base)] text-[var(--wd-warning)] border border-[var(--wd-warning)]">
            ✋
          </span>
        )}
        <span className="wd-eq" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="text-xs font-medium text-white truncate">
          {participant.displayName}
          {isLocal && (
            <span className="text-white/60 ml-1">(You)</span>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {showWeakLink && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center">
                  <Wifi
                    size={11}
                    style={{
                      color:
                        remoteQuality === 'poor'
                          ? 'var(--wd-danger)'
                          : 'var(--wd-warning)',
                    }}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {remoteQuality === 'poor'
                  ? 'Weak connection — their audio and video may be choppy'
                  : 'Unstable connection'}
              </TooltipContent>
            </Tooltip>
          )}
          {isMuted ? (
            <MicOff size={11} className="text-[var(--wd-danger)]" />
          ) : (
            <Mic size={11} className="text-white/80" />
          )}
          {participant.media.video && (
            <Video size={11} className="text-white/80" />
          )}
          {participant.media.screen && (
            <Monitor size={11} className="text-[var(--wd-info)]" />
          )}
        </div>
      </div>

      {/* Per-participant volume context menu */}
      {volumeMenu && (
        <ParticipantVolumeMenu
          userId={participant.userId}
          displayName={participant.displayName}
          x={volumeMenu.x}
          y={volumeMenu.y}
          onClose={() => setVolumeMenu(null)}
        />
      )}
    </div>
  );
}
