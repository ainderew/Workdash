import { useEffect, useRef } from 'react';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';

const SILENT_STATUSES = new Set(['focus', 'offline']);

/**
 * Plays a notification sound when a new unread message arrives
 * in a room the user is NOT currently viewing.
 * Respects user status: suppressed when focus or offline.
 *
 * Follows the PollNotification.tsx audio-priming pattern to
 * handle browser autoplay policies.
 */
export function useChatNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEnabledRef = useRef(false);
  const prevUnreadRef = useRef<Record<string, number> | null>(null);

  const unreadByRoomId = useChatV2Store((state) => state.unreadByRoomId);
  const currentRoomId = useChatV2Store((state) => state.currentRoomId);
  const myStatusId = usePresenceStore((state) => state.myStatus.statusId);

  // Prime the audio element on first user interaction
  useEffect(() => {
    audioRef.current = new Audio('/assets/sounds/notification.mp3');
    audioRef.current.volume = 0.3;
    audioRef.current.preload = 'auto';

    const enableAudio = () => {
      if (!audioEnabledRef.current && audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current?.pause();
            audioRef.current!.currentTime = 0;
            audioEnabledRef.current = true;
          })
          .catch(() => {});
      }
    };

    window.addEventListener('click', enableAudio, { once: true });
    window.addEventListener('keydown', enableAudio, { once: true });

    return () => {
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };
  }, []);

  // Detect new unreads and play sound
  useEffect(() => {
    const prev = prevUnreadRef.current;

    // Skip initial hydration
    if (prev === null) {
      prevUnreadRef.current = { ...unreadByRoomId };
      return;
    }

    let shouldPlay = false;
    for (const roomId in unreadByRoomId) {
      if (roomId === currentRoomId) continue;
      const current = unreadByRoomId[roomId] ?? 0;
      const previous = prev[roomId] ?? 0;
      if (current > previous) {
        shouldPlay = true;
        break;
      }
    }

    prevUnreadRef.current = { ...unreadByRoomId };

    if (shouldPlay && !SILENT_STATUSES.has(myStatusId) && audioEnabledRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [unreadByRoomId, currentRoomId, myStatusId]);
}
