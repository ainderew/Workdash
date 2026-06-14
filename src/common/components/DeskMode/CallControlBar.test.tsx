import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSendReaction = vi.fn();
const mockToggleRaiseHand = vi.fn();
let mockIsRaisingHand = false;

vi.mock('./hooks/useCallReaction', () => ({
  useCallReaction: () => ({
    sendReaction: mockSendReaction,
    toggleRaiseHand: mockToggleRaiseHand,
    isRaisingHand: mockIsRaisingHand,
  }),
}));

vi.mock('@/common/store/callStore', () => ({
  default: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      connectionQuality: 'good',
      statsSnapshot: null,
    }),
  ),
}));

vi.mock('./MicSplitButton', () => ({
  default: () => <button>Mic</button>,
}));

vi.mock('./VideoSplitButton', () => ({
  default: () => <button>Video</button>,
}));

vi.mock('./DisplayModeSplitButton', () => ({
  default: () => null,
}));

vi.mock('./NoiseCancelToggle', () => ({
  default: () => null,
}));

vi.mock('./StageButton', () => ({
  default: () => null,
}));

vi.mock('@/common/components/Soundboard/SoundboardButton', () => ({
  default: () => null,
}));

vi.mock('./ReactionPickerFlyout', () => ({
  default: ({
    onSelectEmoji,
  }: {
    onSelectEmoji: (emoji: string) => void;
    onClose?: () => void;
  }) => (
    <div data-testid="reaction-flyout">
      <button onClick={() => onSelectEmoji('👍')}>👍</button>
      <button onClick={() => onSelectEmoji('😂')}>😂</button>
    </div>
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

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import CallControlBar from './CallControlBar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  onToggleMic: vi.fn(),
  onToggleVideo: vi.fn(),
  onToggleScreenShare: vi.fn(),
  onLeave: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockIsRaisingHand = false;
});

describe('CallControlBar reactions', () => {
  it('renders a reaction trigger button with SmilePlus tooltip', () => {
    render(<CallControlBar {...defaultProps} />);
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('clicking reaction button opens flyout', () => {
    render(<CallControlBar {...defaultProps} />);
    // Find the trigger button by its data attribute
    const trigger = document.querySelector(
      '[data-emoji-picker-trigger]',
    ) as HTMLElement;
    fireEvent.click(trigger);
    expect(screen.getByTestId('reaction-flyout')).toBeInTheDocument();
  });

  it('clicking an emoji in flyout calls sendReaction with correct emoji', () => {
    render(<CallControlBar {...defaultProps} />);
    const trigger = document.querySelector(
      '[data-emoji-picker-trigger]',
    ) as HTMLElement;
    fireEvent.click(trigger);

    fireEvent.click(screen.getByText('👍'));
    expect(mockSendReaction).toHaveBeenCalledWith('👍');
  });

  it('flyout stays open after selecting an emoji', () => {
    render(<CallControlBar {...defaultProps} />);
    const trigger = document.querySelector(
      '[data-emoji-picker-trigger]',
    ) as HTMLElement;
    fireEvent.click(trigger);
    expect(screen.getByTestId('reaction-flyout')).toBeInTheDocument();

    fireEvent.click(screen.getByText('😂'));
    expect(screen.getByTestId('reaction-flyout')).toBeInTheDocument();
  });

  it('raise hand button calls toggleRaiseHand', () => {
    render(<CallControlBar {...defaultProps} />);
    // The raise hand text is rendered by the TooltipContent mock as a <span>.
    // In the mocked Tooltip structure, the button is a sibling rendered
    // before the tooltip content span. Use previousElementSibling.
    const raiseHandSpan = screen.getByText('Raise hand');
    const btn = raiseHandSpan.previousElementSibling as HTMLElement;
    fireEvent.click(btn);
    expect(mockToggleRaiseHand).toHaveBeenCalled();
  });

  it('raise hand button shows "Lower hand" tooltip when isRaisingHand is true', () => {
    mockIsRaisingHand = true;
    render(<CallControlBar {...defaultProps} />);
    expect(screen.getByText('Lower hand')).toBeInTheDocument();
  });
});
