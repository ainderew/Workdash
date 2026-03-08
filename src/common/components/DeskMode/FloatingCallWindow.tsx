import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Phone, Minus, ArrowUpRight } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import useUiStore from '@/common/store/uiStore';
import { useFloatingCallVisibility } from '@/common/hooks/useFloatingCallVisibility';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import { ScreenShareService } from '@/communication/screenShare/screenShare';
import { AudioChat } from '@/communication/audioChat/audioChat';
import CallParticipantTile from './CallParticipantTile';
import CallControlBar from './CallControlBar';
import CallAvatar from './CallAvatar';

const WINDOW_WIDTH = 320;
const WINDOW_HEIGHT_EXPANDED = 268;
const PILL_HEIGHT = 44;
const EDGE_INSET = 16;

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return {
    x: window.innerWidth - WINDOW_WIDTH - EDGE_INSET,
    y: window.innerHeight - WINDOW_HEIGHT_EXPANDED - EDGE_INSET,
  };
}

function snapToNearestCorner(
  pos: { x: number; y: number },
  width: number,
  height: number,
) {
  const centerX = pos.x + width / 2;
  const centerY = pos.y + height / 2;
  const midX = window.innerWidth / 2;
  const midY = window.innerHeight / 2;

  const snapX = centerX < midX ? EDGE_INSET : window.innerWidth - width - EDGE_INSET;
  const snapY = centerY < midY ? EDGE_INSET : window.innerHeight - height - EDGE_INSET;

  return { x: snapX, y: snapY };
}

function clampPosition(
  pos: { x: number; y: number },
  width: number,
  height: number,
) {
  return {
    x: Math.max(EDGE_INSET, Math.min(window.innerWidth - width - EDGE_INSET, pos.x)),
    y: Math.max(EDGE_INSET, Math.min(window.innerHeight - height - EDGE_INSET, pos.y)),
  };
}

export default function FloatingCallWindow() {
  const { shouldShow, channelId, callPresence } = useFloatingCallVisibility();
  const floatingWindowState = useCallStore((s) => s.floatingWindowState);
  const floatingPosition = useCallStore((s) => s.floatingPosition);
  const setFloatingPosition = useCallStore((s) => s.setFloatingPosition);
  const setFloatingWindowState = useCallStore((s) => s.setFloatingWindowState);
  const isMuted = useUiStore((s) => s.isMuted);
  const isVideoOff = useUiStore((s) => s.isVideoOff);
  const isScreenSharing = useCallStore((s) => s.localMedia.screen);
  const roomsById = useChatV2Store((s) => s.roomsById);
  const selectRoom = useChatV2Store((s) => s.selectRoom);
  const userId = typeof window !== 'undefined' ? (window.__BACKEND_USER__?.id ?? 0) : 0;

  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Drag state refs
  const dragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isCollapsed = floatingWindowState === 'collapsed';
  const currentHeight = isCollapsed ? PILL_HEIGHT : WINDOW_HEIGHT_EXPANDED;

  // Initialize position on first show
  useEffect(() => {
    if (shouldShow && !floatingPosition) {
      setFloatingPosition(getDefaultPosition());
    }
  }, [shouldShow, floatingPosition, setFloatingPosition]);

  // Animate in/out
  useEffect(() => {
    if (shouldShow) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [shouldShow]);

  // Recalculate position on window resize (avoid stale closure)
  useEffect(() => {
    if (!shouldShow) return;
    const handleResize = () => {
      const pos = useCallStore.getState().floatingPosition;
      if (pos) {
        setFloatingPosition(clampPosition(pos, WINDOW_WIDTH, currentHeight));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [shouldShow, currentHeight, setFloatingPosition]);

  // Drag handlers
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      hasMoved.current = false;
      setIsDragging(true);
      startMouse.current = { x: e.clientX, y: e.clientY };
      startPos.current = floatingPosition ?? getDefaultPosition();
      lastPos.current = startPos.current;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [floatingPosition],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startMouse.current.x;
      const dy = e.clientY - startMouse.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved.current = true;
      }
      const next = clampPosition(
        { x: startPos.current.x + dx, y: startPos.current.y + dy },
        WINDOW_WIDTH,
        currentHeight,
      );
      lastPos.current = next;
      setFloatingPosition(next);
    },
    [currentHeight, setFloatingPosition],
  );

  const onDragEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);

    // Snap to nearest corner on release
    if (lastPos.current && hasMoved.current) {
      const snapped = snapToNearestCorner(
        lastPos.current,
        WINDOW_WIDTH,
        currentHeight,
      );
      setFloatingPosition(snapped);
    }
  }, [currentHeight, setFloatingPosition]);

  // Call control handlers
  const handleToggleMic = useCallback(() => {
    if (!channelId) return;
    const audio = AudioChat.getInstance();
    const willBeUnmuted = isMuted;
    if (willBeUnmuted) {
      audio.unMuteMic();
    } else {
      audio.muteMic();
    }
    useUiStore.getState().toggleMic();
    CallSignalingService.getInstance().setMedia(channelId, {
      audio: willBeUnmuted,
    });
  }, [channelId, isMuted]);

  const handleToggleVideo = useCallback(async () => {
    if (!channelId) return;
    const videoService = VideoChatService.getInstance();
    if (isVideoOff) {
      try {
        await videoService.startVideoChat();
      } catch (err) {
        console.error('Failed to start video:', err);
        return;
      }
    } else {
      videoService.stopVideoChat();
    }
    useUiStore.getState().toggleVideoCam();
    CallSignalingService.getInstance().setMedia(channelId, {
      video: isVideoOff,
    });
  }, [channelId, isVideoOff]);

  const handleScreenShare = useCallback(async () => {
    if (!channelId) return;
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
    } catch {
      // User cancelled or error
    }
  }, [channelId, isScreenSharing]);

  const handleLeave = useCallback(async () => {
    if (!channelId) return;
    try {
      await CallSignalingService.getInstance().leaveCall(channelId);
    } catch (err) {
      console.error('Failed to leave call:', err);
    }
  }, [channelId]);

  const handleExpandToChannel = useCallback(() => {
    if (!channelId) return;
    void selectRoom(channelId);
  }, [channelId, selectRoom]);

  const handleToggleCollapse = useCallback(() => {
    const next = isCollapsed ? 'expanded' : 'collapsed';
    setFloatingWindowState(next);

    // Adjust Y position when toggling to keep window in bounds
    const pos = useCallStore.getState().floatingPosition;
    if (pos) {
      const newHeight = next === 'collapsed' ? PILL_HEIGHT : WINDOW_HEIGHT_EXPANDED;
      setFloatingPosition(clampPosition(pos, WINDOW_WIDTH, newHeight));
    }
  }, [isCollapsed, setFloatingWindowState, setFloatingPosition]);

  if (!shouldShow || !channelId || !floatingPosition) return null;

  const roomName = roomsById[channelId]?.name ?? 'Call';
  const participants = callPresence?.participants ?? [];

  return (
    <div
      ref={containerRef}
      className={`fixed z-[75] select-none transition-all ${
        isDragging ? 'duration-0' : 'duration-200 ease-out'
      } ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={{
        left: floatingPosition.x,
        top: floatingPosition.y,
        width: WINDOW_WIDTH,
      }}
    >
      <div
        className={`overflow-hidden rounded-xl border wd-border-subtle ${
          isDragging ? 'shadow-2xl scale-[1.02]' : 'shadow-lg'
        } transition-shadow transition-transform duration-150`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--wd-surface-panel) 92%, transparent)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        }}
      >
        {/* Header — drag handle */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 border-b wd-border-subtle"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex items-center justify-center h-5 w-5 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: 'var(--wd-success)' }}
            >
              <Phone size={10} color="#fff" />
            </span>
            <span className="text-xs font-semibold wd-text-primary truncate">
              #{roomName}
            </span>
            <span className="text-[10px] wd-text-muted shrink-0">
              {participants.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Expand to channel */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleExpandToChannel();
              }}
              className="inline-flex items-center justify-center h-5 w-5 rounded wd-text-muted hover:wd-text-primary transition-colors"
              title="Go to call channel"
            >
              <ArrowUpRight size={12} />
            </button>
            {/* Collapse/expand */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCollapse();
              }}
              className="inline-flex items-center justify-center h-5 w-5 rounded wd-text-muted hover:wd-text-primary transition-colors"
              title={isCollapsed ? 'Expand' : 'Minimize'}
            >
              <Minus size={12} />
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {!isCollapsed && (
          <>
            {/* Participant tiles */}
            <div
              className="grid gap-1.5 p-2"
              style={{
                gridTemplateColumns:
                  participants.length <= 1
                    ? '1fr'
                    : 'repeat(2, 1fr)',
                height: 168,
                backgroundColor: 'var(--wd-surface-panel-2)',
              }}
            >
              {participants.slice(0, 4).map((p) => (
                <CallParticipantTile
                  key={p.userId}
                  participant={p}
                  channelId={channelId}
                  isLocal={p.userId === userId}
                />
              ))}
              {participants.length > 4 && (
                <div className="flex items-center justify-center rounded-lg wd-bg-elevated">
                  <div className="flex -space-x-1.5">
                    {participants.slice(4, 7).map((p) => (
                      <CallAvatar
                        key={p.userId}
                        userId={p.userId}
                        displayName={p.displayName}
                        channelId={channelId}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] wd-text-muted ml-1">
                    +{participants.length - 4}
                  </span>
                </div>
              )}
            </div>

            {/* Controls bar */}
            <div className="px-2 py-2 border-t wd-border-subtle">
              <CallControlBar
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                isScreenSharing={isScreenSharing}
                onToggleMic={handleToggleMic}
                onToggleVideo={handleToggleVideo}
                onToggleScreenShare={handleScreenShare}
                onLeave={handleLeave}
                size="sm"
              />
            </div>
          </>
        )}

        {/* Collapsed pill controls */}
        {isCollapsed && (
          <div className="flex items-center justify-center px-2 py-1.5">
            <CallControlBar
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              onToggleMic={handleToggleMic}
              onToggleVideo={handleToggleVideo}
              onToggleScreenShare={handleScreenShare}
              onLeave={handleLeave}
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
