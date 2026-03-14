import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Phone, Minus, ArrowUpRight, Pause, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import useUiStore from '@/common/store/uiStore';
import useUserStore from '@/common/store/useStore';
import { useFloatingCallVisibility } from '@/common/hooks/useFloatingCallVisibility';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';
import { VideoChatService } from '@/communication/videoChat/videoChat';
import { ScreenShareService } from '@/communication/screenShare/screenShare';
import { ScreenShareViewer } from '@/communication/screenShare/screenShareViewer';
import { AudioChat } from '@/communication/audioChat/audioChat';
import { VideoChatViewer } from '@/communication/videoChat/videoChatViewer';
import CallControlBar from './CallControlBar';
import FloatingTileGrid from './call-tiles/FloatingTileGrid';

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
  const { shouldShow, channelId, callPresence, isInDifferentWorkspace, callWorkspaceId } =
    useFloatingCallVisibility();
  const floatingWindowState = useCallStore((s) => s.floatingWindowState);
  const floatingPosition = useCallStore((s) => s.floatingPosition);
  const setFloatingPosition = useCallStore((s) => s.setFloatingPosition);
  const setFloatingWindowState = useCallStore((s) => s.setFloatingWindowState);
  const channelContentRect = useCallStore((s) => s.channelContentRect);
  const isMuted = useUiStore((s) => s.isMuted);
  const isVideoOff = useUiStore((s) => s.isVideoOff);
  const isScreenSharing = useCallStore((s) => s.localMedia.screen);
  const roomsById = useChatV2Store((s) => s.roomsById);
  const selectRoom = useChatV2Store((s) => s.selectRoom);
  const backendUser = useUserStore((s) => s.backendUser);
  const userId = backendUser?.id ?? 0;

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
  const isFullscreen = floatingWindowState === 'fullscreen';
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

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFloatingWindowState('expanded');
        const pos = useCallStore.getState().floatingPosition;
        if (pos) {
          setFloatingPosition(clampPosition(pos, WINDOW_WIDTH, WINDOW_HEIGHT_EXPANDED));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, setFloatingWindowState, setFloatingPosition]);

  // Pause/resume all media streams when switching workspaces mid-call
  const prevInDifferentWs = useRef(false);
  useEffect(() => {
    if (!shouldShow) return;
    if (isInDifferentWorkspace === prevInDifferentWs.current) return;
    prevInDifferentWs.current = isInDifferentWorkspace;

    const audio = AudioChat.getInstance();
    const videoProducer = VideoChatService.getInstance();
    const screenProducer = ScreenShareService.getInstance();
    const videoViewer = VideoChatViewer.getInstance();
    const screenViewer = ScreenShareViewer.getInstance();

    if (isInDifferentWorkspace) {
      // Pause all producers (outbound)
      audio.muteMic();
      videoProducer.pauseProducer();
      screenProducer.pauseProducer();
      // Pause all consumers (inbound)
      audio.enableFocusMode();
      videoViewer.pauseAllConsumers();
      screenViewer.pauseAllConsumers();
    } else {
      // Resume producers — respect user's prior mute/video state
      const wasMuted = useUiStore.getState().isMuted;
      if (!wasMuted) {
        audio.unMuteMic();
      }
      const wasVideoOff = useUiStore.getState().isVideoOff;
      if (!wasVideoOff) {
        videoProducer.resumeProducer();
      }
      const wasScreenSharing = useCallStore.getState().localMedia.screen;
      if (wasScreenSharing) {
        screenProducer.resumeProducer();
      }
      // Resume all consumers (inbound)
      audio.disableFocusMode();
      videoViewer.resumeAllConsumers();
      screenViewer.resumeAllConsumers();
    }
  }, [shouldShow, isInDifferentWorkspace]);

  // Drag handlers
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || isFullscreen) return;
      dragging.current = true;
      hasMoved.current = false;
      setIsDragging(true);
      startMouse.current = { x: e.clientX, y: e.clientY };
      startPos.current = floatingPosition ?? getDefaultPosition();
      lastPos.current = startPos.current;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [floatingPosition, isFullscreen],
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

    // Keep window where the user dropped it (clamped to viewport)
    if (lastPos.current && hasMoved.current) {
      setFloatingPosition(clampPosition(lastPos.current, WINDOW_WIDTH, currentHeight));
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

  const setSelectedWorkspaceId = useChatV2Store((s) => s.setSelectedWorkspaceId);

  const handleReturnToCall = useCallback(() => {
    if (!channelId || !callWorkspaceId) return;
    setSelectedWorkspaceId(callWorkspaceId);
    useCallStore.getState().setManualFloating(false);
    void selectRoom(channelId);
  }, [channelId, callWorkspaceId, setSelectedWorkspaceId, selectRoom]);

  const handleExpandToChannel = useCallback(() => {
    if (!channelId) return;
    if (isInDifferentWorkspace && callWorkspaceId) {
      setSelectedWorkspaceId(callWorkspaceId);
    }
    useCallStore.getState().setManualFloating(false);
    void selectRoom(channelId);
  }, [channelId, isInDifferentWorkspace, callWorkspaceId, setSelectedWorkspaceId, selectRoom]);

  const handleToggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      setFloatingWindowState('expanded');
      const pos = useCallStore.getState().floatingPosition;
      if (pos) {
        setFloatingPosition(clampPosition(pos, WINDOW_WIDTH, WINDOW_HEIGHT_EXPANDED));
      }
    } else {
      setFloatingWindowState('fullscreen');
    }
  }, [isFullscreen, setFloatingWindowState, setFloatingPosition]);

  const handleToggleCollapse = useCallback(() => {
    const next = isCollapsed || isFullscreen ? 'collapsed' : 'expanded';
    setFloatingWindowState(isCollapsed ? 'expanded' : 'collapsed');

    // Adjust Y position when toggling to keep window in bounds
    const pos = useCallStore.getState().floatingPosition;
    if (pos) {
      const newHeight = next === 'collapsed' ? PILL_HEIGHT : WINDOW_HEIGHT_EXPANDED;
      setFloatingPosition(clampPosition(pos, WINDOW_WIDTH, newHeight));
    }
  }, [isCollapsed, isFullscreen, setFloatingWindowState, setFloatingPosition]);

  if (!shouldShow || !channelId || !floatingPosition) return null;

  const roomName = roomsById[channelId]?.name ?? 'Call';
  const participants = callPresence?.participants ?? [];

  return (
    <div
      ref={containerRef}
      className={`fixed z-[75] select-none transition-all motion-reduce:duration-0 ${
        isDragging ? 'duration-0' : 'duration-200 ease-out'
      } ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={
        isFullscreen && channelContentRect
          ? {
              left: channelContentRect.x,
              top: channelContentRect.y,
              width: channelContentRect.width,
              height: channelContentRect.height,
            }
          : {
              left: floatingPosition.x,
              top: floatingPosition.y,
              width: WINDOW_WIDTH,
            }
      }
    >
      <div
        className={`overflow-hidden border wd-border-subtle ${
          isFullscreen ? 'rounded-none h-full flex flex-col' : 'rounded-xl'
        } ${
          isDragging ? 'shadow-2xl scale-[1.02]' : isFullscreen ? 'shadow-none' : 'shadow-lg'
        } transition-shadow transition-transform duration-150 motion-reduce:duration-0`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--wd-surface-panel) 92%, transparent)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        }}
      >
        {/* Header — drag handle */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 border-b wd-border-subtle"
          style={{ cursor: isFullscreen ? 'default' : isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center justify-center h-5 w-5 rounded-full shrink-0 ${
                isInDifferentWorkspace ? '' : 'animate-pulse'
              }`}
              style={{
                backgroundColor: isInDifferentWorkspace
                  ? 'var(--wd-warning, #f59e0b)'
                  : 'var(--wd-success)',
              }}
            >
              {isInDifferentWorkspace ? (
                <Pause size={10} color="#fff" />
              ) : (
                <Phone size={10} color="#fff" />
              )}
            </span>
            <span className="text-xs font-semibold wd-text-primary truncate">
              #{roomName}
            </span>
            {isInDifferentWorkspace && (
              <span
                className="text-[10px] font-medium shrink-0 px-1 rounded"
                style={{ color: 'var(--wd-warning, #f59e0b)' }}
              >
                Paused
              </span>
            )}
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
            {/* Fullscreen toggle (only shown when not collapsed) */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFullscreen();
                }}
                className="inline-flex items-center justify-center h-5 w-5 rounded wd-text-muted hover:wd-text-primary transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            )}
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
          <div className={isFullscreen ? 'flex-1 min-h-0 flex flex-col' : ''}>
            {isInDifferentWorkspace ? (
              /* Paused overlay — replaces participant tiles */
              <div
                className={`flex flex-col items-center justify-center gap-3 p-4 ${isFullscreen ? 'flex-1' : ''}`}
                style={{
                  ...(isFullscreen ? {} : { height: 168 }),
                  backgroundColor: 'var(--wd-surface-panel-2)',
                }}
              >
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-full"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--wd-warning, #f59e0b) 20%, transparent)' }}
                >
                  <Pause
                    size={20}
                    style={{ color: 'var(--wd-warning, #f59e0b)' }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold wd-text-primary">
                    Call paused
                  </p>
                  <p className="text-[10px] wd-text-muted mt-0.5">
                    You&apos;re in another workspace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReturnToCall}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors wd-btn-primary"
                >
                  <ArrowLeft size={12} />
                  Return to call
                </button>
              </div>
            ) : (
              /* Normal participant tiles */
              <FloatingTileGrid
                participants={participants}
                channelId={channelId}
                localUserId={userId}
                fillHeight={isFullscreen}
              />
            )}

            {/* Controls bar — only leave + return when paused */}
            <div className="px-2 py-2 border-t wd-border-subtle">
              {isInDifferentWorkspace ? (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleReturnToCall}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium wd-text-muted hover:wd-text-primary transition-colors"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--wd-warning, #f59e0b) 15%, transparent)',
                    }}
                    title="Return to call"
                  >
                    <ArrowLeft size={11} />
                    Return
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeave();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--wd-danger, #ef4444) 15%, transparent)',
                      color: 'var(--wd-danger, #ef4444)',
                    }}
                    title="Leave call"
                  >
                    <Phone size={11} />
                    Leave
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        )}

        {/* Collapsed pill controls */}
        {isCollapsed && (
          <div className="flex items-center justify-center px-2 py-1.5">
            {isInDifferentWorkspace ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReturnToCall}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium wd-text-muted hover:wd-text-primary transition-colors"
                  title="Return to call"
                >
                  <ArrowLeft size={10} />
                  Return
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLeave();
                  }}
                  className="inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--wd-danger, #ef4444) 15%, transparent)',
                    color: 'var(--wd-danger, #ef4444)',
                  }}
                  title="Leave call"
                >
                  <Phone size={10} />
                </button>
              </div>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
