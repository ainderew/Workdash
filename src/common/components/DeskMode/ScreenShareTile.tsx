import React, { useRef, useEffect, useCallback } from 'react';
import { Monitor, Pin, PinOff } from 'lucide-react';
import type { CallParticipant } from '@/common/store/callStore';
import useCallStore from '@/common/store/callStore';
import { ScreenShareViewer } from '@/communication/screenShare/screenShareViewer';
import { ScreenShareService } from '@/communication/screenShare/screenShare';

interface ScreenShareTileProps {
  participant: CallParticipant;
  isLocal: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export default function ScreenShareTile({
  participant,
  isLocal,
  isPinned,
  onTogglePin,
}: ScreenShareTileProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);

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
    const container = videoContainerRef.current;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const stream = ScreenShareService.getInstance().getCurrentStream();
    if (!stream) return;

    const videoEl = document.createElement('video');
    videoEl.srcObject = stream;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.style.width = '100%';
    videoEl.style.height = '100%';
    videoEl.style.objectFit = 'contain';
    videoEl.style.backgroundColor = '#000';
    container.appendChild(videoEl);

    return () => {
      videoEl.srcObject = null;
      videoEl.remove();
    };
  }, [isLocal, participant.userId]);

  // Remote view effect — only depends on producerId
  useEffect(() => {
    if (isLocal) return;
    if (!producerId) return;
    const container = videoContainerRef.current;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    let cancelled = false;
    let retryTimer: number | undefined;
    let mounted: HTMLVideoElement | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 25; // 5 seconds total (25 x 200ms)

    const attach = () => {
      if (cancelled) return;

      const viewer = ScreenShareViewer.getInstance();
      const sourceEl = viewer.videoElements.get(producerId);

      if (sourceEl?.srcObject) {
        const videoEl = document.createElement('video');
        videoEl.srcObject = sourceEl.srcObject;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'contain';
        videoEl.style.backgroundColor = '#000';
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
  }, [isLocal, producerId]);

  return (
    <div
      className="relative overflow-hidden rounded-lg border wd-border-subtle h-full min-w-0 group/tile"
      style={{
        aspectRatio: '16 / 9',
        backgroundColor: '#000',
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

      {/* Video container */}
      <div ref={videoContainerRef} className="absolute inset-0" />

      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2 py-1"
        style={{
          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
        }}
      >
        <Monitor size={11} className="text-blue-400 shrink-0" />
        <span className="text-xs font-medium text-white truncate">
          {participant.displayName}
          <span className="text-white/60 ml-1">(Screen)</span>
        </span>
      </div>
    </div>
  );
}
