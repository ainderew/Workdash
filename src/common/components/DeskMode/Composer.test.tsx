import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Composer from './Composer';

// ─── Factory helpers ─────────────────────────────────────────────────────────

function makeMember(
  userId: number,
  name: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    userId,
    status: 'ACTIVE' as const,
    user: {
      id: userId,
      name,
      nickname: null as string | null,
      image: null as string | null,
      ...overrides,
    },
  };
}

function makeFile(name = 'test.png', type = 'image/png') {
  return new File(['binary'], name, { type });
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

const {
  mockUploadChatFileForMessage,
  mockUploadWithProgress,
  mockAddPendingMessage,
  mockMarkPendingMessageFailed,
} = vi.hoisted(() => ({
  mockUploadChatFileForMessage: vi.fn(),
  mockUploadWithProgress: vi.fn(),
  mockAddPendingMessage: vi.fn(),
  mockMarkPendingMessageFailed: vi.fn(),
}));

vi.mock('@/communication/chatV2/uploadService', () => ({
  uploadChatFileForMessage: (...args: unknown[]) =>
    mockUploadChatFileForMessage(...args),
  uploadChatFileForMessageWithProgress: (...args: unknown[]) =>
    mockUploadWithProgress(...args),
}));

vi.mock('@/common/utils/mediaMetadata', () => ({
  extractImageMetadata: vi
    .fn()
    .mockResolvedValue({ width: 10, height: 10, blurhash: null }),
  extractVideoMetadata: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/common/store/useStore', () => {
  const state = { backendUser: { id: 1, name: 'Self', nickname: null } };
  const hook = (selector: (s: typeof state) => unknown) => selector(state);
  hook.getState = () => state;
  return { default: hook };
});

vi.mock('@/common/store/chatV2Store', () => {
  const state = {
    selectedWorkspaceId: 'ws-1',
    addPendingMessage: mockAddPendingMessage,
    markPendingMessageFailed: mockMarkPendingMessageFailed,
  };
  const hook = (selector: (s: typeof state) => unknown) => selector(state);
  hook.getState = () => state;
  return { default: hook };
});

vi.mock('@/common/store/customEmojiStore', () => {
  const emojis = [
    { id: 'e1', name: 'wave', url: 'https://cdn.test/wave.png', workspaceId: 'ws-1' },
    { id: 'e2', name: 'fire', url: 'https://cdn.test/fire.png', workspaceId: 'ws-1' },
    { id: 'e3', name: 'rocket', url: 'https://cdn.test/rocket.png', workspaceId: 'ws-1' },
  ];
  const state = { emojisByWorkspace: { 'ws-1': emojis } };
  const hook = (selector: (s: typeof state) => unknown) => selector(state);
  hook.getState = () => state;
  return { default: hook };
});

// Mock child components as stubs
vi.mock('./MentionSuggestionFlyout', () => ({
  default: ({
    suggestions,
    selectedIndex,
    onSelect,
    onClose,
  }: {
    suggestions: Array<{ userId: number; name: string }>;
    selectedIndex: number;
    onSelect: (s: { userId: number; name: string }) => void;
    onClose: () => void;
  }) => (
    <div data-testid="mention-flyout">
      <span data-testid="mention-count">{suggestions.length}</span>
      <span data-testid="mention-selected">{selectedIndex}</span>
      {suggestions.map((s) => (
        <button
          key={s.userId}
          data-testid={`mention-${s.userId}`}
          onClick={() => onSelect(s)}
        >
          {s.name}
        </button>
      ))}
      <button data-testid="mention-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

vi.mock('./EmojiAutocompleteFlyout', () => ({
  default: ({
    emojis,
    selectedIndex,
    onSelect,
    onClose,
  }: {
    emojis: Array<{ id: string; name: string }>;
    selectedIndex: number;
    onSelect: (e: { id: string; name: string }) => void;
    onClose: () => void;
  }) => (
    <div data-testid="emoji-flyout">
      <span data-testid="emoji-count">{emojis.length}</span>
      <span data-testid="emoji-selected">{selectedIndex}</span>
      {emojis.map((e) => (
        <button
          key={e.id}
          data-testid={`emoji-${e.name}`}
          onClick={() => onSelect(e)}
        >
          {e.name}
        </button>
      ))}
      <button data-testid="emoji-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

vi.mock('./BotCommandAutocomplete', () => {
  const testEntries = [
    {
      botId: 'bot-1',
      botName: 'MusicBot',
      botAvatar: 'avatar.png',
      command: 'play',
      description: 'Play a song',
      args: '<url>',
    },
    {
      botId: 'bot-1',
      botName: 'MusicBot',
      botAvatar: 'avatar.png',
      command: 'pause',
      description: 'Pause playback',
    },
  ];

  return {
    BotCommandFlyout: ({
      entries,
      selectedIndex,
      onSelect,
      onClose,
    }: {
      entries: Array<{ command: string }>;
      selectedIndex: number;
      onSelect: (e: { command: string }) => void;
      onClose: () => void;
    }) => (
      <div data-testid="command-flyout">
        <span data-testid="command-count">{entries.length}</span>
        <span data-testid="command-selected">{selectedIndex}</span>
        {entries.map((e) => (
          <button
            key={e.command}
            data-testid={`command-${e.command}`}
            onClick={() => onSelect(e)}
          >
            {e.command}
          </button>
        ))}
        <button data-testid="command-close" onClick={onClose}>
          close
        </button>
      </div>
    ),
    useBotCommandSearch: (query: string) => {
      if (query === '') return testEntries;
      const lower = query.toLowerCase();
      return testEntries.filter((e) => e.command.includes(lower));
    },
  };
});

vi.mock('./EmojiPicker', () => ({
  default: ({
    onSelect,
    onClose,
  }: {
    onSelect: (emoji: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="emoji-picker">
      <button data-testid="emoji-pick-smile" onClick={() => onSelect('\u{1F600}')}>
        pick smile
      </button>
      <button data-testid="emoji-picker-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

vi.mock('./DeskGifPicker', () => ({
  default: ({
    onSelectGif,
    onClose,
  }: {
    onSelectGif: (url: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="gif-picker">
      <button
        data-testid="gif-select"
        onClick={() => onSelectGif('https://gif.test/1.gif')}
      >
        Pick GIF
      </button>
      <button data-testid="gif-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

interface ComposerAttachmentGridMockUpload {
  clientId: string;
  displayName: string;
  status: string;
}

vi.mock('./Composer/ComposerAttachmentGrid', () => ({
  ComposerAttachmentGrid: ({
    uploads,
    onRemove,
  }: {
    uploads: ComposerAttachmentGridMockUpload[];
    onRemove: (id: string) => void;
  }) => (
    <div data-testid="attachment-preview">
      <span data-testid="attachment-count">{uploads.length}</span>
      {uploads.map((upload, index) => (
        <div key={upload.clientId}>
          <span data-testid={`attachment-name-${index}`}>
            {upload.displayName}
          </span>
          <span data-testid={`attachment-status-${index}`}>
            {upload.status}
          </span>
          <button
            data-testid={`attachment-remove-${index}`}
            onClick={() => onRemove(upload.clientId)}
          >
            remove
          </button>
        </div>
      ))}
    </div>
  ),
}));


// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultProps = {
  roomId: 'room-1',
  onSend: vi.fn().mockResolvedValue(undefined),
  members: [
    makeMember(2, 'Alice'),
    makeMember(3, 'Bob'),
    makeMember(1, 'Self'),
  ],
};

function renderComposer(overrides: Record<string, unknown> = {}) {
  return render(<Composer {...defaultProps} {...overrides} />);
}

function getEditor(): HTMLElement {
  return screen.getByRole('textbox');
}

function getSendButton(): HTMLElement {
  return screen.getByTitle('Send message');
}


// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const successAttachment = {
      id: 'att-1',
      storageProvider: 'GCS' as const,
      objectKey: 'uploads/test.png',
      originalFileName: 'test.png',
      mimeType: 'image/png',
      sizeBytes: '1024',
      sha256: 'abc',
      isImage: true,
      width: 10,
      height: 10,
      blurhash: null,
      hasPoster: false,
      durationMs: null,
    };
    mockUploadChatFileForMessage.mockResolvedValue({
      fileId: 'file-1',
      attachment: successAttachment,
    });
    mockUploadWithProgress.mockImplementation(
      async ({ onProgress }: { onProgress?: (r: number) => void }) => {
        onProgress?.(1);
        return {
          fileId: 'file-1',
          attachment: successAttachment,
          cancel: vi.fn(),
        };
      },
    );

    // Stub object URL APIs for tile previews.
    if (typeof URL.createObjectURL !== 'function') {
      (URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(
        () => 'blob:http://localhost/mock',
      );
    } else {
      URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock');
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();
    } else {
      URL.revokeObjectURL = vi.fn();
    }
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders editor with textbox role', () => {
      renderComposer();
      expect(getEditor()).toBeInTheDocument();
    });

    it('renders send button', () => {
      renderComposer();
      expect(getSendButton()).toBeInTheDocument();
    });

    it('renders attach file button', () => {
      renderComposer();
      expect(screen.getByTitle('Attach file')).toBeInTheDocument();
    });

    it('renders GIF button', () => {
      renderComposer();
      expect(screen.getByTitle('Send GIF')).toBeInTheDocument();
    });

    it('renders emoji picker button', () => {
      renderComposer();
      expect(screen.getByTitle('Emoji picker')).toBeInTheDocument();
    });

    it('renders code block toggle button', () => {
      renderComposer();
      expect(screen.getByTitle('Toggle code block')).toBeInTheDocument();
    });
  });

  // ── Send Button ────────────────────────────────────────────────────────

  describe('send button', () => {
    it('is disabled when editor is empty and no file', () => {
      renderComposer();
      expect(getSendButton()).toBeDisabled();
    });
  });

  // ── File Attachment ────────────────────────────────────────────────────

  describe('file attachment', () => {
    it('shows attachment preview when file is selected', async () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file = makeFile();
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-preview')).toBeInTheDocument();
        expect(screen.getByTestId('attachment-name-0')).toHaveTextContent(
          'test.png',
        );
      });
    });

    it('shows multiple files when multiple are selected', async () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, {
        target: {
          files: [
            makeFile('a.png'),
            makeFile('b.png'),
            makeFile('c.png'),
          ],
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-count')).toHaveTextContent('3');
      });
      expect(screen.getByTestId('attachment-name-0')).toHaveTextContent('a.png');
      expect(screen.getByTestId('attachment-name-1')).toHaveTextContent('b.png');
      expect(screen.getByTestId('attachment-name-2')).toHaveTextContent('c.png');
    });

    it('clears file when remove button is clicked', async () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
      await waitFor(() => {
        expect(screen.getByTestId('attachment-preview')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('attachment-remove-0'));
      await waitFor(() => {
        expect(
          screen.queryByTestId('attachment-preview'),
        ).not.toBeInTheDocument();
      });
    });

    it('removes a single file from a multi-file selection by clientId', async () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, {
        target: {
          files: [makeFile('a.png'), makeFile('b.png'), makeFile('c.png')],
        },
      });
      await waitFor(() => {
        expect(screen.getByTestId('attachment-count')).toHaveTextContent('3');
      });

      fireEvent.click(screen.getByTestId('attachment-remove-1'));
      await waitFor(() => {
        expect(screen.getByTestId('attachment-count')).toHaveTextContent('2');
      });
      expect(screen.getByTestId('attachment-name-0')).toHaveTextContent('a.png');
      expect(screen.getByTestId('attachment-name-1')).toHaveTextContent('c.png');
    });

    it('enables send button once the upload finishes', async () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [makeFile()] } });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-status-0')).toHaveTextContent(
          'uploaded',
        );
      });
      expect(getSendButton()).not.toBeDisabled();
    });

    it('disables the send button while an upload is in flight', async () => {
      let resolveUpload: ((value: unknown) => void) | null = null;
      mockUploadWithProgress.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpload = resolve;
          }),
      );

      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-status-0')).toHaveTextContent(
          'uploading',
        );
      });
      expect(getSendButton()).toBeDisabled();

      resolveUpload?.({
        fileId: 'file-1',
        attachment: {
          id: 'att-1',
          storageProvider: 'GCS',
          objectKey: 'k',
          originalFileName: 'test.png',
          mimeType: 'image/png',
          sizeBytes: '1',
          sha256: 'abc',
          isImage: true,
          width: 10,
          height: 10,
          blurhash: null,
          hasPoster: false,
          durationMs: null,
        },
        cancel: vi.fn(),
      });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-status-0')).toHaveTextContent(
          'uploaded',
        );
      });
    });

    it('triggers file input on attach button click', () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(screen.getByTitle('Attach file'));
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  // ── GIF Picker ─────────────────────────────────────────────────────────

  describe('GIF picker', () => {
    it('opens on GIF button click', () => {
      renderComposer();
      fireEvent.click(screen.getByTitle('Send GIF'));
      expect(screen.getByTestId('gif-picker')).toBeInTheDocument();
    });

    it('closes on second GIF button click', () => {
      renderComposer();
      fireEvent.click(screen.getByTitle('Send GIF'));
      expect(screen.getByTestId('gif-picker')).toBeInTheDocument();

      fireEvent.click(screen.getByTitle('Send GIF'));
      expect(screen.queryByTestId('gif-picker')).not.toBeInTheDocument();
    });

    it('calls onSend with GIF URL when selected', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);
      renderComposer({ onSend });

      fireEvent.click(screen.getByTitle('Send GIF'));
      fireEvent.click(screen.getByTestId('gif-select'));

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('https://gif.test/1.gif');
      });
    });
  });

  // ── Emoji Picker ───────────────────────────────────────────────────────

  describe('emoji picker', () => {
    it('opens on emoji button click', () => {
      renderComposer();
      fireEvent.click(screen.getByTitle('Emoji picker'));
      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    });

    it('closes on second emoji button click', () => {
      renderComposer();
      fireEvent.click(screen.getByTitle('Emoji picker'));
      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();

      fireEvent.click(screen.getByTitle('Emoji picker'));
      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument();
    });

    it('stays open after selecting an emoji', () => {
      renderComposer();
      fireEvent.click(screen.getByTitle('Emoji picker'));
      fireEvent.click(screen.getByTestId('emoji-pick-smile'));
      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    });
  });

  // ── Disabled State ─────────────────────────────────────────────────────

  describe('disabled state', () => {
    it('disables send button when disabled', () => {
      renderComposer({ disabled: true });
      expect(getSendButton()).toBeDisabled();
    });

    it('disables attach button when disabled', () => {
      renderComposer({ disabled: true });
      expect(screen.getByTitle('Attach file')).toBeDisabled();
    });

    it('disables GIF button when disabled', () => {
      renderComposer({ disabled: true });
      expect(screen.getByTitle('Send GIF')).toBeDisabled();
    });

    it('disables emoji picker button when disabled', () => {
      renderComposer({ disabled: true });
      expect(screen.getByTitle('Emoji picker')).toBeDisabled();
    });
  });

  // ── isSending State ────────────────────────────────────────────────────

  describe('isSending state', () => {
    it('shows Sending... title on send button', () => {
      renderComposer({ isSending: true });
      expect(screen.getByTitle('Sending...')).toBeInTheDocument();
    });
  });

  // ── Formatting Toolbar ──────────────────────────────────────────────

  describe('formatting toolbar', () => {
    it('renders formatting toolbar with all buttons', () => {
      renderComposer();
      expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
      expect(screen.getByTitle('Bold (⌘B)')).toBeInTheDocument();
      expect(screen.getByTitle('Italic (⌘I)')).toBeInTheDocument();
      expect(screen.getByTitle('Underline (⌘U)')).toBeInTheDocument();
      expect(screen.getByTitle('Link (⌘K)')).toBeInTheDocument();
      expect(screen.getByTitle('Bullet list')).toBeInTheDocument();
    });

    it('disables toolbar buttons when disabled', () => {
      renderComposer({ disabled: true });
      expect(screen.getByTitle('Bold (⌘B)')).toBeDisabled();
      expect(screen.getByTitle('Italic (⌘I)')).toBeDisabled();
      expect(screen.getByTitle('Underline (⌘U)')).toBeDisabled();
      expect(screen.getByTitle('Link (⌘K)')).toBeDisabled();
      expect(screen.getByTitle('Bullet list')).toBeDisabled();
    });

    it('disables toolbar buttons when isSending', () => {
      renderComposer({ isSending: true });
      expect(screen.getByTitle('Bold (⌘B)')).toBeDisabled();
      expect(screen.getByTitle('Italic (⌘I)')).toBeDisabled();
    });

    it('buttons have aria-pressed attribute', () => {
      renderComposer();
      const boldBtn = screen.getByTitle('Bold (⌘B)');
      expect(boldBtn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ── Editor disabled state ───────────────────────────────────────────

  describe('editor disabled state', () => {
    it('sets editor contenteditable to false when disabled', () => {
      renderComposer({ disabled: true });
      const editor = getEditor();
      expect(editor).toHaveAttribute('contenteditable', 'false');
    });

    it('keeps editor editable when isSending so user can type next message', () => {
      renderComposer({ isSending: true });
      const editor = getEditor();
      expect(editor).toHaveAttribute('contenteditable', 'true');
    });

    it('sets editor contenteditable to true when enabled', () => {
      renderComposer();
      const editor = getEditor();
      expect(editor).toHaveAttribute('contenteditable', 'true');
    });
  });
});
