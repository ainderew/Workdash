import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserSettingsModal from './UserSettingsModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdateOwnUserProfile = vi.fn().mockResolvedValue({
  user: { id: 1, name: 'Test User', bio: 'Updated bio', banner: null },
  isSelf: true,
  friendshipStatus: null,
});

const mockGetUserProfile = vi.fn().mockResolvedValue({
  user: {
    id: 1,
    name: 'Test User',
    nickname: null,
    bio: 'Existing bio',
    image: null,
    banner: null,
  },
  isSelf: true,
  friendshipStatus: null,
});

vi.mock('@/communication/chatV2/chatV2Service', () => ({
  ChatV2Service: {
    getInstance: vi.fn(() => ({
      getUserProfile: mockGetUserProfile,
      updateOwnUserProfile: mockUpdateOwnUserProfile,
    })),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      backendJwt: 'test-jwt',
      backendUser: { name: 'Test User', nickname: null },
      user: { name: 'Test User' },
    },
  })),
}));

vi.mock('@/common/store/useStore', () => {
  const store = {
    user: { name: 'Test User', nickname: null, image: null },
    backendUser: { id: 1, name: 'Test User', nickname: null, image: null },
    updateUser: vi.fn(),
    updateBackendUser: vi.fn(),
  };
  const useUserStore = (selector: (s: typeof store) => unknown) =>
    selector(store);
  useUserStore.getState = () => store;
  return { default: useUserStore };
});

vi.mock('@/game/character/CharacterEventBus', () => ({
  CharacterEventBus: {
    emitNameUpdate: vi.fn(),
  },
}));

vi.mock('@/common/utils/displayName', () => ({
  getDisplayNameFromParts: vi.fn(
    (nickname: string | null, name: string, fallback: string) =>
      nickname || name || fallback,
  ),
}));

vi.mock('@/common/utils/config', () => ({
  CONFIG: { SFU_SERVER_URL: 'http://localhost:3001' },
}));

// Mock panels that transitively import Phaser/canvas-dependent modules
vi.mock('./user-settings/AppearancePanel', () => ({
  default: () => <div data-testid="appearance-panel">Appearance Panel</div>,
}));

vi.mock('./user-settings/AudioVideoPanel', () => ({
  default: () => <div data-testid="audio-video-panel">Audio & Video Panel</div>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderModal(isOpen = true) {
  const onClose = vi.fn();
  const result = render(
    <UserSettingsModal isOpen={isOpen} onClose={onClose} />,
  );
  return { ...result, onClose };
}

/** Render modal and wait for the async profile‐load effect to settle. */
async function renderModalAsync(isOpen = true) {
  const result = renderModal(isOpen);
  if (isOpen) {
    await waitFor(() => {
      expect(mockGetUserProfile).toHaveBeenCalled();
    });
  }
  return result;
}

function setupFetchSuccess(user = { name: 'Test User', nickname: null }) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ user }),
  });
}

function changeInput(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.__MULTIPLAYER__ = undefined;
  });

  describe('rendering', () => {
    it('renders nothing when closed', () => {
      renderModal(false);
      expect(screen.queryByText('User Settings')).not.toBeInTheDocument();
    });

    it('renders modal with title when open', async () => {
      await renderModalAsync();
      expect(screen.getByText('User Settings')).toBeInTheDocument();
    });

    it('shows My Account category by default', async () => {
      await renderModalAsync();
      expect(screen.getByText('My Account')).toBeInTheDocument();
    });

    it('renders all sidebar categories', async () => {
      await renderModalAsync();
      expect(screen.getByText('My Account')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Audio & Video')).toBeInTheDocument();
    });
  });

  describe('Account panel fields', () => {
    it('renders Full Name field', async () => {
      await renderModalAsync();
      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter your full name'),
      ).toBeInTheDocument();
    });

    it('renders Nickname field', async () => {
      await renderModalAsync();
      expect(screen.getByText('Nickname (Optional)')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Shown instead of full name'),
      ).toBeInTheDocument();
    });

    it('renders Bio section with textarea', async () => {
      await renderModalAsync();
      expect(screen.getByText('About Me')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Write a short bio...'),
      ).toBeInTheDocument();
    });

    it('renders Avatar upload button', async () => {
      await renderModalAsync();
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });

    it('renders Save Changes and Cancel buttons', async () => {
      await renderModalAsync();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('bio editing', () => {
    it('loads existing bio from profile on mount', async () => {
      renderModal();
      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledWith(1);
      });
    });

    it('allows typing in the bio textarea', async () => {
      await renderModalAsync();
      const textarea = screen.getByPlaceholderText('Write a short bio...');
      changeInput(textarea, 'New bio text');
      expect(textarea).toHaveValue('New bio text');
    });

    it('shows character count', async () => {
      await renderModalAsync();
      expect(screen.getByText(/\/280$/)).toBeInTheDocument();
    });

    it('saves bio when Save Changes is clicked', async () => {
      setupFetchSuccess();
      renderModal();

      // Wait for bio to load
      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalled();
      });

      const textarea = screen.getByPlaceholderText('Write a short bio...');
      changeInput(textarea, 'My updated bio');

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockUpdateOwnUserProfile).toHaveBeenCalledWith({
          bio: 'My updated bio',
        });
      });
    });

    it('does not save bio if unchanged', async () => {
      setupFetchSuccess();
      renderModal();

      // Wait for bio to load (sets initialBio = 'Existing bio')
      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalled();
      });

      // Don't change the bio — just click save
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockUpdateOwnUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('name/nickname saving', () => {
    it('saves name via PATCH /api/user/profile', async () => {
      setupFetchSuccess({ name: 'New Name', nickname: null });
      renderModal();

      const nameInput = screen.getByPlaceholderText('Enter your full name');
      changeInput(nameInput, 'New Name');

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/user/profile',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('New Name'),
          }),
        );
      });
    });

    it('shows error when name is empty', async () => {
      await renderModalAsync();

      const nameInput = screen.getByPlaceholderText('Enter your full name');
      changeInput(nameInput, '');

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(
          screen.getByText('Full name cannot be empty.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('cancel', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const { onClose } = await renderModalAsync();
      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('category navigation', () => {
    it('switches to Appearance panel', async () => {
      await renderModalAsync();
      fireEvent.click(screen.getByText('Appearance'));
      expect(
        screen.queryByPlaceholderText('Enter your full name'),
      ).not.toBeInTheDocument();
    });

    it('switches to Audio & Video panel', async () => {
      await renderModalAsync();
      fireEvent.click(screen.getByText('Audio & Video'));
      expect(
        screen.queryByPlaceholderText('Enter your full name'),
      ).not.toBeInTheDocument();
    });
  });
});
