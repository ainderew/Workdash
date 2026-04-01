import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetHandRaised = vi.fn();
const mockAddReaction = vi.fn();

vi.mock('@/common/store/callReactionStore', () => ({
  default: {
    getState: () => ({
      setHandRaised: mockSetHandRaised,
      addReaction: mockAddReaction,
    }),
  },
}));

vi.mock('@/common/store/playerStore', () => ({
  default: {
    getState: () => ({
      playerMap: {},
      updatePlayerMap: vi.fn(),
    }),
  },
}));

vi.mock('../mediaTransportService/mediaTransportService', () => ({
  MediaTransportService: {
    getInstance: () => ({ socket: null }),
  },
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { ReactionService } from './reaction';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe('routeReactionToPlayer — desk mode routing', () => {
  const service = ReactionService.getInstance();

  it('calls setHandRaised(userId, true) for 🤚 when userId is present', () => {
    service.routeReactionToPlayer({ playerId: 'p1', reaction: '🤚', userId: 42 });
    expect(mockSetHandRaised).toHaveBeenCalledWith(42, true);
  });

  it('calls setHandRaised(userId, false) for stop-raise-hand when userId is present', () => {
    service.routeReactionToPlayer({ playerId: 'p1', reaction: 'stop-raise-hand', userId: 42 });
    expect(mockSetHandRaised).toHaveBeenCalledWith(42, false);
  });

  it('calls addReaction for regular emoji when userId is present', () => {
    service.routeReactionToPlayer({ playerId: 'p1', reaction: '👍', userId: 42 });
    expect(mockAddReaction).toHaveBeenCalledWith(42, '👍');
  });

  it('does not call callReactionStore when userId is undefined', () => {
    service.routeReactionToPlayer({ playerId: 'p1', reaction: '👍' });
    expect(mockSetHandRaised).not.toHaveBeenCalled();
    expect(mockAddReaction).not.toHaveBeenCalled();
  });

  it('routes 🥷 reaction to callReactionStore as regular emoji', () => {
    service.routeReactionToPlayer({ playerId: 'p1', reaction: '🥷', userId: 7 });
    expect(mockAddReaction).toHaveBeenCalledWith(7, '🥷');
  });
});
