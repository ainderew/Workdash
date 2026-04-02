import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockUnreadByRoomId: Record<string, number> = {};
const mockMarkRoomRead = vi.fn().mockResolvedValue(undefined);
const mockConsumePendingMention = vi.fn(() => false);

vi.mock('@/common/store/chatV2Store', () => {
  const store = {
    getState: () => ({
      unreadByRoomId: mockUnreadByRoomId,
      markRoomRead: mockMarkRoomRead,
      consumePendingMention: mockConsumePendingMention,
    }),
  };
  const hook = (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      unreadByRoomId: mockUnreadByRoomId,
      currentRoomId: null,
      selectedWorkspaceId: 'ws-1',
      roomsById: {},
      hasPendingMention: false,
    });
  hook.getState = store.getState;
  return { default: hook };
});

vi.mock('@/common/store/presenceStore', () => ({
  usePresenceStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ myStatus: { statusId: 'online' } }),
}));

vi.mock('./useDocumentFocus', () => ({
  useDocumentFocus: () => true,
  getIsNotifLeader: () => true,
}));

// ---------------------------------------------------------------------------
// Mock Image with synchronous onload
// ---------------------------------------------------------------------------

class MockImage {
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  private _src = '';

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    if (this.onload) {
      this.onload();
    }
  }
}

vi.stubGlobal('Image', MockImage);

// Mock Notification to prevent errors
vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });

// Mock Audio
vi.stubGlobal(
  'Audio',
  class {
    volume = 1;
    preload = '';
    currentTime = 0;
    src = '';
    play = vi.fn().mockResolvedValue(undefined);
    pause = vi.fn();
  },
);

// ---------------------------------------------------------------------------
// Track fillText calls to verify badge label
// ---------------------------------------------------------------------------

let fillTextCalls: string[] = [];
const toDataURLResult = 'data:image/png;base64,MOCK_BADGE';

const originalGetContext = HTMLCanvasElement.prototype.getContext;

// Override canvas mock to track fillText calls
HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: unknown[]) {
  if (contextId === '2d') {
    const noop = () => {};
    return {
      fillStyle: '',
      fillRect: noop,
      clearRect: noop,
      getImageData: () => ({ data: new Uint8ClampedArray(0) }),
      putImageData: noop,
      createImageData: () => ({ data: new Uint8ClampedArray(0) }),
      setTransform: noop,
      drawImage: noop,
      save: noop,
      restore: noop,
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      closePath: noop,
      stroke: noop,
      translate: noop,
      scale: noop,
      rotate: noop,
      arc: noop,
      fill: noop,
      measureText: () => ({ width: 0 }),
      transform: noop,
      rect: noop,
      clip: noop,
      canvas: this,
      fillText: (text: string) => {
        fillTextCalls.push(text);
      },
      textAlign: '',
      textBaseline: '',
      font: '',
    } as unknown as CanvasRenderingContext2D;
  }
  return originalGetContext.call(this, contextId, ...args) as RenderingContext | null;
} as typeof HTMLCanvasElement.prototype.getContext;

// Override toDataURL
HTMLCanvasElement.prototype.toDataURL = function () {
  return toDataURLResult;
};

// ---------------------------------------------------------------------------
// Lazy import after mocks
// ---------------------------------------------------------------------------

import { useChatNotificationSound } from './useChatNotificationSound';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFaviconHref(): string | null {
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  return link?.href ?? null;
}

function setUnreads(unreads: Record<string, number>) {
  Object.keys(mockUnreadByRoomId).forEach((k) => delete mockUnreadByRoomId[k]);
  Object.assign(mockUnreadByRoomId, unreads);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useChatNotificationSound - favicon badge', () => {
  beforeEach(() => {
    // Clean favicon link elements
    document.querySelectorAll("link[rel='icon']").forEach((el) => el.remove());
    document.title = 'WorkDash';
    fillTextCalls = [];
    setUnreads({});

    // Reset module-level favicon state by re-importing
    // Since we can't reset module vars directly, we ensure each test
    // starts with a clean DOM and the hook handles the rest
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not add a badge when there are no unreads', () => {
    setUnreads({});
    const { unmount } = renderHook(() => useChatNotificationSound());

    const href = getFaviconHref();
    // Either no link exists, or href is the base favicon
    expect(!href || href.endsWith('/favicon.svg')).toBe(true);
    expect(fillTextCalls).toHaveLength(0);

    unmount();
  });

  it('should add a badge with count when there are unreads', () => {
    setUnreads({ room1: 3 });
    const { unmount } = renderHook(() => useChatNotificationSound());

    const href = getFaviconHref();
    expect(href).toBe(toDataURLResult);
    expect(fillTextCalls).toContain('3');

    unmount();
  });

  it('should show 9+ for counts above 9', () => {
    setUnreads({ room1: 7, room2: 5 });
    const { unmount } = renderHook(() => useChatNotificationSound());

    const href = getFaviconHref();
    expect(href).toBe(toDataURLResult);
    expect(fillTextCalls).toContain('9+');

    unmount();
  });

  it('should revert favicon when unreads are cleared', () => {
    setUnreads({ room1: 3 });
    const { unmount } = renderHook(() => useChatNotificationSound());

    expect(getFaviconHref()).toBe(toDataURLResult);

    // Unmount triggers cleanup which calls resetFavicon
    unmount();

    const href = getFaviconHref();
    expect(!href || href.endsWith('/favicon.svg')).toBe(true);
  });

  it('should still update document.title alongside favicon', () => {
    setUnreads({ room1: 5 });
    const { unmount } = renderHook(() => useChatNotificationSound());

    expect(document.title).toBe('(5) WorkDash');

    unmount();
    expect(document.title).toBe('WorkDash');
  });
});
