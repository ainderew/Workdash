import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CallPresence } from '@/common/store/callStore';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockActiveCallsByChannel: Record<string, CallPresence> = {};
let mockRaisedHands = new Set<number>();

vi.mock('@/common/store/callStore', () => ({
  default: vi.fn(
    (
      selector: (s: {
        activeCallsByChannel: Record<string, CallPresence>;
      }) => unknown,
    ) => selector({ activeCallsByChannel: mockActiveCallsByChannel }),
  ),
}));

vi.mock('@/common/store/callReactionStore', () => ({
  default: vi.fn(
    (selector: (s: { raisedHands: Set<number> }) => unknown) =>
      selector({ raisedHands: mockRaisedHands }),
  ),
}));

vi.mock('./CallAvatar', () => ({
  default: ({ userId }: { userId: number }) => (
    <span data-testid={`avatar-${userId}`} />
  ),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import ChannelCallIndicator from './ChannelCallIndicator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCall(
  channelId: string,
  userIds: number[],
): CallPresence {
  return {
    channelId,
    type: 'audio',
    startedAt: new Date().toISOString(),
    participants: userIds.map((id) => ({
      userId: id,
      displayName: `User ${id}`,
      media: { audio: true, video: false, screen: false },
    })),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockActiveCallsByChannel = {};
  mockRaisedHands = new Set();
});

describe('ChannelCallIndicator raise-hand', () => {
  it('shows ✋ count badge when participants have raised hands', () => {
    mockActiveCallsByChannel = { 'ch-1': makeCall('ch-1', [1, 2, 3]) };
    mockRaisedHands = new Set([1, 3]);

    render(<ChannelCallIndicator channelId="ch-1" />);

    const handBadge = screen.getByText(/✋/);
    expect(handBadge).toBeInTheDocument();
    expect(handBadge.textContent).toContain('2');
  });

  it('hides ✋ badge when no raised hands', () => {
    mockActiveCallsByChannel = { 'ch-1': makeCall('ch-1', [1, 2]) };
    mockRaisedHands = new Set();

    render(<ChannelCallIndicator channelId="ch-1" />);

    expect(screen.queryByText(/✋/)).not.toBeInTheDocument();
  });

  it('count matches number of raised-hand participants in the call', () => {
    mockActiveCallsByChannel = { 'ch-1': makeCall('ch-1', [1, 2, 3, 4]) };
    // User 5 has hand raised but is not in this call
    mockRaisedHands = new Set([2, 4, 5]);

    render(<ChannelCallIndicator channelId="ch-1" />);

    const handBadge = screen.getByText(/✋/);
    expect(handBadge.textContent).toContain('2');
  });

  it('shows badge with count 1 when only 1 raised hand', () => {
    mockActiveCallsByChannel = { 'ch-1': makeCall('ch-1', [1, 2]) };
    mockRaisedHands = new Set([1]);

    render(<ChannelCallIndicator channelId="ch-1" />);

    const handBadge = screen.getByText(/✋/);
    expect(handBadge.textContent).toContain('1');
  });
});
