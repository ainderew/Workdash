import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Phone } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import { ScreenShareService } from '@/communication/screenShare/screenShare';
import { AudioChat } from '@/communication/audioChat/audioChat';
import { logger } from '@/common/utils/logger';
import useUiStore from '@/common/store/uiStore';
import useUserStore from '@/common/store/useStore';
import { VideoChatViewer } from '@/communication/videoChat/videoChatViewer';
import CallAvatar from './CallAvatar';
import CallControlBar from './CallControlBar';
import CallTileGrid from './call-tiles/CallTileGrid';
import { ScreenShareViewer } from '@/communication/screenShare/screenShareViewer';

interface CallViewProps {
  channelId: string;
  onLeave: () => void;
  onPictureInPicture?: () => void;
  onFullscreen?: () => void;
}

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 140;

export default function CallView({ channelId, onLeave, onPictureInPicture, onFullscreen }: CallViewProps) {
  const call = useCallStore((s) => s.activeCallsByChannel[channelId]);
  const backendUser = useUserStore((s) => s.backendUser);
  const userId = backendUser?.id ?? 0;
  const isMuted = useUiStore((s) => s.isMuted);
  const isVideoOff = useUiStore((s) => s.isVideoOff);

  // Load room members so tiles can resolve profile images + character data
  const membersByRoomId = useChatV2Store((s) => s.membersByRoomId);
  const loadRoomMembers = useChatV2Store((s) => s.loadRoomMembers);

  const isScreenSharing = useCallStore((s) => s.localMedia.screen);

  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startH.current = height;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [height],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH.current + delta)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Eagerly initialise media viewers so `newProducer` listeners are active
  // before any tiles render, and fetch any producers we may have missed.
  useEffect(() => {
    const viewer = VideoChatViewer.getInstance();
    viewer.loadExistingProducers();

    const screenViewer = ScreenShareViewer.getInstance();
    // Set callback so displayVideo() doesn't bail when ScreenShareUi is unmounted in desk mode
    const prevCallback = screenViewer.updateComponentStateCallback;
    screenViewer.updateComponentStateCallback = () => {};
    screenViewer.loadExistingProducers();

    const audio = AudioChat.getInstance();
    audio.watchNewProducers();
    audio.loadExistingProducers();

    return () => {
      // Restore previous callback (world-mode ScreenShareUi may re-mount)
      screenViewer.updateComponentStateCallback = prevCallback;
    };
  }, []);

  // Re-fetch audio producers when a new participant joins so existing
  // participants discover the joiner's pre-existing producer (created at
  // app load, before they entered the call).
  const participantCount = call?.participants.length ?? 0;
  const initialFetchDone = useRef(false);
  useEffect(() => {
    // Skip the initial mount — the effect above already fetches producers.
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      return;
    }
    if (participantCount > 0) {
      AudioChat.getInstance().loadExistingProducers();
      VideoChatViewer.getInstance().loadExistingProducers();
    }
  }, [participantCount]);

  useEffect(() => {
    if (!membersByRoomId[channelId]) {
      loadRoomMembers(channelId);
    }
  }, [channelId, membersByRoomId, loadRoomMembers]);

  if (!call) return null;

  const handleToggleMic = () => {
    const audio = AudioChat.getInstance();
    const willBeUnmuted = isMuted;
    if (willBeUnmuted) {
      audio.unMuteMic();
    } else {
      audio.muteMic();
    }
    CallSignalingService.getInstance().setMedia(channelId, {
      audio: willBeUnmuted,
    });
  };

  const handleToggleVideo = async () => {
    const videoService = VideoChatService.getInstance();
    if (isVideoOff) {
      try {
        await videoService.startVideoChat();
      } catch (err) {
        logger.error('Failed to start video:', err);
        return;
      }
    } else {
      videoService.stopVideoChat();
    }
    useUiStore.getState().toggleVideoCam();
    CallSignalingService.getInstance().setMedia(channelId, {
      video: isVideoOff,
    });
  };

  const handleScreenShare = async () => {
    const service = ScreenShareService.getInstance();
    if (isScreenSharing) {
      service.stopScreenShare();
      useCallStore.getState().setLocalMedia({ screen: false });
      return;
    }
    try {
      await service.startScreenShare();
      useCallStore.getState().setLocalMedia({ screen: true });
      CallSignalingService.getInstance().setMedia(channelId, {
        screen: true,
      });
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')) return;
      logger.error('Screen share failed:', err);
    }
  };

  if (collapsed) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b wd-border-subtle wd-bg-panel">
        {/* Left: avatars + participant count */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center justify-center h-5 w-5 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: 'var(--wd-success)' }}
          >
            <Phone size={11} color="#fff" />
          </span>

          <div className="flex -space-x-1.5 shrink-0">
            {call.participants.slice(0, 4).map((p) => (
              <CallAvatar key={p.userId} userId={p.userId} displayName={p.displayName} channelId={channelId} />
            ))}
            {call.participants.length > 4 && (
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[8px] font-bold border wd-border-subtle"
                style={{ backgroundColor: 'var(--wd-surface-elevated)', color: 'var(--wd-text-muted)' }}
              >
                +{call.participants.length - 4}
              </span>
            )}
          </div>

          <span className="text-xs wd-text-muted truncate">
            {call.participants.length} in call
          </span>
        </div>

        {/* Right: compact controls */}
        <CallControlBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          onToggleMic={handleToggleMic}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleScreenShare}
          onLeave={onLeave}
          displayModeProps={{
            isCollapsed: true,
            onToggleCollapse: () => setCollapsed(false),
            onPictureInPicture,
            onToggleFullscreen: onFullscreen,
          }}
          size="sm"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b wd-border-subtle">
      {/* Participant tiles — resizable container, tiles maintain aspect ratio */}
      <CallTileGrid
        participants={call.participants}
        channelId={channelId}
        localUserId={userId}
        height={height}
      />

      {/* Drag handle */}
      <div
        className="h-3 cursor-row-resize flex items-center justify-center group"
        style={{ backgroundColor: 'var(--wd-surface-panel)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="w-12 h-1 rounded-full transition-colors group-hover:opacity-100 opacity-60"
          style={{ backgroundColor: 'var(--wd-text-muted)' }}
        />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 wd-bg-panel">
        <CallControlBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          onToggleMic={handleToggleMic}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleScreenShare}
          onLeave={onLeave}
          displayModeProps={{
            isCollapsed: false,
            onToggleCollapse: () => setCollapsed(true),
            onPictureInPicture,
            onToggleFullscreen: onFullscreen,
          }}
        />
      </div>
    </div>
  );
}
