import useCallReactionStore from './callReactionStore';

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useCallReactionStore.getState().clearAll();
});

// ---------------------------------------------------------------------------
// addReaction
// ---------------------------------------------------------------------------

describe('addReaction', () => {
  it('adds a floating reaction with id, userId, emoji, and timestamp', () => {
    useCallReactionStore.getState().addReaction(42, '👍');

    const { floatingReactions } = useCallReactionStore.getState();
    expect(floatingReactions).toHaveLength(1);
    expect(floatingReactions[0]).toMatchObject({
      userId: 42,
      emoji: '👍',
    });
    expect(floatingReactions[0].id).toBeTruthy();
    expect(floatingReactions[0].timestamp).toBeGreaterThan(0);
  });

  it('caps at 5 reactions per userId, evicting oldest', () => {
    const { addReaction } = useCallReactionStore.getState();

    for (let i = 0; i < 6; i++) {
      addReaction(1, `emoji-${i}`);
    }

    const { floatingReactions } = useCallReactionStore.getState();
    const userReactions = floatingReactions.filter((r) => r.userId === 1);
    expect(userReactions).toHaveLength(5);
    // oldest (emoji-0) should be evicted
    expect(userReactions[0].emoji).toBe('emoji-1');
    expect(userReactions[4].emoji).toBe('emoji-5');
  });

  it('allows 5 reactions per user independently (user A and B each get 5)', () => {
    const { addReaction } = useCallReactionStore.getState();

    for (let i = 0; i < 5; i++) {
      addReaction(1, '👍');
      addReaction(2, '😂');
    }

    const { floatingReactions } = useCallReactionStore.getState();
    const userAReactions = floatingReactions.filter((r) => r.userId === 1);
    const userBReactions = floatingReactions.filter((r) => r.userId === 2);
    expect(userAReactions).toHaveLength(5);
    expect(userBReactions).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// removeReaction
// ---------------------------------------------------------------------------

describe('removeReaction', () => {
  it('removes a reaction by id', () => {
    useCallReactionStore.getState().addReaction(1, '👍');
    const { floatingReactions } = useCallReactionStore.getState();
    const id = floatingReactions[0].id;

    useCallReactionStore.getState().removeReaction(id);
    expect(useCallReactionStore.getState().floatingReactions).toHaveLength(0);
  });

  it('no-ops for non-existent id', () => {
    useCallReactionStore.getState().addReaction(1, '👍');
    useCallReactionStore.getState().removeReaction('non-existent-id');
    expect(useCallReactionStore.getState().floatingReactions).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// raisedHands
// ---------------------------------------------------------------------------

describe('raisedHands', () => {
  it('setHandRaised(userId, true) adds userId to set', () => {
    useCallReactionStore.getState().setHandRaised(42, true);
    expect(useCallReactionStore.getState().raisedHands.has(42)).toBe(true);
  });

  it('setHandRaised(userId, false) removes userId from set', () => {
    useCallReactionStore.getState().setHandRaised(42, true);
    useCallReactionStore.getState().setHandRaised(42, false);
    expect(useCallReactionStore.getState().raisedHands.has(42)).toBe(false);
  });

  it('setHandRaised(userId, true) twice does not duplicate', () => {
    useCallReactionStore.getState().setHandRaised(42, true);
    useCallReactionStore.getState().setHandRaised(42, true);
    expect(useCallReactionStore.getState().raisedHands.has(42)).toBe(true);
    expect(useCallReactionStore.getState().raisedHands.size).toBe(1);
  });

  it('setHandRaised creates a new Set instance (Zustand reactivity)', () => {
    const before = useCallReactionStore.getState().raisedHands;
    useCallReactionStore.getState().setHandRaised(42, true);
    const after = useCallReactionStore.getState().raisedHands;
    expect(after).not.toBe(before);
  });

  it('isHandRaised returns correct boolean', () => {
    expect(useCallReactionStore.getState().isHandRaised(42)).toBe(false);
    useCallReactionStore.getState().setHandRaised(42, true);
    expect(useCallReactionStore.getState().isHandRaised(42)).toBe(true);
    useCallReactionStore.getState().setHandRaised(42, false);
    expect(useCallReactionStore.getState().isHandRaised(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

describe('clearAll', () => {
  it('clears both floatingReactions and raisedHands', () => {
    useCallReactionStore.getState().addReaction(1, '👍');
    useCallReactionStore.getState().setHandRaised(42, true);

    useCallReactionStore.getState().clearAll();

    const state = useCallReactionStore.getState();
    expect(state.floatingReactions).toHaveLength(0);
    expect(state.raisedHands.size).toBe(0);
  });
});
