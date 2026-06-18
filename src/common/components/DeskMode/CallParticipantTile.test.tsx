import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { CallParticipant } from '@/common/store/callStore';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockRaisedHands = new Set<number>();
let mockLocalFocusMode = false;
let mockRemoteFocusByUserId: Record<number, boolean> = {};
let mockParticipantQuality: Record<number, 'good' | 'fair' | 'poor'> = {};

vi.mock('@/common/store/callReactionStore', () => ({
  default: vi.fn(
    (selector: (s: { raisedHands: Set<number> }) => unknown) =>
      selector({ raisedHands: mockRaisedHands }),
  ),
}));

vi.mock('@/common/store/focusStore', () => ({
  default: vi.fn(
    (
      selector: (s: {
        localFocusMode: boolean;
        remoteFocusByUserId: Record<number, boolean>;
      }) => unknown,
    ) =>
      selector({
        localFocusMode: mockLocalFocusMode,
        remoteFocusByUserId: mockRemoteFocusByUserId,
      }),
  ),
}));

vi.mock('@/common/store/callStore', () => ({
  default: vi.fn(
    (
      selector: (s: {
        userToProducerId: Record<number, string>;
        participantQuality: Record<number, 'good' | 'fair' | 'poor'>;
      }) => unknown,
    ) =>
      selector({
        userToProducerId: {},
        participantQuality: mockParticipantQuality,
      }),
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('@/common/store/chatV2Store', () => ({
  default: vi.fn(
    (
      selector: (s: {
        membersByRoomId: Record<string, unknown[]>;
      }) => unknown,
    ) => selector({ membersByRoomId: {} }),
  ),
}));

vi.mock('@/common/store/uiStore', () => ({
  default: vi.fn(
    (selector: (s: { isMuted: boolean }) => unknown) =>
      selector({ isMuted: false }),
  ),
}));

vi.mock('@/common/utils/characterFaceAvatar', () => ({
  useCharacterFaceAvatar: () => null,
}));

vi.mock('@/communication/videoChat/videoChatViewer', () => ({
  VideoChatViewer: { getInstance: () => ({ videoStreams: new Map() }) },
}));

vi.mock('@/communication/videoChat/videoChat', () => ({
  VideoChatService: { getInstance: () => ({ getCurrentStream: () => null }) },
}));

vi.mock('@/common/hooks/useActiveSpeaker', () => ({
  useActiveSpeaker: vi.fn(),
}));

vi.mock('./FloatingReactionOverlay', () => ({
  default: () => null,
}));

vi.mock('./ParticipantVolumeMenu', () => ({
  default: () => null,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import CallParticipantTile from './CallParticipantTile';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParticipant(userId: number): CallParticipant {
  return {
    userId,
    displayName: `User ${userId}`,
    media: { audio: true, video: false, screen: false },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockRaisedHands = new Set();
  mockLocalFocusMode = false;
  mockRemoteFocusByUserId = {};
  mockParticipantQuality = {};
});

describe('CallParticipantTile weak-link badge', () => {
  it('shows a weak-link icon for a remote peer with poor quality', () => {
    mockParticipantQuality = { 10: 'poor' };
    const { container } = render(
      <CallParticipantTile
        participant={makeParticipant(10)}
        channelId="ch-1"
        isLocal={false}
      />,
    );
    expect(container.querySelector('.lucide-wifi')).toBeTruthy();
  });

  it('shows the badge for fair quality too', () => {
    mockParticipantQuality = { 10: 'fair' };
    const { container } = render(
      <CallParticipantTile
        participant={makeParticipant(10)}
        channelId="ch-1"
        isLocal={false}
      />,
    );
    expect(container.querySelector('.lucide-wifi')).toBeTruthy();
  });

  it('hides the badge when quality is good', () => {
    mockParticipantQuality = { 10: 'good' };
    const { container } = render(
      <CallParticipantTile
        participant={makeParticipant(10)}
        channelId="ch-1"
        isLocal={false}
      />,
    );
    expect(container.querySelector('.lucide-wifi')).toBeNull();
  });

  it('never shows the badge for the local user', () => {
    mockParticipantQuality = { 10: 'poor' };
    const { container } = render(
      <CallParticipantTile
        participant={makeParticipant(10)}
        channelId="ch-1"
        isLocal={true}
      />,
    );
    expect(container.querySelector('.lucide-wifi')).toBeNull();
  });
});

describe('CallParticipantTile raise-hand', () => {
  it('shows ✋ badge when participant userId is in raisedHands', () => {
    mockRaisedHands = new Set([10]);

    const { container } = render(
      <CallParticipantTile
        participant={makeParticipant(10)}
        channelId="ch-1"
        isLocal={false}
      />,
    );

    const badges = container.querySelectorAll('span');
    const handBadges = Array.from(badges).filter((s) =>
      s.textContent?.includes('✋'),
    );
    // Should have ✋ in badge area and bottom bar
    expect(handBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('hides ✋ badge when participant userId is not in raisedHands', () => {
    mockRaisedHands = new Set();

    const { container } = render(
      <CallParticipantTile
        participant={makeParticipant(10)}
        channelId="ch-1"
        isLocal={false}
      />,
    );

    const badges = container.querySelectorAll('span');
    const handBadges = Array.from(badges).filter(
      (s) =>
        s.textContent?.trim() === '✋' &&
        s.classList.contains('absolute'),
    );
    expect(handBadges).toHaveLength(0);
  });

  it('shows ✋ badge beside name in bottom bar when hand is raised', () => {
    mockRaisedHands = new Set([10]);

    const { container } = render(
      <CallParticipantTile
        participant={makeParticipant(10)}
        channelId="ch-1"
        isLocal={false}
      />,
    );

    // The ✋ badge is a sibling of the name span in the bottom bar
    const nameSpan = container.querySelector('.truncate');
    expect(nameSpan?.textContent).toContain('User 10');
    const bottomBar = nameSpan?.parentElement;
    expect(bottomBar?.textContent).toContain('✋');
  });

  it('shows ✋ badge beside name when hand is raised and focused', () => {
    mockRaisedHands = new Set([10]);
    mockRemoteFocusByUserId = { 10: true };

    const { container } = render(
      <CallParticipantTile
        participant={makeParticipant(10)}
        channelId="ch-1"
        isLocal={false}
      />,
    );

    const nameSpan = container.querySelector('.truncate');
    const bottomBar = nameSpan?.parentElement;
    expect(bottomBar?.textContent).toContain('✋');
  });
});
