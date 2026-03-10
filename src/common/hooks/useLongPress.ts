import { useCallback, useRef } from 'react';

type UseLongPressOptions = {
  delay?: number;
  onLongPressStart?: () => void;
};

export function useLongPress(
  callback: () => void,
  opts?: UseLongPressOptions,
) {
  const delay = opts?.delay ?? 500;
  const timerRef = useRef<number | null>(null);
  const didLongPressRef = useRef(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      didLongPressRef.current = false;
      originRef.current = { x: e.clientX, y: e.clientY };
      clear();
      timerRef.current = window.setTimeout(() => {
        didLongPressRef.current = true;
        timerRef.current = null;
        callback();
      }, delay);
      opts?.onLongPressStart?.();
    },
    [callback, delay, clear, opts?.onLongPressStart],
  );

  const onPointerUp = useCallback(() => {
    clear();
    originRef.current = null;
  }, [clear]);

  const onPointerLeave = useCallback(() => {
    clear();
    originRef.current = null;
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
    originRef.current = null;
  }, [clear]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!originRef.current) return;
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      if (dx * dx + dy * dy > 100) {
        clear();
        originRef.current = null;
      }
    },
    [clear],
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const shouldSuppressClick = useCallback(() => {
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onPointerMove,
    onContextMenu,
    shouldSuppressClick,
  };
}
