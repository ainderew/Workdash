import React from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import useCallStore from '@/common/store/callStore';

/**
 * In-call banner for transport (ICE/DTLS) trouble. Without it, a dropped media
 * path freezes the call silently — this tells the user what's happening while
 * the service attempts to rebuild the connection.
 */
export default function CallConnectionNotice() {
  const state = useCallStore((s) => s.mediaConnectionState);
  const inCall = useCallStore((s) => s.currentCall);

  if (!inCall || state === 'connected') return null;

  const reconnecting = state === 'reconnecting';
  const accent = reconnecting ? 'var(--wd-warning)' : 'var(--wd-danger)';

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-[2] flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-b"
      style={{
        borderColor: accent,
        backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
        color: accent,
      }}
    >
      {reconnecting ? (
        <Loader2 size={13} className="shrink-0 motion-safe:animate-spin" />
      ) : (
        <WifiOff size={13} className="shrink-0" />
      )}
      <span className="truncate">
        {reconnecting
          ? 'Reconnecting — your audio and video may drop for a moment.'
          : 'Connection lost. Trying to restore your call…'}
      </span>
    </div>
  );
}
