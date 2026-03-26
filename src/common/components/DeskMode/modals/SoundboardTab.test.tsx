import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import useSoundboardStore from '@/common/store/soundboardStore';
import type { SoundboardSound } from '@/common/components/Soundboard/_types';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('@/common/store/useStore', () => {
  const store = { backendUser: { id: 1 } };
  const useUserStore = vi.fn((selector: (s: typeof store) => unknown) => selector(store));
  useUserStore.getState = () => store;
  return { default: useUserStore };
});

vi.mock('./SoundboardUploadForm', () => ({
  default: ({ workspaceId, disabled }: { workspaceId: string; disabled?: boolean }) => (
    <div data-testid="upload-form" data-workspace={workspaceId} data-disabled={disabled ? 'true' : 'false'} />
  ),
}));

vi.mock('./SoundboardListItem', () => ({
  default: ({
    sound,
    canManage,
  }: {
    sound: SoundboardSound;
    workspaceId: string;
    canManage: boolean;
  }) => (
    <div data-testid={`list-item-${sound.id}`} data-can-manage={canManage ? 'true' : 'false'}>
      {sound.name}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Lazy import after mocks
// ---------------------------------------------------------------------------

import SoundboardTab from './SoundboardTab';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WS_ID = 'ws-test-1';

function makeWorkspaceSound(overrides: Partial<SoundboardSound> = {}): SoundboardSound {
  return {
    id: 'ws-1',
    workspaceId: WS_ID,
    name: 'explosion',
    audioUrl: 'https://cdn.example.com/explosion.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 120_000,
    durationMs: 3200,
    uploadedBy: 10,
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
    uploadedBy: 1, // matches the mocked viewer id
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
});

// ---------------------------------------------------------------------------
// Upload count display
// ---------------------------------------------------------------------------

describe('SoundboardTab — upload count display', () => {
  it('should show 0/50 workspace and 0/10 personal when both lists are empty', () => {
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByText(/0\/50 workspace sounds/i)).toBeInTheDocument();
    expect(screen.getByText(/0\/10 personal sounds/i)).toBeInTheDocument();
  });

  it('should reflect the current workspace sound count', () => {
    useSoundboardStore.setState({
      workspaceSounds: [
        makeWorkspaceSound({ id: 'a' }),
        makeWorkspaceSound({ id: 'b' }),
      ],
    });
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByText(/2\/50 workspace sounds/i)).toBeInTheDocument();
  });

  it('should reflect the current personal sound count', () => {
    useSoundboardStore.setState({
      personalSounds: [makePersonalSound({ id: 'p1' }), makePersonalSound({ id: 'p2' })],
    });
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByText(/2\/10 personal sounds/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('SoundboardTab — loading state', () => {
  it('should show a loading spinner and hide content when isLoading is true', () => {
    useSoundboardStore.setState({ isLoading: true });
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.queryByTestId('upload-form')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Upload form
// ---------------------------------------------------------------------------

describe('SoundboardTab — SoundboardUploadForm', () => {
  it('should render the upload form with the correct workspaceId', () => {
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    const form = screen.getByTestId('upload-form');
    expect(form).toHaveAttribute('data-workspace', WS_ID);
  });

  it('should pass disabled=false to the upload form when both limits are not reached', () => {
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByTestId('upload-form')).toHaveAttribute('data-disabled', 'false');
  });

  it('should pass disabled=true to the upload form when both workspace and personal limits are reached', () => {
    const ws = Array.from({ length: 50 }, (_, i) =>
      makeWorkspaceSound({ id: `ws-${i}` }),
    );
    const ps = Array.from({ length: 10 }, (_, i) =>
      makePersonalSound({ id: `ps-${i}` }),
    );
    useSoundboardStore.setState({ workspaceSounds: ws, personalSounds: ps });

    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);

    expect(screen.getByTestId('upload-form')).toHaveAttribute('data-disabled', 'true');
  });

  it('should not disable the form when only workspace limit is reached (personal still has space)', () => {
    const ws = Array.from({ length: 50 }, (_, i) =>
      makeWorkspaceSound({ id: `ws-${i}` }),
    );
    useSoundboardStore.setState({ workspaceSounds: ws, personalSounds: [] });

    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);

    expect(screen.getByTestId('upload-form')).toHaveAttribute('data-disabled', 'false');
  });
});

// ---------------------------------------------------------------------------
// Sound lists — workspace section
// ---------------------------------------------------------------------------

describe('SoundboardTab — workspace sound list', () => {
  it('should not render the Workspace Sounds section when the list is empty', () => {
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    // The section heading is exact uppercase "Workspace Sounds" — distinct from the
    // count string "0/50 workspace sounds" in the summary row.
    expect(screen.queryByText('Workspace Sounds')).not.toBeInTheDocument();
  });

  it('should render a list item for each workspace sound', () => {
    useSoundboardStore.setState({
      workspaceSounds: [
        makeWorkspaceSound({ id: 'ws-a', name: 'oof' }),
        makeWorkspaceSound({ id: 'ws-b', name: 'boom' }),
      ],
    });
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByTestId('list-item-ws-a')).toBeInTheDocument();
    expect(screen.getByTestId('list-item-ws-b')).toBeInTheDocument();
  });

  it('should pass canManage=true to a workspace sound uploaded by the viewer', () => {
    // viewer id = 1 (from the useUserStore mock)
    useSoundboardStore.setState({
      workspaceSounds: [makeWorkspaceSound({ id: 'ws-own', uploadedBy: 1 })],
    });
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByTestId('list-item-ws-own')).toHaveAttribute('data-can-manage', 'true');
  });

  it('should pass canManage=false to a workspace sound uploaded by another user when canManage prop is false', () => {
    useSoundboardStore.setState({
      workspaceSounds: [makeWorkspaceSound({ id: 'ws-other', uploadedBy: 99 })],
    });
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByTestId('list-item-ws-other')).toHaveAttribute('data-can-manage', 'false');
  });

  it('should pass canManage=true to any workspace sound when canManage prop is true (admin)', () => {
    useSoundboardStore.setState({
      workspaceSounds: [makeWorkspaceSound({ id: 'ws-admin-view', uploadedBy: 99 })],
    });
    render(<SoundboardTab workspaceId={WS_ID} canManage={true} />);
    expect(screen.getByTestId('list-item-ws-admin-view')).toHaveAttribute('data-can-manage', 'true');
  });
});

// ---------------------------------------------------------------------------
// Sound lists — personal section
// ---------------------------------------------------------------------------

describe('SoundboardTab — personal sound list', () => {
  it('should not render the My Sounds section when the list is empty', () => {
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.queryByText(/My Sounds/i)).not.toBeInTheDocument();
  });

  it('should render a list item for each personal sound', () => {
    useSoundboardStore.setState({
      personalSounds: [
        makePersonalSound({ id: 'ps-x', name: 'giggle' }),
      ],
    });
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByTestId('list-item-ps-x')).toBeInTheDocument();
  });

  it('should always pass canManage=true to personal sound items', () => {
    useSoundboardStore.setState({
      personalSounds: [makePersonalSound({ id: 'ps-manage' })],
    });
    render(<SoundboardTab workspaceId={WS_ID} canManage={false} />);
    expect(screen.getByTestId('list-item-ps-manage')).toHaveAttribute('data-can-manage', 'true');
  });
});
