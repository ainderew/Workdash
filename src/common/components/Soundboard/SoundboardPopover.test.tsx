import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import useSoundboardStore from '@/common/store/soundboardStore';
import type { SoundboardSound } from './_types';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// Stub useSoundboardPlay so we control canPlay / cooldownRemaining independently
const mockPlaySound = vi.fn();
const mockUseSoundboardPlay = vi.fn(() => ({
  playSound: mockPlaySound,
  isPlaying: false,
  canPlay: true,
  cooldownRemaining: 0,
}));

vi.mock('./hooks/useSoundboardPlay', () => ({
  useSoundboardPlay: () => mockUseSoundboardPlay(),
}));

// Stub SoundboardSoundCard to a simple, inspectable element
vi.mock('./SoundboardSoundCard', () => ({
  default: ({
    sound,
    onPlay,
    disabled,
  }: {
    sound: SoundboardSound;
    onPlay: (s: SoundboardSound) => void;
    disabled: boolean;
  }) => (
    <button
      data-testid={`sound-card-${sound.id}`}
      data-disabled={disabled}
      onClick={() => onPlay(sound)}
      disabled={disabled}
    >
      {sound.name}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Lazy import after mocks
// ---------------------------------------------------------------------------

import SoundboardPopover from './SoundboardPopover';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWorkspaceSound(overrides: Partial<SoundboardSound> = {}): SoundboardSound {
  return {
    id: 'ws-1',
    workspaceId: 'ws-abc',
    name: 'explosion',
    audioUrl: 'https://cdn.example.com/explosion.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 120_000,
    durationMs: 3200,
    uploadedBy: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePersonalSound(overrides: Partial<SoundboardSound> = {}): SoundboardSound {
  return {
    id: 'ps-1',
    workspaceId: null,
    name: 'fart',
    audioUrl: 'https://cdn.example.com/fart.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 45_000,
    durationMs: 1500,
    uploadedBy: 42,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  useSoundboardStore.setState({
    workspaceSounds: [],
    personalSounds: [],
    isLoading: false,
    fetchedWorkspaceId: null,
    isPlaying: false,
    lastPlayedAt: null,
    cooldownMs: 5000,
  });
  mockUseSoundboardPlay.mockReturnValue({
    playSound: mockPlaySound,
    isPlaying: false,
    canPlay: true,
    cooldownRemaining: 0,
  });
});

// ---------------------------------------------------------------------------
// Tab rendering
// ---------------------------------------------------------------------------

describe('SoundboardPopover — tab rendering', () => {
  it('should render the Shared tab as active by default', () => {
    render(<SoundboardPopover />);
    expect(screen.getByRole('button', { name: /Shared/i })).toBeInTheDocument();
  });

  it('should render the Mine (personal) tab', () => {
    render(<SoundboardPopover />);
    expect(screen.getByRole('button', { name: /Mine/i })).toBeInTheDocument();
  });

  it('should show the workspace sound count in the Shared tab label', () => {
    useSoundboardStore.setState({
      workspaceSounds: [makeWorkspaceSound({ id: 'a' }), makeWorkspaceSound({ id: 'b' })],
    });
    render(<SoundboardPopover />);
    expect(screen.getByRole('button', { name: /Shared \(2\)/i })).toBeInTheDocument();
  });

  it('should show the personal sound count in the Mine tab label', () => {
    useSoundboardStore.setState({
      personalSounds: [makePersonalSound()],
    });
    render(<SoundboardPopover />);
    expect(screen.getByRole('button', { name: /Mine \(1\)/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

describe('SoundboardPopover — tab switching', () => {
  it('should show workspace sounds when Workspace tab is active', () => {
    useSoundboardStore.setState({
      workspaceSounds: [makeWorkspaceSound({ id: 'ws-sound', name: 'explosion' })],
    });
    render(<SoundboardPopover />);
    expect(screen.getByTestId('sound-card-ws-sound')).toBeInTheDocument();
  });

  it('should show personal sounds after clicking My Sounds tab', () => {
    useSoundboardStore.setState({
      workspaceSounds: [makeWorkspaceSound({ id: 'ws-only', name: 'explosion' })],
      personalSounds: [makePersonalSound({ id: 'ps-only', name: 'fart' })],
    });
    render(<SoundboardPopover />);

    fireEvent.click(screen.getByRole('button', { name: /Mine/i }));

    expect(screen.getByTestId('sound-card-ps-only')).toBeInTheDocument();
    expect(screen.queryByTestId('sound-card-ws-only')).not.toBeInTheDocument();
  });

  it('should switch back to workspace sounds after clicking Shared tab', () => {
    useSoundboardStore.setState({
      workspaceSounds: [makeWorkspaceSound({ id: 'ws-back', name: 'explosion' })],
      personalSounds: [makePersonalSound({ id: 'ps-back', name: 'fart' })],
    });
    render(<SoundboardPopover />);

    fireEvent.click(screen.getByRole('button', { name: /Mine/i }));
    fireEvent.click(screen.getByRole('button', { name: /Shared/i }));

    expect(screen.getByTestId('sound-card-ws-back')).toBeInTheDocument();
    expect(screen.queryByTestId('sound-card-ps-back')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

describe('SoundboardPopover — empty states', () => {
  it('should show "No shared sounds yet" when workspace list is empty', () => {
    render(<SoundboardPopover />);
    expect(screen.getByText(/No shared sounds yet/i)).toBeInTheDocument();
  });

  it('should show "No personal sounds yet" when personal tab is active and list is empty', () => {
    render(<SoundboardPopover />);
    fireEvent.click(screen.getByRole('button', { name: /Mine/i }));
    expect(screen.getByText(/No personal sounds yet/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('SoundboardPopover — loading state', () => {
  it('should show a loading spinner when isLoading is true', () => {
    useSoundboardStore.setState({ isLoading: true });
    render(<SoundboardPopover />);
    // The Loader2 icon renders via lucide-react; verify empty state and cards are absent
    expect(screen.queryByText(/No workspace sounds/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/sound-card/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Cooldown timer display
// ---------------------------------------------------------------------------

describe('SoundboardPopover — cooldown timer', () => {
  it('should not show the cooldown timer when cooldownRemaining is 0', () => {
    mockUseSoundboardPlay.mockReturnValue({
      playSound: mockPlaySound,
      isPlaying: false,
      canPlay: true,
      cooldownRemaining: 0,
    });
    render(<SoundboardPopover />);
    expect(screen.queryByText(/\d+\.\d+s/)).not.toBeInTheDocument();
  });

  it('should show the formatted cooldown timer when cooldownRemaining > 0', () => {
    mockUseSoundboardPlay.mockReturnValue({
      playSound: mockPlaySound,
      isPlaying: false,
      canPlay: false,
      cooldownRemaining: 3500,
    });
    render(<SoundboardPopover />);
    // 3500ms → "3.5s"
    expect(screen.getByText('3.5s')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sound card disabled state
// ---------------------------------------------------------------------------

describe('SoundboardPopover — sound card disabled state', () => {
  it('should render sound cards as enabled when canPlay is true', () => {
    mockUseSoundboardPlay.mockReturnValue({
      playSound: mockPlaySound,
      isPlaying: false,
      canPlay: true,
      cooldownRemaining: 0,
    });
    useSoundboardStore.setState({ workspaceSounds: [makeWorkspaceSound()] });

    render(<SoundboardPopover />);

    const card = screen.getByTestId('sound-card-ws-1');
    expect(card).not.toBeDisabled();
  });

  it('should render sound cards as disabled when canPlay is false', () => {
    mockUseSoundboardPlay.mockReturnValue({
      playSound: mockPlaySound,
      isPlaying: true,
      canPlay: false,
      cooldownRemaining: 0,
    });
    useSoundboardStore.setState({ workspaceSounds: [makeWorkspaceSound()] });

    render(<SoundboardPopover />);

    const card = screen.getByTestId('sound-card-ws-1');
    expect(card).toBeDisabled();
  });

  it('should call playSound with the correct sound when a card is clicked', () => {
    useSoundboardStore.setState({ workspaceSounds: [makeWorkspaceSound()] });
    render(<SoundboardPopover />);

    fireEvent.click(screen.getByTestId('sound-card-ws-1'));

    expect(mockPlaySound).toHaveBeenCalledWith(expect.objectContaining({ id: 'ws-1' }));
  });
});
