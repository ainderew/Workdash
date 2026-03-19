import { useEffect, useRef } from 'react';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';
import { useDocumentFocus, getIsNotifLeader } from './useDocumentFocus';

const SILENT_STATUSES = new Set(['focus', 'offline']);
const SOUND_COOLDOWN_MS = 2000;
const DEFAULT_TITLE = 'WorkDash';

// Singleton state stored on window to survive HMR module reloads
function getSingletonState() {
  const w = window as Window & {
    __chatNotifSingleton?: { count: number; audio: HTMLAudioElement | null; mentionAudio: HTMLAudioElement | null; enabled: boolean };
  };
  if (!w.__chatNotifSingleton) {
    w.__chatNotifSingleton = { count: 0, audio: null, mentionAudio: null, enabled: false };
  }
  return w.__chatNotifSingleton;
}

function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

/**
 * Plays a notification sound when a new unread message arrives.
 * Also handles browser notifications, tab title badge, and mark-as-read on refocus.
 * Must be mounted at the App level to work in all modes.
 */
export function useChatNotificationSound() {
  const prevUnreadRef = useRef<Record<string, number> | null>(null);
  const isOwnerRef = useRef(false);
  const lastPlayedRef = useRef(0);
  const readyRef = useRef(false);

  const unreadByRoomId = useChatV2Store((state) => state.unreadByRoomId);
  const currentRoomId = useChatV2Store((state) => state.currentRoomId);
  const selectedWorkspaceId = useChatV2Store((state) => state.selectedWorkspaceId);
  const roomsById = useChatV2Store((state) => state.roomsById);
  const myStatusId = usePresenceStore((state) => state.myStatus.statusId);
  const isDocumentFocused = useDocumentFocus();

  // Prime the audio element on first user interaction (singleton)
  useEffect(() => {
    const singleton = getSingletonState();
    singleton.count++;
    isOwnerRef.current = singleton.count === 1;

    if (!isOwnerRef.current) return;

    singleton.audio = new Audio('/assets/sounds/notification.mp3');
    singleton.audio.volume = 0.3;
    singleton.audio.preload = 'auto';

    singleton.mentionAudio = new Audio('/assets/sounds/mention.mp3');
    singleton.mentionAudio.volume = 0.3;
    singleton.mentionAudio.preload = 'auto';

    const primeAudioElement = async (el: HTMLAudioElement) => {
      el.volume = 0;
      try {
        await el.play();
        el.pause();
        el.currentTime = 0;
        el.volume = 0.3;
      } catch {
        el.volume = 0.3;
      }
    };

    const enableAudio = async () => {
      if (!singleton.enabled && singleton.audio) {
        const promises: Promise<void>[] = [primeAudioElement(singleton.audio)];
        if (singleton.mentionAudio) promises.push(primeAudioElement(singleton.mentionAudio));
        await Promise.allSettled(promises);
        singleton.enabled = true;
      }
      requestNotificationPermission();
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
        if (singleton.mentionAudio) {
          singleton.mentionAudio.pause();
          singleton.mentionAudio.src = '';
          singleton.mentionAudio = null;
        }
        singleton.enabled = false;
        isOwnerRef.current = false;
      }
    };
  }, []);

  // Grace period: suppress sounds while initial data loads
  useEffect(() => {
    const timer = setTimeout(() => {
      readyRef.current = true;
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Detect new unreads and play sound / fire browser notification
  useEffect(() => {
    if (!isOwnerRef.current) return;

    const prev = prevUnreadRef.current;

    // Skip initial hydration
    if (prev === null) {
      prevUnreadRef.current = { ...unreadByRoomId };
      return;
    }

    // Suppress sounds during initial load grace period
    if (!readyRef.current) {
      prevUnreadRef.current = { ...unreadByRoomId };
      return;
    }

    let shouldPlay = false;
    for (const roomId in unreadByRoomId) {
      // Skip current room only when tab is focused
      if (roomId === currentRoomId && isDocumentFocused) continue;
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

    if (!shouldPlay || SILENT_STATUSES.has(myStatusId)) {
      // Don't consume mention flag when we can't play — preserve it for the next eligible event
      return;
    }

    const now = Date.now();
    const isThrottled = now - lastPlayedRef.current < SOUND_COOLDOWN_MS;

    // Sound (with throttle + multi-tab guard)
    if (!isThrottled && getIsNotifLeader()) {
      const isMention = useChatV2Store.getState().consumePendingMention();
      const singleton = getSingletonState();
      if (singleton.enabled && singleton.audio) {
        const soundToPlay = isMention ? singleton.mentionAudio : singleton.audio;
        if (soundToPlay) {
          soundToPlay.currentTime = 0;
          soundToPlay.play().catch(() => {});
        }
        lastPlayedRef.current = now;
      }
    }

    // Browser notification (only when unfocused + leader)
    if (
      !isDocumentFocused &&
      getIsNotifLeader() &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('New message on WorkDash', {
          body: 'You have unread messages',
          tag: 'workdash-chat',
          icon: '/assets/logo.png',
        });
      } catch {
        // Notification API not available or blocked
      }
    }
  }, [unreadByRoomId, currentRoomId, myStatusId, selectedWorkspaceId, roomsById, isDocumentFocused]);

  // Tab title unread badge
  useEffect(() => {
    const totalUnreads = Object.values(unreadByRoomId).reduce((sum, n) => sum + (n ?? 0), 0);
    document.title = totalUnreads > 0 ? `(${totalUnreads}) ${DEFAULT_TITLE}` : DEFAULT_TITLE;

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [unreadByRoomId]);

  // Mark current room as read when tab regains focus
  useEffect(() => {
    if (isDocumentFocused && currentRoomId) {
      const unreadCount = useChatV2Store.getState().unreadByRoomId[currentRoomId] ?? 0;
      if (unreadCount > 0) {
        void useChatV2Store.getState().markRoomRead(currentRoomId);
      }
    }
  }, [isDocumentFocused, currentRoomId]);
}
