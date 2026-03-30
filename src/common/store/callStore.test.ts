import useCallStore from './callStore';
import type { CallPresence, CallParticipant, CallParticipantMedia } from './callStore';

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
    type: 'audio',
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
// Screen producer map
// ---------------------------------------------------------------------------

describe('screenProducerUserMap', () => {
  it('adds and removes screen producers', () => {
    const { setScreenProducerUser, removeScreenProducer } =
      useCallStore.getState();

    setScreenProducerUser('prod-1', 42);
    expect(useCallStore.getState().screenProducerUserMap).toEqual({
      'prod-1': 42,
    });

    setScreenProducerUser('prod-2', 99);
    expect(useCallStore.getState().screenProducerUserMap).toEqual({
      'prod-1': 42,
      'prod-2': 99,
    });

    removeScreenProducer('prod-1');
    expect(useCallStore.getState().screenProducerUserMap).toEqual({
      'prod-2': 99,
    });
  });

  it('removing a non-existent producer is a no-op', () => {
    useCallStore.getState().setScreenProducerUser('prod-1', 42);
    useCallStore.getState().removeScreenProducer('prod-nonexistent');
    expect(useCallStore.getState().screenProducerUserMap).toEqual({
      'prod-1': 42,
    });
  });
});

// ---------------------------------------------------------------------------
// Pin / unpin
// ---------------------------------------------------------------------------

describe('pinnedTileKey', () => {
  it('sets and clears pinned tile', () => {
    const { setPinnedTileKey } = useCallStore.getState();

    setPinnedTileKey('42');
    expect(useCallStore.getState().pinnedTileKey).toBe('42');

    setPinnedTileKey('42-screen');
    expect(useCallStore.getState().pinnedTileKey).toBe('42-screen');

    setPinnedTileKey(null);
    expect(useCallStore.getState().pinnedTileKey).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// handleCallEnded — pin + media cleanup
// ---------------------------------------------------------------------------

describe('handleCallEnded', () => {
  it('clears pinnedTileKey when user was in the ended call', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall('ch-1', [makeParticipant(1)]));
    store.setCurrentCall('ch-1');
    store.setPinnedTileKey('1');

    useCallStore.getState().handleCallEnded('ch-1');

    const state = useCallStore.getState();
    expect(state.currentCall).toBeNull();
    expect(state.pinnedTileKey).toBeNull();
    expect(state.localMedia).toEqual({
      audio: false,
      video: false,
      screen: false,
    });
  });

  it('preserves pinnedTileKey when a different call ends', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall('ch-1', [makeParticipant(1)]));
    store.handleCallStarted(makeCall('ch-2', [makeParticipant(2)]));
    store.setCurrentCall('ch-1');
    store.setPinnedTileKey('1');

    useCallStore.getState().handleCallEnded('ch-2');

    const state = useCallStore.getState();
    expect(state.currentCall).toEqual({ channelId: 'ch-1' });
    expect(state.pinnedTileKey).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// handleParticipantLeft — producer + pin cleanup
// ---------------------------------------------------------------------------

describe('handleParticipantLeft', () => {
  it('removes screen producers for the leaving user', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [makeParticipant(10), makeParticipant(20)]),
    );
    store.setScreenProducerUser('sp-10', 10);
    store.setScreenProducerUser('sp-20', 20);
    store.setProducerUser('vp-10', 10);

    useCallStore.getState().handleParticipantLeft('ch-1', 10);

    const state = useCallStore.getState();
    expect(state.screenProducerUserMap).toEqual({ 'sp-20': 20 });
    expect(state.producerUserMap).toEqual({});
  });

  it('clears pin when pinned user (camera) leaves', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [makeParticipant(10), makeParticipant(20)]),
    );
    store.setPinnedTileKey('10');

    useCallStore.getState().handleParticipantLeft('ch-1', 10);
    expect(useCallStore.getState().pinnedTileKey).toBeNull();
  });

  it('clears pin when pinned user (screen) leaves', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [makeParticipant(10), makeParticipant(20)]),
    );
    store.setPinnedTileKey('10-screen');

    useCallStore.getState().handleParticipantLeft('ch-1', 10);
    expect(useCallStore.getState().pinnedTileKey).toBeNull();
  });

  it('preserves pin when a different user leaves', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [makeParticipant(10), makeParticipant(20)]),
    );
    store.setPinnedTileKey('10');

    useCallStore.getState().handleParticipantLeft('ch-1', 20);
    expect(useCallStore.getState().pinnedTileKey).toBe('10');
  });

  it('is a no-op for unknown channel', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall('ch-1', [makeParticipant(10)]));
    store.setPinnedTileKey('10');

    useCallStore.getState().handleParticipantLeft('unknown-ch', 10);

    const state = useCallStore.getState();
    expect(state.pinnedTileKey).toBe('10');
    expect(state.activeCallsByChannel['ch-1'].participants).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// handleMediaChanged — auto-unpin
// ---------------------------------------------------------------------------

describe('handleMediaChanged', () => {
  it('unpins screen tile when user stops screen sharing', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [
        makeParticipant(10, { screen: true }),
      ]),
    );
    store.setPinnedTileKey('10-screen');

    useCallStore.getState().handleMediaChanged('ch-1', 10, {
      audio: false,
      video: false,
      screen: false,
    });

    expect(useCallStore.getState().pinnedTileKey).toBeNull();
  });

  it('unpins camera tile when user stops video', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [makeParticipant(10, { video: true })]),
    );
    store.setPinnedTileKey('10');

    useCallStore.getState().handleMediaChanged('ch-1', 10, {
      audio: false,
      video: false,
      screen: false,
    });

    expect(useCallStore.getState().pinnedTileKey).toBeNull();
  });

  it('preserves pin when a different user changes media', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [
        makeParticipant(10, { video: true }),
        makeParticipant(20, { video: true }),
      ]),
    );
    store.setPinnedTileKey('10');

    useCallStore.getState().handleMediaChanged('ch-1', 20, {
      audio: false,
      video: false,
      screen: false,
    });

    expect(useCallStore.getState().pinnedTileKey).toBe('10');
  });

  it('keeps pin when pinned user still has active stream', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [makeParticipant(10, { video: true, screen: true })]),
    );
    store.setPinnedTileKey('10-screen');

    // User stops video but keeps screen — pin should stay on screen tile
    useCallStore.getState().handleMediaChanged('ch-1', 10, {
      audio: false,
      video: false,
      screen: true,
    });

    expect(useCallStore.getState().pinnedTileKey).toBe('10-screen');
  });

  it('is a no-op for unknown channel', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(
      makeCall('ch-1', [makeParticipant(10)]),
    );

    const before = useCallStore.getState();
    useCallStore.getState().handleMediaChanged('unknown-ch', 10, {
      audio: true,
      video: false,
      screen: false,
    });
    const after = useCallStore.getState();

    expect(after.activeCallsByChannel).toEqual(before.activeCallsByChannel);
  });
});

// ---------------------------------------------------------------------------
// resetForWorkspaceSwitch
// ---------------------------------------------------------------------------

describe('resetForWorkspaceSwitch', () => {
  it('clears calls, producers, screen producers, and pin but preserves currentCall', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall('ch-1', [makeParticipant(10)]));
    store.setCurrentCall('ch-1');
    store.setLocalMedia({ audio: true });
    store.setProducerUser('vp-1', 10);
    store.setScreenProducerUser('sp-1', 10);
    store.setPinnedTileKey('10');

    useCallStore.getState().resetForWorkspaceSwitch();

    const state = useCallStore.getState();
    expect(state.activeCallsByChannel).toEqual({});
    expect(state.producerUserMap).toEqual({});
    expect(state.screenProducerUserMap).toEqual({});
    expect(state.pinnedTileKey).toBeNull();
    // currentCall and localMedia are preserved
    expect(state.currentCall).toEqual({ channelId: 'ch-1' });
    expect(state.localMedia.audio).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  it('resets all state including screenProducerUserMap and pinnedTileKey', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall('ch-1', [makeParticipant(10)]));
    store.setCurrentCall('ch-1');
    store.setScreenProducerUser('sp-1', 10);
    store.setPinnedTileKey('10-screen');
    store.setManualFloating(true);

    useCallStore.getState().reset();

    const state = useCallStore.getState();
    expect(state.activeCallsByChannel).toEqual({});
    expect(state.currentCall).toBeNull();
    expect(state.localMedia).toEqual({
      audio: false,
      video: false,
      screen: false,
    });
    expect(state.producerUserMap).toEqual({});
    expect(state.screenProducerUserMap).toEqual({});
    expect(state.pinnedTileKey).toBeNull();
    expect(state.manualFloating).toBe(false);
  });
});

describe('callOwnershipStatus', () => {
  it('sets owner status and isCallOwner to true', () => {
    useCallStore.getState().setCallOwnershipStatus('ch-1', 'owner');
    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(true);
    expect(state.callOwnershipStatus).toBe('owner');
    expect(state.ownershipChannelId).toBe('ch-1');
  });

  it('sets passive status and isCallOwner to false', () => {
    useCallStore.getState().setCallOwnershipStatus('ch-1', 'passive');
    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBe('passive');
    expect(state.ownershipChannelId).toBe('ch-1');
  });

  it('sets rejoin-available status and isCallOwner to false', () => {
    useCallStore.getState().setCallOwnershipStatus('ch-1', 'rejoin-available');
    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBe('rejoin-available');
  });
});

describe('clearCallOwnership', () => {
  it('resets all ownership fields to defaults', () => {
    const store = useCallStore.getState();
    store.setCallOwnershipStatus('ch-1', 'owner');
    store.clearCallOwnership();

    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBeNull();
    expect(state.ownershipChannelId).toBeNull();
  });
});

describe('handleCallEnded - ownership cleanup', () => {
  it('clears ownership if the ended call matches ownershipChannelId', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall('ch-1', [makeParticipant(1)]));
    store.setCallOwnershipStatus('ch-1', 'owner');

    useCallStore.getState().handleCallEnded('ch-1');

    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBeNull();
    expect(state.ownershipChannelId).toBeNull();
  });

  it('does not clear ownership if a different call ended', () => {
    const store = useCallStore.getState();
    store.handleCallStarted(makeCall('ch-1', [makeParticipant(1)]));
    store.handleCallStarted(makeCall('ch-2', [makeParticipant(2)]));
    store.setCallOwnershipStatus('ch-1', 'owner');

    useCallStore.getState().handleCallEnded('ch-2');

    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(true);
    expect(state.callOwnershipStatus).toBe('owner');
    expect(state.ownershipChannelId).toBe('ch-1');
  });
});

describe('setCurrentCallAsOwner', () => {
  it('atomically sets currentCall and ownership in a single update', () => {
    useCallStore.getState().setCurrentCallAsOwner('ch-1');
    const state = useCallStore.getState();
    expect(state.currentCall).toEqual({ channelId: 'ch-1' });
    expect(state.isCallOwner).toBe(true);
    expect(state.callOwnershipStatus).toBe('owner');
    expect(state.ownershipChannelId).toBe('ch-1');
    expect(state.localMedia).toEqual({ audio: false, video: false, screen: false });
  });
});

describe('setCurrentCall - ownership cleanup', () => {
  it('clears ownership when currentCall is set to null', () => {
    const store = useCallStore.getState();
    store.setCurrentCall('ch-1');
    store.setCallOwnershipStatus('ch-1', 'owner');

    useCallStore.getState().setCurrentCall(null);

    const state = useCallStore.getState();
    expect(state.isCallOwner).toBe(false);
    expect(state.callOwnershipStatus).toBeNull();
  });
});
