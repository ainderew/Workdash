import { useEffect, useRef } from 'react';
import { StatusClientService } from '@/communication/status/statusService';

const HEARTBEAT_INTERVAL_MS = 30_000;

export function useActivityHeartbeat(enabled: boolean): void {
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const sendHeartbeat = () => {
      const now = Date.now();
      if (now - lastSentRef.current < HEARTBEAT_INTERVAL_MS) return;
      if (!StatusClientService.isInitialized()) return;
      lastSentRef.current = now;
      StatusClientService.getInstance().emitActivityHeartbeat();
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    for (const event of events) {
      window.addEventListener(event, sendHeartbeat, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      for (const event of events) {
        window.removeEventListener(event, sendHeartbeat);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}
