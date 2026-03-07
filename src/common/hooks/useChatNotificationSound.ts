import { useEffect, useRef } from 'react';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';

const SILENT_STATUSES = new Set(['focus', 'offline']);

// Singleton state stored on window to survive HMR module reloads
function getSingletonState() {
  const w = window as Window & {
    __chatNotifSingleton?: { count: number; audio: HTMLAudioElement | null; enabled: boolean };
  };
  if (!w.__chatNotifSingleton) {
    w.__chatNotifSingleton = { count: 0, audio: null, enabled: false };
  }
  return w.__chatNotifSingleton;
}

/**
 * Plays a notification sound when a new unread message arrives
 * in a room the user is NOT currently viewing.
 * Respects user status: suppressed when focus or offline.
 * Only the first mounted instance plays sound (singleton guard).
 */
export function useChatNotificationSound() {
  const prevUnreadRef = useRef<Record<string, number> | null>(null);
  const isOwnerRef = useRef(false);

  const unreadByRoomId = useChatV2Store((state) => state.unreadByRoomId);
  const currentRoomId = useChatV2Store((state) => state.currentRoomId);
  const selectedWorkspaceId = useChatV2Store((state) => state.selectedWorkspaceId);
  const roomsById = useChatV2Store((state) => state.roomsById);
  const myStatusId = usePresenceStore((state) => state.myStatus.statusId);

  // Prime the audio element on first user interaction (singleton)
  useEffect(() => {
    const singleton = getSingletonState();
    singleton.count++;
    isOwnerRef.current = singleton.count === 1;

    if (!isOwnerRef.current) return;

    singleton.audio = new Audio('/assets/sounds/notification.mp3');
    singleton.audio.volume = 0.3;
    singleton.audio.preload = 'auto';

    const enableAudio = () => {
      if (!singleton.enabled && singleton.audio) {
        singleton.audio
          .play()
          .then(() => {
            singleton.audio?.pause();
            singleton.audio!.currentTime = 0;
            singleton.enabled = true;
          })
          .catch(() => {});
      }
    };

    window.addEventListener('click', enableAudio, { once: true });
    window.addEventListener('keydown', enableAudio, { once: true });

    return () => {
      singleton.count--;
      if (isOwnerRef.current) {
        window.removeEventListener('click', enableAudio);
        window.removeEventListener('keydown', enableAudio);
        if (singleton.audio) {
          singleton.audio.pause();
          singleton.audio.src = '';
          singleton.audio = null;
        }
        singleton.enabled = false;
        isOwnerRef.current = false;
      }
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

    const singleton = getSingletonState();
    if (shouldPlay && !SILENT_STATUSES.has(myStatusId) && singleton.enabled && singleton.audio) {
      singleton.audio.currentTime = 0;
      singleton.audio.play().catch(() => {});
    }
  }, [unreadByRoomId, currentRoomId, myStatusId, selectedWorkspaceId, roomsById]);
}
