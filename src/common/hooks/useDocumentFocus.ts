import { useSyncExternalStore } from 'react';

// ─── Focus tracking ─────────────────────────────────────────────
let focused = typeof document !== 'undefined' ? document.hasFocus() : true;
const focusListeners = new Set<() => void>();

function notifyFocusListeners() {
  focusListeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  const update = () => {
    const next = document.hasFocus();
    if (next !== focused) {
      focused = next;
      notifyFocusListeners();
    }
  };

  window.addEventListener('focus', update);
  window.addEventListener('blur', update);
  document.addEventListener('visibilitychange', update);
}

/** Non-React getter — safe to call from Zustand stores / callbacks. */
export function getIsDocumentFocused(): boolean {
  return focused;
}

/** React hook that re-renders when document focus changes. */
export function useDocumentFocus(): boolean {
  return useSyncExternalStore(
    (cb) => {
      focusListeners.add(cb);
      return () => {
        focusListeners.delete(cb);
      };
    },
    () => focused,
    () => true, // SSR fallback
  );
}

// ─── BroadcastChannel leader election ───────────────────────────
// Only one tab should play notification sounds to avoid duplication.
let isLeader = true; // default true for single-tab case

if (typeof BroadcastChannel !== 'undefined') {
  const CHANNEL_NAME = 'workdash-notif-leader';
  const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let leaderTabId = tabId; // assume self initially
  const HEARTBEAT_MS = 2000;
  const TIMEOUT_MS = 5000;
  let lastLeaderPing = Date.now();

  const bc = new BroadcastChannel(CHANNEL_NAME);

  const claim = () => {
    leaderTabId = tabId;
    isLeader = true;
    bc.postMessage({ type: 'claim', tabId });
  };

  const heartbeat = () => {
    if (isLeader) {
      bc.postMessage({ type: 'heartbeat', tabId });
    } else if (Date.now() - lastLeaderPing > TIMEOUT_MS) {
      // Leader timed out, claim leadership
      claim();
    }
  };

  bc.onmessage = (ev) => {
    const { type, tabId: senderId } = ev.data as {
      type: string;
      tabId: string;
    };

    if (type === 'claim') {
      // Highest tabId wins (deterministic tie-break)
      if (senderId > tabId) {
        leaderTabId = senderId;
        isLeader = false;
        lastLeaderPing = Date.now();
      } else if (senderId < tabId) {
        // Re-assert our claim
        claim();
      }
    }

    if (type === 'heartbeat') {
      if (senderId === leaderTabId && senderId !== tabId) {
        lastLeaderPing = Date.now();
        isLeader = false;
      }
    }

    if (type === 'ping') {
      // New tab asking who the leader is
      if (isLeader) {
        bc.postMessage({ type: 'claim', tabId });
      }
    }
  };

  // On load, ask if anyone else is leader
  bc.postMessage({ type: 'ping', tabId });
  // Give other tabs 500ms to respond before claiming
  setTimeout(() => {
    if (leaderTabId === tabId) {
      claim();
    }
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
  }, 500);

  // Clean up on tab close
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      bc.postMessage({ type: 'resign', tabId });
      bc.close();
    });
  }
}

/** Returns true if this tab is the notification leader (should play sounds). */
export function getIsNotifLeader(): boolean {
  return isLeader;
}
