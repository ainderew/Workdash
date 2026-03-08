import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, Monitor } from 'lucide-react';
import type { CallParticipant } from '@/common/store/callStore';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { useCharacterFaceAvatar } from '@/common/utils/characterFaceAvatar';
import { VideoChatViewer } from '@/communication/videoChat/videoChatViewer';
import { VideoChatService } from '@/communication/videoChat/videoChat';

interface CallParticipantTileProps {
  participant: CallParticipant;
  channelId: string;
  isLocal: boolean;
}

export default function CallParticipantTile({
  participant,
  channelId,
  isLocal,
}: CallParticipantTileProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Look up the member data for profile image + character customization
  const members = useChatV2Store((s) => s.membersByRoomId[channelId]);
  const member = members?.find((m) => m.userId === participant.userId);
  const profileImage = member?.user?.image;
  const characterCustomization = member?.user?.characterCustomization ?? null;

  // Generate sprite face avatar as fallback
  const spriteAvatar = useCharacterFaceAvatar(characterCustomization);

  // Producer → userId reverse lookup for remote video
  const producerUserMap = useCallStore((s) => s.producerUserMap);

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
      // Remote video — find producerId for this user
      const producerId = Object.entries(producerUserMap).find(
        ([, uid]) => uid === participant.userId,
      )?.[0];

      if (!producerId) return;

      const viewer = VideoChatViewer.instance;
      const videoEl = viewer?.videoElements.get(producerId);
      if (!videoEl) return;

      // Clone the video element so we don't steal it from old location
      const clone = videoEl.cloneNode(true) as HTMLVideoElement;
      clone.style.width = '100%';
      clone.style.height = '100%';
      clone.style.objectFit = 'cover';
      clone.style.backgroundColor = 'transparent';

      // Re-attach the stream from the original
      if (videoEl.srcObject) {
        clone.srcObject = videoEl.srcObject;
      }

      container.appendChild(clone);

      return () => {
        clone.srcObject = null;
        clone.remove();
      };
    }
  }, [participant.media.video, participant.userId, isLocal, producerUserMap]);

  const initials = participant.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="relative overflow-hidden rounded-lg border wd-border-subtle flex-1 min-w-0"
      style={{ backgroundColor: 'var(--wd-surface-panel)' }}
    >
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
