import { describe, it, expect, beforeEach } from "vitest";
import useCallStore from "./callStore";
import type { CallPresence, CallParticipant, CallParticipantMedia } from "./callStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParticipant(
  userId: number,
  media: Partial<CallParticipantMedia> = {},
): CallParticipant {
  return {
    userId,
    displayName: `User ${userId}`,
    media: { audio: false, video: false, screen: false, ...media },
  };
}

function makeCall(
  channelId: string,
  participants: CallParticipant[] = [],
): CallPresence {
  return {
    channelId,
    type: "audio",
    startedAt: new Date().toISOString(),
    participants,
  };
}

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useCallStore.getState().reset();
});

// ---------------------------------------------------------------------------
// setCurrentCallAsOwner — overwrite protection
// ---------------------------------------------------------------------------

describe("setCurrentCallAsOwner — edge cases", () => {
  it("overwrites a previous ownership when switching to a different channel", () => {
    useCallStore.getState().setCurrentCallAsOwner("ch-1");
    useCallStore.getState().setCurrentCallAsOwner("ch-2");

    const state = useCallStore.getState();
    expect(state.currentCall).toEqual({ channelId: "ch-2" });
    expect(state.ownershipChannelId).toBe("ch-2");
    expect(state.isCallOwner).toBe(true);
  });

  it("resets localMedia even if media was previously set", () => {
    useCallStore.getState().setCurrentCallAsOwner("ch-1");
    useCallStore.getState().setLocalMedia({ audio: true, video: true });

    // Transfer to new call — media must reset
    useCallStore.getState().setCurrentCallAsOwner("ch-2");

    const state = useCallStore.getState();
    expect(state.localMedia).toEqual(
      { audio: false, video: false, screen: false },
    );
  });
});

// ---------------------------------------------------------------------------
// Ownership transitions: owner → passive → rejoin-available → owner
// ---------------------------------------------------------------------------

describe("Ownership status transitions", () => {
  it("owner → passive preserves currentCall but clears isCallOwner", () => {
    useCallStore.getState().setCurrentCallAsOwner("ch-1");
    useCallStore.getState().setCallOwnershipStatus("ch-1", "passive");

    const state = useCallStore.getState();
    expect(state.currentCall).toEqual({ channelId: "ch-1" });
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBe("passive");
  });

  it("passive → rejoin-available keeps ownership channel reference", () => {
    useCallStore.getState().setCallOwnershipStatus("ch-1", "passive");
    useCallStore.getState().setCallOwnershipStatus("ch-1", "rejoin-available");

    const state = useCallStore.getState();
    expect(state.ownershipChannelId).toBe("ch-1");
    expect(state.callOwnershipStatus).toBe("rejoin-available");
    expect(state.isCallOwner).toBe(false);
  });

  it("rejoin-available → owner via setCurrentCallAsOwner restores full ownership", () => {
    useCallStore.getState().setCallOwnershipStatus("ch-1", "rejoin-available");
    useCallStore.getState().setCurrentCallAsOwner("ch-1");

    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(true);
    expect(state.callOwnershipStatus).toBe("owner");
    expect(state.currentCall).toEqual({ channelId: "ch-1" });
  });
});

// ---------------------------------------------------------------------------
// clearCallOwnership does NOT clear currentCall
// ---------------------------------------------------------------------------

describe("clearCallOwnership isolation", () => {
  it("clears ownership fields but preserves currentCall", () => {
    useCallStore.getState().setCurrentCallAsOwner("ch-1");
    useCallStore.getState().clearCallOwnership();

    const state = useCallStore.getState();
    expect(state.currentCall).toEqual({ channelId: "ch-1" });
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBeNull();
    expect(state.ownershipChannelId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// handleCallEnded — ownership cleanup only for matching channel
// ---------------------------------------------------------------------------

describe("handleCallEnded — ownership edge cases", () => {
  it("clears ownership for passive tab when call ends on its ownershipChannelId", () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall("ch-1", [makeParticipant(1)]));
    // Passive tab: has ownershipChannelId but no currentCall
    store.setCallOwnershipStatus("ch-1", "passive");

    useCallStore.getState().handleCallEnded("ch-1");

    const state = useCallStore.getState();
    expect(state.callOwnershipStatus).toBeNull();
    expect(state.isCallOwner).toBe(false);
    expect(state.ownershipChannelId).toBeNull();
  });

  it("clears ownership for rejoin-available tab when call ends", () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall("ch-1", [makeParticipant(1)]));
    store.setCallOwnershipStatus("ch-1", "rejoin-available");

    useCallStore.getState().handleCallEnded("ch-1");

    const state = useCallStore.getState();
    expect(state.callOwnershipStatus).toBeNull();
    expect(state.ownershipChannelId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setCurrentCall(null) — full cleanup including floating state
// ---------------------------------------------------------------------------

describe("setCurrentCall(null) — full cleanup", () => {
  it("clears ownership AND resets localMedia when leaving a call", () => {
    const store = useCallStore.getState();
    store.setCurrentCallAsOwner("ch-1");
    store.setLocalMedia({ audio: true, video: true, screen: true });

    useCallStore.getState().setCurrentCall(null);

    const state = useCallStore.getState();
    expect(state.currentCall).toBeNull();
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBeNull();
    expect(state.localMedia).toEqual(
      { audio: false, video: false, screen: false },
    );
  });

  it("does NOT clear ownership when setting a new non-null currentCall", () => {
    useCallStore.getState().setCallOwnershipStatus("ch-1", "owner");
    useCallStore.getState().setCurrentCall("ch-2");

    const state = useCallStore.getState();
    // setCurrentCall with a channelId only sets currentCall, not ownership
    expect(state.isCallOwner).toBe(true);
    expect(state.callOwnershipStatus).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// reset — ownership fields are cleared
// ---------------------------------------------------------------------------

describe("reset — ownership fields", () => {
  it("clears all ownership state on full reset", () => {
    useCallStore.getState().setCurrentCallAsOwner("ch-1");

    useCallStore.getState().reset();

    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBeNull();
    expect(state.ownershipChannelId).toBeNull();
    expect(state.currentCall).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resetForWorkspaceSwitch — ownership is preserved
// ---------------------------------------------------------------------------

describe("resetForWorkspaceSwitch — ownership cleared", () => {
  it("clears ownership state when switching workspaces to prevent phantom banners", () => {
    const store = useCallStore.getState();
    store.setCurrentCallAsOwner("ch-1");
    store.handleCallStarted(makeCall("ch-1", [makeParticipant(1)]));

    useCallStore.getState().resetForWorkspaceSwitch();

    const state = useCallStore.getState();
    // activeCallsByChannel is cleared (workspace-scoped)
    expect(state.activeCallsByChannel).toEqual({});
    // currentCall is preserved (may still be active)
    expect(state.currentCall).toEqual({ channelId: "ch-1" });
    // Ownership is cleared to prevent phantom indicators in the new workspace
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBeNull();
    expect(state.ownershipChannelId).toBeNull();
  });
});
