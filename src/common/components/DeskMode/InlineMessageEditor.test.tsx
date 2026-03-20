import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineMessageEditor from './InlineMessageEditor';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/common/store/useStore', () => {
  const state = { backendUser: { id: 1, name: 'Self', nickname: null } };
  const hook = (selector: (s: typeof state) => unknown) => selector(state);
  hook.getState = () => state;
  return { default: hook };
});

vi.mock('@/common/store/chatV2Store', () => {
  const state = { selectedWorkspaceId: 'ws-1' };
  const hook = (selector: (s: typeof state) => unknown) => selector(state);
  hook.getState = () => state;
  return { default: hook };
});

vi.mock('@/common/store/customEmojiStore', () => {
  const state = { emojisByWorkspace: { 'ws-1': [] } };
  const hook = (selector: (s: typeof state) => unknown) => selector(state);
  hook.getState = () => state;
  return { default: hook };
});

vi.mock('./MentionSuggestionFlyout', () => ({
  default: () => <div data-testid="mention-flyout" />,
}));

vi.mock('./EmojiAutocompleteFlyout', () => ({
  default: () => <div data-testid="emoji-flyout" />,
}));

vi.mock('lottie-web', () => ({
  default: { loadAnimation: vi.fn() },
}));

vi.mock('lottie-react', () => ({
  default: () => <div data-testid="lottie-animation" />,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultProps = {
  initialContent: 'Hello world',
  onSave: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  members: [],
};

function renderEditor(overrides: Partial<typeof defaultProps> = {}) {
  return render(<InlineMessageEditor {...defaultProps} {...overrides} />);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('InlineMessageEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Editing message" header', () => {
    renderEditor();
    expect(screen.getByText('Editing message')).toBeInTheDocument();
  });

  it('renders save and cancel buttons', () => {
    renderEditor();
    expect(screen.getByTitle('Save (Enter)')).toBeInTheDocument();
    expect(screen.getByTitle('Cancel (Escape)')).toBeInTheDocument();
  });

  it('cancel button calls onCancel', () => {
    const onCancel = vi.fn();
    renderEditor({ onCancel });
    fireEvent.click(screen.getByTitle('Cancel (Escape)'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders formatting toolbar', () => {
    renderEditor();
    expect(
      screen.getByRole('toolbar', { name: 'Text formatting' }),
    ).toBeInTheDocument();
  });

  it('renders escape to cancel hint text', () => {
    renderEditor();
    expect(
      screen.getByText('escape to cancel · enter to save'),
    ).toBeInTheDocument();
  });

  it('renders the Tiptap editor with textbox role', () => {
    renderEditor();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows validation error when attempting to save empty content', async () => {
    renderEditor({ initialContent: '' });
    fireEvent.click(screen.getByTitle('Save (Enter)'));
    // Validation error should appear
    expect(
      await screen.findByText('Message cannot be empty'),
    ).toBeInTheDocument();
  });
});
