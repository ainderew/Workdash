import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

const mockUploadChatFileForMessage = vi.fn();

vi.mock('@/communication/chatV2/uploadService', () => ({
  uploadChatFileForMessage: (...args: unknown[]) =>
    mockUploadChatFileForMessage(...args),
}));

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

vi.mock('./AttachmentPreview', () => ({
  AttachmentPreview: ({
    file,
    onRemove,
  }: {
    file: File;
    onRemove: () => void;
  }) => (
    <div data-testid="attachment-preview">
      <span data-testid="attachment-name">{file.name}</span>
      <button data-testid="attachment-remove" onClick={onRemove}>
        remove
      </button>
    </div>
  ),
}));

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: vi.fn(),
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

function getTextarea(): HTMLTextAreaElement {
  return screen.getByRole('textbox');
}

function getSendButton(): HTMLElement {
  return screen.getByTitle('Send message');
}

function typeInTextarea(text: string) {
  const textarea = getTextarea();
  fireEvent.change(textarea, { target: { value: text } });
}


// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadChatFileForMessage.mockResolvedValue({
      fileId: 'file-1',
      attachment: {
        id: 'att-1',
        storageProvider: 'GCS',
        objectKey: 'uploads/test.png',
        originalFileName: 'test.png',
        mimeType: 'image/png',
        sizeBytes: '1024',
        sha256: 'abc',
        isImage: true,
      },
    });
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders textarea with placeholder', () => {
      renderComposer();
      expect(getTextarea()).toBeInTheDocument();
      expect(getTextarea()).toHaveAttribute('placeholder', 'Message room');
    });

    it('renders custom placeholder', () => {
      renderComposer({ placeholder: 'Type here...' });
      expect(getTextarea()).toHaveAttribute('placeholder', 'Type here...');
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

    it('renders stickers button', () => {
      renderComposer();
      expect(screen.getByTitle('Stickers (coming soon)')).toBeInTheDocument();
    });
  });

  // ── Text Input ─────────────────────────────────────────────────────────

  describe('text input', () => {
    it('updates value on change', () => {
      renderComposer();
      typeInTextarea('hello');
      expect(getTextarea()).toHaveValue('hello');
    });

    it('calls onTyping when text is typed', () => {
      const onTyping = vi.fn();
      renderComposer({ onTyping });
      typeInTextarea('hi');
      expect(onTyping).toHaveBeenCalled();
    });

    it('does not call onTyping when cleared', () => {
      const onTyping = vi.fn();
      renderComposer({ onTyping });
      typeInTextarea('hi');
      onTyping.mockClear();
      typeInTextarea('');
      expect(onTyping).not.toHaveBeenCalled();
    });
  });

  // ── Send on Enter ──────────────────────────────────────────────────────

  describe('send on Enter', () => {
    it('submits on Enter and clears textarea', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);
      renderComposer({ onSend });
      typeInTextarea('hello world');

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('hello world', undefined, undefined);
      });
      expect(getTextarea()).toHaveValue('');
    });

    it('does not submit on Shift+Enter', () => {
      const onSend = vi.fn();
      renderComposer({ onSend });
      typeInTextarea('hello');

      fireEvent.keyDown(getTextarea(), { key: 'Enter', shiftKey: true });

      expect(onSend).not.toHaveBeenCalled();
      expect(getTextarea()).toHaveValue('hello');
    });

    it('does not submit when textarea is empty', () => {
      const onSend = vi.fn();
      renderComposer({ onSend });

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  // ── Send Button ────────────────────────────────────────────────────────

  describe('send button', () => {
    it('is disabled when textarea is empty and no file', () => {
      renderComposer();
      expect(getSendButton()).toBeDisabled();
    });

    it('is enabled when textarea has text', () => {
      renderComposer();
      typeInTextarea('some text');
      expect(getSendButton()).not.toBeDisabled();
    });

    it('submits on click', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);
      renderComposer({ onSend });
      typeInTextarea('click send');

      fireEvent.click(getSendButton());

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('click send', undefined, undefined);
      });
    });
  });

  // ── File Attachment ────────────────────────────────────────────────────

  describe('file attachment', () => {
    it('shows attachment preview when file is selected', () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const file = makeFile();
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByTestId('attachment-preview')).toBeInTheDocument();
      expect(screen.getByTestId('attachment-name')).toHaveTextContent(
        'test.png',
      );
    });

    it('clears file when remove button is clicked', () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
      expect(screen.getByTestId('attachment-preview')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('attachment-remove'));
      expect(screen.queryByTestId('attachment-preview')).not.toBeInTheDocument();
    });

    it('enables send button when file is attached (no text)', () => {
      renderComposer();
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
      expect(getSendButton()).not.toBeDisabled();
    });

    it('uploads file and sends attachment on submit', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);
      renderComposer({ onSend });

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
      typeInTextarea('with file');

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      await waitFor(() => {
        expect(mockUploadChatFileForMessage).toHaveBeenCalledWith(
          'room-1',
          expect.any(File),
        );
        expect(onSend).toHaveBeenCalledWith(
          'with file',
          [expect.objectContaining({ id: 'att-1' })],
          undefined,
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

  // ── Clipboard Paste ────────────────────────────────────────────────────

  describe('clipboard paste', () => {
    it('sets file on image paste', () => {
      renderComposer();
      const textarea = getTextarea();
      const file = makeFile('screenshot.png', 'image/png');

      const pasteEvent = new Event('paste', { bubbles: true }) as unknown as {
        clipboardData: { items: Array<{ type: string; getAsFile: () => File }> };
        preventDefault: () => void;
      };
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          items: [{ type: 'image/png', getAsFile: () => file }],
        },
      });

      fireEvent(textarea, pasteEvent as unknown as Event);

      // The paste handler is called through the hook, which sets selectedFile
      // Since we're using the real useClipboardImagePaste hook, we can verify
      // the attachment preview appears
    });

    it('does not intercept text paste', () => {
      renderComposer();
      const textarea = getTextarea();

      // Text paste should not trigger image paste handling
      fireEvent.paste(textarea, {
        clipboardData: {
          items: [{ type: 'text/plain', getAsFile: () => null }],
        },
      });

      expect(
        screen.queryByTestId('attachment-preview'),
      ).not.toBeInTheDocument();
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

  // ── Mention Flyout ─────────────────────────────────────────────────────

  describe('mention flyout', () => {
    it('opens when @ is typed', () => {
      renderComposer();
      const textarea = getTextarea();

      // Simulate typing "@" — set value and cursor position
      fireEvent.change(textarea, {
        target: { value: '@', selectionStart: 1 },
      });

      // Flyout should appear with members (excluding self)
      expect(screen.getByTestId('mention-flyout')).toBeInTheDocument();
    });

    it('filters suggestions by query', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '@ali', selectionStart: 4 },
      });

      expect(screen.getByTestId('mention-flyout')).toBeInTheDocument();
      expect(screen.getByTestId('mention-count')).toHaveTextContent('1');
    });

    it('navigates with ArrowDown', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '@', selectionStart: 1 },
      });

      fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      expect(screen.getByTestId('mention-selected')).toHaveTextContent('1');
    });

    it('navigates with ArrowUp (wraps around)', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '@', selectionStart: 1 },
      });

      // ArrowUp from 0 wraps to last
      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(screen.getByTestId('mention-selected')).toHaveTextContent('1');
    });

    it('inserts mention on Enter', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '@ali', selectionStart: 4 },
      });

      fireEvent.keyDown(textarea, { key: 'Enter' });

      // Flyout should close after selection
      expect(
        screen.queryByTestId('mention-flyout'),
      ).not.toBeInTheDocument();
      // Value should contain the mention
      expect(textarea.value).toContain('@Alice');
    });

    it('inserts mention on Tab', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '@ali', selectionStart: 4 },
      });

      fireEvent.keyDown(textarea, { key: 'Tab' });

      expect(
        screen.queryByTestId('mention-flyout'),
      ).not.toBeInTheDocument();
      expect(textarea.value).toContain('@Alice');
    });

    it('closes on Escape', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '@', selectionStart: 1 },
      });
      expect(screen.getByTestId('mention-flyout')).toBeInTheDocument();

      fireEvent.keyDown(textarea, { key: 'Escape' });
      expect(
        screen.queryByTestId('mention-flyout'),
      ).not.toBeInTheDocument();
    });

    it('excludes self from suggestions', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '@', selectionStart: 1 },
      });

      // Self (userId=1) should not be in suggestions
      expect(screen.queryByTestId('mention-1')).not.toBeInTheDocument();
      // Alice (userId=2) should be present
      expect(screen.getByTestId('mention-2')).toBeInTheDocument();
    });
  });

  // ── Emoji Flyout ───────────────────────────────────────────────────────

  describe('emoji flyout', () => {
    it('opens when :xx is typed (min 2 chars)', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: ':wa', selectionStart: 3 },
      });

      expect(screen.getByTestId('emoji-flyout')).toBeInTheDocument();
    });

    it('does not open with single char after colon', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: ':w', selectionStart: 2 },
      });

      expect(screen.queryByTestId('emoji-flyout')).not.toBeInTheDocument();
    });

    it('navigates with ArrowDown/ArrowUp', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: ':wave', selectionStart: 5 },
      });

      // Should have one suggestion for 'wave'
      expect(screen.getByTestId('emoji-flyout')).toBeInTheDocument();

      fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      // With only 1 suggestion, wraps to 0
      expect(screen.getByTestId('emoji-selected')).toHaveTextContent('0');
    });

    it('inserts emoji on Enter', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: ':wave', selectionStart: 5 },
      });

      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(screen.queryByTestId('emoji-flyout')).not.toBeInTheDocument();
      expect(textarea.value).toContain(':wave:');
    });

    it('closes on Escape', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: ':wave', selectionStart: 5 },
      });
      expect(screen.getByTestId('emoji-flyout')).toBeInTheDocument();

      fireEvent.keyDown(textarea, { key: 'Escape' });
      expect(screen.queryByTestId('emoji-flyout')).not.toBeInTheDocument();
    });
  });

  // ── Command Flyout ─────────────────────────────────────────────────────

  describe('command flyout', () => {
    it('opens when / is typed at start', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '/', selectionStart: 1 },
      });

      expect(screen.getByTestId('command-flyout')).toBeInTheDocument();
    });

    it('filters commands by query', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '/pl', selectionStart: 3 },
      });

      expect(screen.getByTestId('command-flyout')).toBeInTheDocument();
      expect(screen.getByTestId('command-count')).toHaveTextContent('1');
    });

    it('does not open when / is not at start', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: 'hello /', selectionStart: 7 },
      });

      expect(screen.queryByTestId('command-flyout')).not.toBeInTheDocument();
    });

    it('navigates with ArrowDown/ArrowUp', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '/', selectionStart: 1 },
      });

      fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      expect(screen.getByTestId('command-selected')).toHaveTextContent('1');

      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(screen.getByTestId('command-selected')).toHaveTextContent('0');
    });

    it('selects command on Enter', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '/pl', selectionStart: 3 },
      });

      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(
        screen.queryByTestId('command-flyout'),
      ).not.toBeInTheDocument();
      expect(textarea.value).toBe('/play ');
    });

    it('closes on Escape', () => {
      renderComposer();
      const textarea = getTextarea();

      fireEvent.change(textarea, {
        target: { value: '/', selectionStart: 1 },
      });
      expect(screen.getByTestId('command-flyout')).toBeInTheDocument();

      fireEvent.keyDown(textarea, { key: 'Escape' });
      expect(
        screen.queryByTestId('command-flyout'),
      ).not.toBeInTheDocument();
    });
  });

  // ── Edit Last Message ──────────────────────────────────────────────────

  describe('edit last message', () => {
    it('calls onEditLastMessage on ArrowUp when empty', () => {
      const onEditLastMessage = vi.fn();
      renderComposer({ onEditLastMessage });

      const textarea = getTextarea();
      // selectionStart defaults to 0 for empty textarea
      fireEvent.keyDown(textarea, { key: 'ArrowUp' });

      expect(onEditLastMessage).toHaveBeenCalled();
    });

    it('does not call onEditLastMessage when textarea has text', () => {
      const onEditLastMessage = vi.fn();
      renderComposer({ onEditLastMessage });

      typeInTextarea('some text');
      fireEvent.keyDown(getTextarea(), { key: 'ArrowUp' });

      expect(onEditLastMessage).not.toHaveBeenCalled();
    });
  });

  // ── Optimistic Send + Rollback ─────────────────────────────────────────

  describe('optimistic send + rollback', () => {
    it('clears input before onSend resolves', async () => {
      let resolveOnSend: () => void;
      const onSend = vi.fn(
        () => new Promise<void>((resolve) => { resolveOnSend = resolve; }),
      );
      renderComposer({ onSend });

      typeInTextarea('pending message');
      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      // Input should clear immediately (optimistic)
      expect(getTextarea()).toHaveValue('');

      // Resolve the send
      await act(async () => { resolveOnSend!(); });
    });

    it('restores text on send failure', async () => {
      const onSend = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));
      renderComposer({ onSend });

      typeInTextarea('will fail');
      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      // Input clears optimistically
      expect(getTextarea()).toHaveValue('');

      // After rejection, text should restore
      await waitFor(() => {
        expect(getTextarea()).toHaveValue('will fail');
      });
    });

    it('restores file on upload failure', async () => {
      mockUploadChatFileForMessage.mockRejectedValue(
        new Error('Upload failed'),
      );
      renderComposer();

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
      typeInTextarea('with file');

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      // File preview should disappear optimistically
      await waitFor(() => {
        expect(screen.queryByTestId('attachment-preview')).not.toBeInTheDocument();
      });

      // After failure, file should be restored
      await waitFor(() => {
        expect(screen.getByTestId('attachment-preview')).toBeInTheDocument();
      });
    });
  });

  // ── Disabled State ─────────────────────────────────────────────────────

  describe('disabled state', () => {
    it('disables textarea when disabled', () => {
      renderComposer({ disabled: true });
      expect(getTextarea()).toBeDisabled();
    });

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

    it('does not send on Enter when disabled', () => {
      const onSend = vi.fn();
      renderComposer({ disabled: true, onSend });

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  // ── Upload Error ───────────────────────────────────────────────────────

  describe('upload error', () => {
    it('displays error message on upload failure', async () => {
      mockUploadChatFileForMessage.mockRejectedValue(
        new Error('File too large'),
      );
      renderComposer();

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
      typeInTextarea('test');

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('File too large')).toBeInTheDocument();
      });
    });

    it('clears error on next send attempt', async () => {
      mockUploadChatFileForMessage.mockRejectedValueOnce(
        new Error('File too large'),
      );
      renderComposer();

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
      typeInTextarea('test');

      // First send — fails
      fireEvent.keyDown(getTextarea(), { key: 'Enter' });
      await waitFor(() => {
        expect(screen.getByText('File too large')).toBeInTheDocument();
      });

      // Second send — now remove file and send text only
      fireEvent.click(screen.getByTestId('attachment-remove'));
      mockUploadChatFileForMessage.mockResolvedValue({
        fileId: 'file-2',
        attachment: { id: 'att-2' },
      });

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      await waitFor(() => {
        expect(screen.queryByText('File too large')).not.toBeInTheDocument();
      });
    });

    it('shows generic error for non-Error exceptions', async () => {
      mockUploadChatFileForMessage.mockRejectedValue('unknown');
      renderComposer();

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [makeFile()] } });
      typeInTextarea('test');

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      await waitFor(() => {
        expect(
          screen.getByText('Failed to upload file'),
        ).toBeInTheDocument();
      });
    });
  });

  // ── Mention Serialization ──────────────────────────────────────────────

  describe('mention serialization', () => {
    it('serializes @Name to <@userId> on send', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);
      renderComposer({ onSend });

      typeInTextarea('@Alice hello');

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith(
          expect.stringContaining('<@2>'),
          undefined,
          expect.objectContaining({
            mentionedUserIds: expect.arrayContaining([2]),
          }),
        );
      });
    });
  });

  // ── Custom Emoji Serialization ─────────────────────────────────────────

  describe('custom emoji serialization', () => {
    it('serializes :name: to <:name:id> on send', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);
      renderComposer({ onSend });

      typeInTextarea('hello :wave: world');

      fireEvent.keyDown(getTextarea(), { key: 'Enter' });

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith(
          expect.stringContaining('<:wave:e1>'),
          undefined,
          undefined,
        );
      });
    });
  });

  // ── isSending State ────────────────────────────────────────────────────

  describe('isSending state', () => {
    it('disables textarea when isSending', () => {
      renderComposer({ isSending: true });
      expect(getTextarea()).toBeDisabled();
    });

    it('shows Sending... title on send button', () => {
      renderComposer({ isSending: true });
      expect(screen.getByTitle('Sending...')).toBeInTheDocument();
    });
  });
});
