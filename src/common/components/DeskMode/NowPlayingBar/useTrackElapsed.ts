import { useEffect, useState, useRef } from 'react';
import { MusicClientService } from '@/communication/music/musicService';
import type { MusicSessionState } from '@/common/store/musicStore';

const RESYNC_GRACE_MS = 3000;

export function useTrackElapsed(
  session: MusicSessionState | null,
  workspaceId: string | null,
): number {
  const [elapsed, setElapsed] = useState(0);
  const trackKeyRef = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = session?.currentTrack?.title ?? null;
  const duration = session?.currentTrack?.duration ?? 0;
  const isPlaying = session?.state === 'playing';
  const serverElapsed = session?.elapsedSeconds;

  // Reset elapsed & cancel pending sync when track changes
  useEffect(() => {
    if (title === trackKeyRef.current) return;
    trackKeyRef.current = title;
    setElapsed(0);
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, [title]);

  // Sync from server-reported elapsed when it arrives (e.g. fetchState, state-changed)
  useEffect(() => {
    if (serverElapsed !== undefined && serverElapsed > 0) {
      setElapsed(serverElapsed);
    }
  }, [serverElapsed]);

  // Tick every second while playing, capped at duration
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setElapsed((prev) => {
        if (duration > 0 && prev >= duration) return prev;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, duration]);

  // One-shot re-sync when elapsed reaches duration
  useEffect(() => {
    if (!workspaceId || !isPlaying || duration <= 0) return;
    if (elapsed < duration) return;
    if (syncTimerRef.current) return; // already scheduled

    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      MusicClientService.getInstance().fetchState(workspaceId);
    }, RESYNC_GRACE_MS);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [elapsed, duration, isPlaying, workspaceId]);

  return elapsed;
}
