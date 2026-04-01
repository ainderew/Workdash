import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { FloatingReaction } from '@/common/store/callReactionStore';

// ---------------------------------------------------------------------------
// Mock callReactionStore
// ---------------------------------------------------------------------------

const mockRemoveReaction = vi.fn();

const mockState: {
  floatingReactions: FloatingReaction[];
  removeReaction: typeof mockRemoveReaction;
} = {
  floatingReactions: [],
  removeReaction: mockRemoveReaction,
};

vi.mock('@/common/store/callReactionStore', () => ({
  default: vi.fn((selector: (s: typeof mockState) => unknown) =>
    selector(mockState),
  ),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import FloatingReactionOverlay from './FloatingReactionOverlay';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockState.floatingReactions = [];
});

describe('FloatingReactionOverlay', () => {
  it('renders emoji spans for reactions matching userId', () => {
    mockState.floatingReactions = [
      { id: 'r1', userId: 42, emoji: '👍', timestamp: 1 },
      { id: 'r2', userId: 42, emoji: '😂', timestamp: 2 },
    ];

    const { container } = render(<FloatingReactionOverlay userId={42} />);
    const spans = container.querySelectorAll('span');
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toBe('👍');
    expect(spans[1].textContent).toBe('😂');
  });

  it('does not render reactions for other userIds', () => {
    mockState.floatingReactions = [
      { id: 'r1', userId: 99, emoji: '🔥', timestamp: 1 },
    ];

    const { container } = render(<FloatingReactionOverlay userId={42} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls removeReaction on animationend event', () => {
    mockState.floatingReactions = [
      { id: 'r1', userId: 42, emoji: '👍', timestamp: 1 },
    ];

    const { container } = render(<FloatingReactionOverlay userId={42} />);
    const span = container.querySelector('span')!;
    fireEvent.animationEnd(span);
    expect(mockRemoveReaction).toHaveBeenCalledWith('r1');
  });

  it('renders nothing when no reactions for userId', () => {
    mockState.floatingReactions = [];

    const { container } = render(<FloatingReactionOverlay userId={42} />);
    expect(container.firstChild).toBeNull();
  });
});
