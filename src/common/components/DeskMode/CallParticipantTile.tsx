import React, { useRef, useEffect, useMemo } from 'react';
import { Mic, MicOff, Video, Monitor, Pin, PinOff } from 'lucide-react';
import type { CallParticipant } from '@/common/store/callStore';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { useCharacterFaceAvatar } from '@/common/utils/characterFaceAvatar';
import { VideoChatViewer } from '@/communication/videoChat/videoChatViewer';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import { useActiveSpeaker } from '@/common/hooks/useActiveSpeaker';

interface CallParticipantTileProps {
  participant: CallParticipant;
  channelId: string;
  isLocal: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export default function CallParticipantTile({
  participant,
  channelId,
  isLocal,
  isPinned,
  onTogglePin,
}: CallParticipantTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Active speaker highlight — directly toggles data-speaking attr (no re-renders)
  useActiveSpeaker(
    participant.displayName,
    isLocal,
    !participant.media.audio,
    tileRef,
  );

  // Look up the member data for profile image + character customization
  const members = useChatV2Store((s) => s.membersByRoomId[channelId]);
  const member = members?.find((m) => m.userId === participant.userId);
  const profileImage = member?.user?.image;
  const characterCustomization = member?.user?.characterCustomization ?? null;

  // Generate sprite face avatar as fallback
  const spriteAvatar = useCharacterFaceAvatar(characterCustomization);

  // Producer → userId reverse lookup for remote video (narrowed to this participant only)
  const producerUserMap = useCallStore((s) => s.producerUserMap);
  const producerId = useMemo(
    () =>
      Object.entries(producerUserMap).find(
        ([, uid]) => uid === participant.userId,
      )?.[0],
    [producerUserMap, participant.userId],
  );

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

      let cancelled = false;
      let retryTimer: number | undefined;
      let mounted: HTMLVideoElement | null = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 25; // 5 seconds total (25 × 200ms)

      const attach = () => {
        if (cancelled) return;

        const viewer = VideoChatViewer.getInstance();
        const stream = viewer.videoStreams.get(producerId);

        if (stream) {
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
          return;
        }

        // Video element not ready yet — retry (consumeProducer is async)
        if (++attempts < MAX_ATTEMPTS) {
          retryTimer = window.setTimeout(attach, 200);
        }
      };

      attach();

      return () => {
        cancelled = true;
        if (retryTimer != null) clearTimeout(retryTimer);
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
      className="relative overflow-hidden rounded-lg border wd-border-subtle h-full min-w-0 group/tile wd-speaker-tile"
      style={{
        aspectRatio: '4 / 3',
        backgroundColor: 'var(--wd-surface-panel)',
      }}
    >
      {/* Pin button — top-right, visible on hover or when pinned */}
      {onTogglePin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`absolute top-1 right-1 z-10 inline-flex items-center justify-center h-6 w-6 rounded transition-opacity ${
            isPinned
              ? 'opacity-100 bg-blue-500/80'
              : 'opacity-0 group-hover/tile:opacity-100 bg-black/50 hover:bg-black/70'
          }`}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          {isPinned ? (
            <PinOff size={12} className="text-white" />
          ) : (
            <Pin size={12} className="text-white" />
          )}
        </button>
      )}

      {/* Background layer: profile pic → sprite → initials */}
      {!participant.media.video && (
        <div className="absolute inset-0 flex items-center justify-center">
          {profileImage ? (
            <img
              src={profileImage}
              alt={participant.displayName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : spriteAvatar ? (
            <img
              src={spriteAvatar}
              alt={participant.displayName}
              className="h-16 w-16"
              style={{ imageRendering: 'pixelated' }}
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
        </div>
      )}

      {/* Video overlay */}
      {participant.media.video && (
        <div ref={videoContainerRef} className="absolute inset-0" />
      )}

      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2 py-1"
        style={{
          background:
            'linear-gradient(transparent, rgba(0,0,0,0.6))',
        }}
      >
        <span className="text-xs font-medium text-white truncate">
          {participant.displayName}
          {isLocal && (
            <span className="text-white/60 ml-1">(You)</span>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {participant.media.audio ? (
            <Mic size={11} className="text-white/80" />
          ) : (
            <MicOff size={11} className="text-red-400" />
          )}
          {participant.media.video && (
            <Video size={11} className="text-white/80" />
          )}
          {participant.media.screen && (
            <Monitor size={11} className="text-blue-400" />
          )}
        </div>
      </div>
    </div>
  );
}
