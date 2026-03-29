import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Monitor, Pin, PinOff } from 'lucide-react';
import { ScreenShareLoadingIndicator } from '@/common/components/ScreenShare/ScreenShareLoadingIndicator';
import type { CallParticipant } from '@/common/store/callStore';
import useCallStore from '@/common/store/callStore';
import { ScreenShareViewer } from '@/communication/screenShare/screenShareViewer';
import { ScreenShareService } from '@/communication/screenShare/screenShare';

interface ScreenShareTileProps {
  participant: CallParticipant;
  isLocal: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  /** When true, fill the parent cell instead of enforcing 16:9 aspect ratio */
  fillCell?: boolean;
}

export default function ScreenShareTile({
  participant,
  isLocal,
  isPinned,
  onTogglePin,
  fillCell,
}: ScreenShareTileProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Targeted selector: only re-renders when THIS participant's producerId changes
  const producerId = useCallStore(
    useCallback(
      (s) =>
        Object.entries(s.screenProducerUserMap).find(
          ([, uid]) => uid === participant.userId,
        )?.[0],
      [participant.userId],
    ),
  );

  // Local self-view effect — only depends on isLocal + participant identity
  useEffect(() => {
    if (!isLocal) return;
    setIsLoading(true);
    const container = videoContainerRef.current;
    if (!container) return;

    let disposed = false;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const stream = ScreenShareService.getInstance().getCurrentStream();
    if (!stream) {
      setIsLoading(false);
      return;
    }

    const videoEl = document.createElement('video');
    videoEl.srcObject = stream;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.style.width = '100%';
    videoEl.style.height = '100%';
    videoEl.style.objectFit = 'contain';
    videoEl.style.backgroundColor = 'var(--wd-surface-base)';
    videoEl.addEventListener('loadeddata', () => {
      if (!disposed) setIsLoading(false);
    }, { once: true });
    container.appendChild(videoEl);

    return () => {
      disposed = true;
      videoEl.srcObject = null;
      videoEl.remove();
    };
  }, [isLocal, participant.userId]);

  // Remote view effect — subscribes to viewer changes so it reacts when
  // consumeProducer completes (even after retries), instead of blind-polling.
  useEffect(() => {
    if (isLocal) return;
    if (!producerId) return;
    setIsLoading(true);
    const container = videoContainerRef.current;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    let cancelled = false;
    let mounted: HTMLVideoElement | null = null;

    const tryAttach = (): boolean => {
      if (cancelled) return true;
      const viewer = ScreenShareViewer.getInstance();
      const sourceEl = viewer.videoElements.get(producerId);
      if (!sourceEl?.srcObject) return false;

      const videoEl = document.createElement('video');
      videoEl.srcObject = sourceEl.srcObject;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'contain';
      videoEl.style.backgroundColor = 'var(--wd-surface-base)';
      videoEl.addEventListener('loadeddata', () => {
        if (!cancelled) setIsLoading(false);
      }, { once: true });
      mounted = videoEl;
      container.appendChild(videoEl);
      return true;
    };

    // Try immediately — the video element may already exist
    if (tryAttach()) return () => { cancelled = true; };

    // Subscribe to viewer notifications — fires when consumeProducer
    // completes (including after retries) and calls displayVideo().
    const viewer = ScreenShareViewer.getInstance();
    const unsub = viewer.subscribe(() => {
      if (cancelled) return;
      if (tryAttach()) unsub();
    });

    // Safety timeout: stop waiting after 30s (covers 4 consume attempts
    // with exponential backoff: 0s + 1s + 2s + 4s + consume timeouts)
    const safetyTimer = window.setTimeout(() => {
      if (!cancelled && !mounted) {
        unsub();
        setIsLoading(false);
      }
    }, 30_000);

    return () => {
      cancelled = true;
      unsub();
      clearTimeout(safetyTimer);
      if (mounted) {
        mounted.srcObject = null;
        mounted.remove();
      }
    };
  }, [isLocal, producerId]);

  return (
    <div
      className="relative overflow-hidden rounded-lg border wd-border-subtle h-full min-w-0 group/tile"
      style={{
        aspectRatio: fillCell ? 'auto' : '16 / 9',
        backgroundColor: 'var(--wd-surface-base)',
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
              ? 'opacity-100 bg-[var(--wd-accent)]/80'
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

      {/* Video container */}
      <div ref={videoContainerRef} className="absolute inset-0" />

      {/* Loading indicator */}
      {isLoading && <ScreenShareLoadingIndicator />}

      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2 py-1"
        style={{
          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
        }}
      >
        <Monitor size={11} className="text-[var(--wd-accent)] shrink-0" />
        <span className="text-xs font-medium text-white truncate">
          {participant.displayName}
          <span className="text-white/60 ml-1">(Screen)</span>
        </span>
      </div>
    </div>
  );
}
