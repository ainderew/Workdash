import { useEffect, useRef } from 'react';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';

const SILENT_STATUSES = new Set(['focus', 'offline']);

let activeInstanceCount = 0;

/**
 * Plays a notification sound when a new unread message arrives
 * in a room the user is NOT currently viewing.
 * Respects user status: suppressed when focus or offline.
 * Only the first mounted instance plays sound (singleton guard).
 */
export function useChatNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEnabledRef = useRef(false);
  const prevUnreadRef = useRef<Record<string, number> | null>(null);
  const isOwnerRef = useRef(false);

  const unreadByRoomId = useChatV2Store((state) => state.unreadByRoomId);
  const currentRoomId = useChatV2Store((state) => state.currentRoomId);
  const selectedWorkspaceId = useChatV2Store((state) => state.selectedWorkspaceId);
  const roomsById = useChatV2Store((state) => state.roomsById);
  const myStatusId = usePresenceStore((state) => state.myStatus.statusId);

  // Prime the audio element on first user interaction (singleton)
  useEffect(() => {
    activeInstanceCount++;
    isOwnerRef.current = activeInstanceCount === 1;

    if (!isOwnerRef.current) return;

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
      activeInstanceCount--;
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('keydown', enableAudio);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      audioEnabledRef.current = false;
    };
  }, []);

  // Detect new unreads and play sound
  useEffect(() => {
    if (!isOwnerRef.current) return;

    const prev = prevUnreadRef.current;

    // Skip initial hydration
    if (prev === null) {
      prevUnreadRef.current = { ...unreadByRoomId };
      return;
    }

    let shouldPlay = false;
    for (const roomId in unreadByRoomId) {
      if (roomId === currentRoomId) continue;
      // Only notify for rooms in the active workspace (or DMs)
      const room = roomsById[roomId];
      if (!room || (room.type !== 'DIRECT' && room.workspaceId !== selectedWorkspaceId)) continue;
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
  }, [unreadByRoomId, currentRoomId, myStatusId, selectedWorkspaceId, roomsById]);
}
