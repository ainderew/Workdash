import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSendReaction = vi.fn();

vi.mock('@/communication/reaction/reaction', () => ({
  ReactionService: {
    getInstance: () => ({
      sendReaction: mockSendReaction,
    }),
  },
}));

let mockLocalPlayerId: string | null = 'player-1';
vi.mock('@/common/store/playerStore', () => ({
  default: vi.fn(
    (selector: (s: { localPlayerId: string | null }) => unknown) =>
      selector({ localPlayerId: mockLocalPlayerId }),
  ),
}));

let mockBackendUser: { id: number } | null = { id: 42 };
vi.mock('@/common/store/useStore', () => ({
  default: vi.fn(
    (selector: (s: { backendUser: { id: number } | null }) => unknown) =>
      selector({ backendUser: mockBackendUser }),
  ),
}));

let mockRaisedHands = new Set<number>();
vi.mock('@/common/store/callReactionStore', () => ({
  default: vi.fn(
    (selector: (s: { raisedHands: Set<number> }) => unknown) =>
      selector({ raisedHands: mockRaisedHands }),
  ),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { useCallReaction } from './useCallReaction';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalPlayerId = 'player-1';
  mockBackendUser = { id: 42 };
  mockRaisedHands = new Set<number>();
});

describe('useCallReaction', () => {
  describe('sendReaction', () => {
    it('emits reaction with playerId and userId', () => {
      const { result } = renderHook(() => useCallReaction());
      act(() => result.current.sendReaction('👍'));

      expect(mockSendReaction).toHaveBeenCalledWith({
        reaction: '👍',
        playerId: 'player-1',
        userId: 42,
      });
    });

    it('does nothing when localPlayerId is null', () => {
      mockLocalPlayerId = null;
      const { result } = renderHook(() => useCallReaction());
      act(() => result.current.sendReaction('👍'));

      expect(mockSendReaction).not.toHaveBeenCalled();
    });

    it('does nothing when localUserId is null', () => {
      mockBackendUser = null;
      const { result } = renderHook(() => useCallReaction());
      act(() => result.current.sendReaction('👍'));

      expect(mockSendReaction).not.toHaveBeenCalled();
    });
  });

  describe('toggleRaiseHand', () => {
    it('sends 🤚 when hand is not raised', () => {
      const { result } = renderHook(() => useCallReaction());
      act(() => result.current.toggleRaiseHand());

      expect(mockSendReaction).toHaveBeenCalledWith({
        reaction: '🤚',
        playerId: 'player-1',
        userId: 42,
      });
    });

    it('sends stop-raise-hand when hand is already raised', () => {
      mockRaisedHands = new Set([42]);
      const { result } = renderHook(() => useCallReaction());
      act(() => result.current.toggleRaiseHand());

      expect(mockSendReaction).toHaveBeenCalledWith({
        reaction: 'stop-raise-hand',
        playerId: 'player-1',
        userId: 42,
      });
    });

    it('does nothing when localUserId is null', () => {
      mockBackendUser = null;
      const { result } = renderHook(() => useCallReaction());
      act(() => result.current.toggleRaiseHand());

      expect(mockSendReaction).not.toHaveBeenCalled();
    });
  });

  describe('isRaisingHand', () => {
    it('returns false when local user hand is not raised', () => {
      const { result } = renderHook(() => useCallReaction());
      expect(result.current.isRaisingHand).toBe(false);
    });

    it('returns true when local user hand is raised', () => {
      mockRaisedHands = new Set([42]);
      const { result } = renderHook(() => useCallReaction());
      expect(result.current.isRaisingHand).toBe(true);
    });

    it('returns false when localUserId is null even if set has entries', () => {
      mockBackendUser = null;
      mockRaisedHands = new Set([42]);
      const { result } = renderHook(() => useCallReaction());
      expect(result.current.isRaisingHand).toBe(false);
    });
  });
});
