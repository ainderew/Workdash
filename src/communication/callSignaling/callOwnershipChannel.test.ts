import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// BroadcastChannel mock
// ---------------------------------------------------------------------------

const postMessageSpy = vi.fn();
const closeSpy = vi.fn();
let lastOnMessage: ((event: MessageEvent) => void) | null = null;

class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    // Capture onmessage setter via proxy
    return new Proxy(this, {
      set(target, prop, value) {
        if (prop === "onmessage") {
          lastOnMessage = value as (event: MessageEvent) => void;
        }
        return Reflect.set(target, prop, value);
      },
    });
  }

  postMessage = postMessageSpy;
  close = closeSpy;
}

// Must set before importing the module
vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import {
  initCallOwnershipChannel,
  broadcastCallOwnership,
  destroyCallOwnershipChannel,
  getTabId,
} from "./callOwnershipChannel";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  lastOnMessage = null;
  // Destroy any existing channel between tests
  destroyCallOwnershipChannel();
});

describe("callOwnershipChannel", () => {
  it("should initialize BroadcastChannel with correct name", () => {
    const onMessage = vi.fn();
    initCallOwnershipChannel(onMessage);
    // If init ran, broadcastCallOwnership should be able to post
    broadcastCallOwnership("call-claimed", "ch-1");
    expect(postMessageSpy).toHaveBeenCalled();
  });

  it("should call onMessage callback when message received", () => {
    const onMessage = vi.fn();
    initCallOwnershipChannel(onMessage);

    // Simulate incoming message via the captured onmessage handler
    if (lastOnMessage) {
      lastOnMessage({
        data: { type: "call-claimed", channelId: "ch-1", tabId: "tab-x" },
      } as MessageEvent);
    }

    expect(onMessage).toHaveBeenCalledWith({
      type: "call-claimed",
      channelId: "ch-1",
      tabId: "tab-x",
    });
  });

  it("should send messages via broadcastCallOwnership", () => {
    initCallOwnershipChannel(vi.fn());

    broadcastCallOwnership("call-released", "ch-2");

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "call-released",
        channelId: "ch-2",
      }),
    );
  });

  it("should include tabId in messages", () => {
    initCallOwnershipChannel(vi.fn());
    const tabId = getTabId();

    broadcastCallOwnership("transfer-initiated", "ch-3");

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tabId }),
    );
  });

  it("should return a stable tabId", () => {
    const id1 = getTabId();
    const id2 = getTabId();
    expect(id1).toBe(id2);
    expect(id1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("should close channel on destroy", () => {
    initCallOwnershipChannel(vi.fn());
    destroyCallOwnershipChannel();

    expect(closeSpy).toHaveBeenCalled();

    // Subsequent broadcast should be a no-op (channel is null)
    postMessageSpy.mockClear();
    broadcastCallOwnership("call-claimed", "ch-1");
    expect(postMessageSpy).not.toHaveBeenCalled();
  });
});
