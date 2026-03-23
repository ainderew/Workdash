import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateRoomModal from '../CreateRoomModal';

const mockListWorkspaceMembers = vi.fn();

vi.mock('@/communication/chatV2/chatV2Service', () => ({
  ChatV2Service: {
    getInstance: () => ({
      listWorkspaceMembers: mockListWorkspaceMembers,
    }),
  },
}));

vi.mock('@/common/utils/displayName', () => ({
  getDisplayName: (user: { name?: string } | null, fallback: string) =>
    user?.name ?? fallback,
}));

let mockCurrentUserId = 1;
vi.mock('@/common/store/useStore', () => ({
  default: vi.fn((selector: (state: { backendUser: { id: number } | null }) => unknown) =>
    selector({ backendUser: { id: mockCurrentUserId } }),
  ),
}));

vi.mock('../DeskModalShell', () => ({
  default: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div>{children}</div> : null),
}));

vi.mock('../../UserAvatar', () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const MOCK_MEMBERS = [
  {
    userId: 2,
    user: {
      name: 'Alice',
      nickname: null,
      image: null,
      characterCustomization: null,
    },
  },
  {
    userId: 3,
    user: {
      name: 'Bob',
      nickname: null,
      image: null,
      characterCustomization: null,
    },
  },
];

const DEFAULT_PROPS = {
  isOpen: true,
  categoryOptions: [{ id: null, name: 'Uncategorized' }],
  initialCategoryId: null,
  workspaceId: 'ws-1',
  onClose: vi.fn(),
  onSubmit: vi.fn(),
};

function renderModal(
  overrides: Partial<React.ComponentProps<typeof CreateRoomModal>> = {},
) {
  const props = { ...DEFAULT_PROPS, ...overrides };
  const result = render(<CreateRoomModal {...props} />);
  return { ...result, props };
}

describe('CreateRoomModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUserId = 1;
    mockListWorkspaceMembers.mockResolvedValue(MOCK_MEMBERS);
  });

  it('renders with PUBLIC visibility selected by default', () => {
    renderModal();
    const publicButton = screen.getByRole('button', { name: /Public/i });
    const privateButton = screen.getByRole('button', { name: /Private/i });
    expect(publicButton).toHaveAttribute('aria-pressed', 'true');
    expect(privateButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Private shows member picker section', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Private/i }));

    expect(
      screen.getByPlaceholderText('Search members...'),
    ).toBeInTheDocument();
  });

  it('clicking a member adds them as a chip', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Private/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Alice' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Alice' }));

    expect(screen.getByLabelText('Remove Alice')).toBeInTheDocument();
  });

  it('clicking X on chip removes the member', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Private/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Alice' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Alice' }));

    const removeButton = screen.getByLabelText('Remove Alice');
    fireEvent.click(removeButton);

    expect(screen.queryByLabelText('Remove Alice')).not.toBeInTheDocument();
  });

  it('current user is excluded from picker', async () => {
    mockCurrentUserId = 2;
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Private/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Bob' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Add Alice' })).not.toBeInTheDocument();
  });

  it('search filters members by display name', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Private/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Alice' })).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search members...');
    fireEvent.change(searchInput, { target: { value: 'ali' } });

    expect(screen.getByRole('button', { name: 'Add Alice' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Bob' })).not.toBeInTheDocument();
  });

  it('submitting with empty name shows error', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Create Channel/i }));

    expect(screen.getByText('Channel name is required.')).toBeInTheDocument();
  });

  it('submitting PUBLIC form calls onSubmit correctly', () => {
    const { props } = renderModal();
    const nameInput = screen.getByPlaceholderText('e.g. design-updates');
    fireEvent.change(nameInput, { target: { value: 'general' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Channel/i }));

    expect(props.onSubmit).toHaveBeenCalledWith('general', null, 'PUBLIC', []);
  });

  it('submitting PRIVATE form passes selected member IDs', async () => {
    const { props } = renderModal();
    const nameInput = screen.getByPlaceholderText('e.g. design-updates');
    fireEvent.change(nameInput, { target: { value: 'secret' } });

    fireEvent.click(screen.getByRole('button', { name: /Private/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Alice' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Alice' }));

    fireEvent.click(screen.getByRole('button', { name: /Create Channel/i }));

    expect(props.onSubmit).toHaveBeenCalledWith('secret', null, 'PRIVATE', [2]);
  });

  it('form resets when modal reopens', async () => {
    const { props, rerender } = renderModal();

    const nameInput = screen.getByPlaceholderText('e.g. design-updates');
    fireEvent.change(nameInput, { target: { value: 'my-channel' } });
    fireEvent.click(screen.getByRole('button', { name: /Private/i }));

    rerender(<CreateRoomModal {...props} isOpen={false} />);
    rerender(<CreateRoomModal {...props} isOpen={true} />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText(
        'e.g. design-updates',
      ) as HTMLInputElement;
      expect(input.value).toBe('');
    });

    const publicButton = screen.getByRole('button', { name: /Public/i });
    expect(publicButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows error message when member fetch fails', async () => {
    mockListWorkspaceMembers.mockRejectedValue(new Error('Network error'));
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Private/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Could not load members. Please close and try again.'),
      ).toBeInTheDocument();
    });
  });

  it('disables submit button and shows "Creating..." when isSubmitting is true', () => {
    renderModal({ isSubmitting: true });
    const submitButton = screen.getByRole('button', { name: /Creating.../i });
    expect(submitButton).toBeDisabled();
  });
});
