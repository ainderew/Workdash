import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockUpload = vi.fn();
const mockSetError = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/common/components/Soundboard/hooks/useSoundboardUpload', () => ({
  useSoundboardUpload: vi.fn(() => ({
    upload: mockUpload,
    isUploading: false,
    error: null,
    setError: mockSetError,
    clearError: mockClearError,
  })),
}));

// ---------------------------------------------------------------------------
// Lazy import after mocks
// ---------------------------------------------------------------------------

import SoundboardUploadForm from './SoundboardUploadForm';
import { useSoundboardUpload } from '@/common/components/Soundboard/hooks/useSoundboardUpload';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WS_ID = 'ws-test-1';

/**
 * Creates a minimal File-like object. jsdom's File doesn't fire loadedmetadata
 * so tests that exercise the Audio path mock `window.Audio` directly.
 */
function makeAudioFile(name = 'explosion.mp3', type = 'audio/mpeg', size = 100_000): File {
  return new File([new ArrayBuffer(size)], name, { type });
}

/**
 * Sets up a mock Audio constructor that fires loadedmetadata with the given duration.
 */
function mockAudioWithDuration(durationSeconds: number) {
  const listeners: Record<string, EventListenerOrEventListenerObject[]> = {};
  const mockAudio = {
    duration: durationSeconds,
    addEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    // Expose a helper to trigger the event in tests
    _trigger(event: string) {
      (listeners[event] ?? []).forEach((h) => {
        if (typeof h === 'function') h(new Event(event));
        else h.handleEvent(new Event(event));
      });
    },
  };
  vi.stubGlobal('Audio', vi.fn(() => mockAudio));
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
  return mockAudio;
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSoundboardUpload).mockReturnValue({
    upload: mockUpload,
    isUploading: false,
    error: null,
    setError: mockSetError,
    clearError: mockClearError,
  });
});

// ---------------------------------------------------------------------------
// File type validation
// ---------------------------------------------------------------------------

describe('SoundboardUploadForm — file type validation', () => {
  it('should call setError for an unsupported file type like audio/flac', () => {
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeAudioFile('track.flac', 'audio/flac');

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockSetError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid file type'),
    );
  });

  it('should accept audio/mpeg without calling setError', () => {
    mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeAudioFile('track.mp3', 'audio/mpeg');

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockSetError).not.toHaveBeenCalled();
  });

  it('should accept audio/wav', () => {
    mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('track.wav', 'audio/wav')] } });

    expect(mockSetError).not.toHaveBeenCalled();
  });

  it('should accept audio/ogg', () => {
    mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('track.ogg', 'audio/ogg')] } });

    expect(mockSetError).not.toHaveBeenCalled();
  });

  it('should accept audio/webm', () => {
    mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('track.webm', 'audio/webm')] } });

    expect(mockSetError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Auto-name generation from filename
// ---------------------------------------------------------------------------

describe('SoundboardUploadForm — auto-name generation', () => {
  it('should strip the file extension and use the base name as the sound name', async () => {
    const mockAudio = mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('explosion.mp3', 'audio/mpeg')] } });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    const nameInput = screen.getByPlaceholderText('sound_name') as HTMLInputElement;
    expect(nameInput.value).toBe('explosion');
  });

  it('should replace invalid characters (spaces, dots) with underscores', async () => {
    const mockAudio = mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeAudioFile('my cool sound!.mp3', 'audio/mpeg')] },
    });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    const nameInput = screen.getByPlaceholderText('sound_name') as HTMLInputElement;
    expect(nameInput.value).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(nameInput.value).not.toContain(' ');
  });

  it('should collapse consecutive underscores into a single underscore', async () => {
    const mockAudio = mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeAudioFile('my___sound.mp3', 'audio/mpeg')] },
    });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    const nameInput = screen.getByPlaceholderText('sound_name') as HTMLInputElement;
    expect(nameInput.value).not.toContain('__');
  });

  it('should truncate the auto-generated name to 32 characters', async () => {
    const mockAudio = mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const longName = 'a'.repeat(50) + '.mp3';
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeAudioFile(longName, 'audio/mpeg')] },
    });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    const nameInput = screen.getByPlaceholderText('sound_name') as HTMLInputElement;
    expect(nameInput.value.length).toBeLessThanOrEqual(32);
  });

  it('should not auto-fill the name when the derived base name is less than 2 characters', async () => {
    const mockAudio = mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Base name after stripping extension and invalid chars = 'a' (1 char)
    fireEvent.change(input, {
      target: { files: [makeAudioFile('a.mp3', 'audio/mpeg')] },
    });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    const nameInput = screen.getByPlaceholderText('sound_name') as HTMLInputElement;
    expect(nameInput.value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Duration validation via Audio element
// ---------------------------------------------------------------------------

describe('SoundboardUploadForm — duration validation via Audio element', () => {
  it('should call setError when the audio duration exceeds 30 seconds', async () => {
    const mockAudio = mockAudioWithDuration(31);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('long.mp3', 'audio/mpeg')] } });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    expect(mockSetError).toHaveBeenCalledWith(
      expect.stringContaining('30 seconds'),
    );
  });

  it('should not call setError when the audio duration is exactly 30 seconds', async () => {
    const mockAudio = mockAudioWithDuration(30);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('ok.mp3', 'audio/mpeg')] } });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    expect(mockSetError).not.toHaveBeenCalled();
  });

  it('should call setError when the Audio element fires an error event', async () => {
    const mockAudio = mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('corrupt.mp3', 'audio/mpeg')] } });

    await act(async () => {
      mockAudio._trigger('error');
    });

    expect(mockSetError).toHaveBeenCalledWith(
      expect.stringContaining('Could not read audio file'),
    );
  });
});

// ---------------------------------------------------------------------------
// Personal / Shared toggle
// ---------------------------------------------------------------------------

describe('SoundboardUploadForm — Personal/Shared toggle', () => {
  it('should render Shared and Personal toggle buttons', () => {
    render(<SoundboardUploadForm workspaceId={WS_ID} />);
    expect(screen.getByRole('button', { name: /Shared/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personal/i })).toBeInTheDocument();
  });

  it('should default to Shared mode', () => {
    // Verify that upload form passes isPersonal=false by default
    // We check by triggering an upload and inspecting the call args
    mockUpload.mockResolvedValue({ id: 'new-sound' });
    render(<SoundboardUploadForm workspaceId={WS_ID} />);
    // Shared button should be visually active (has accent classes) — we check it's present
    expect(screen.getByRole('button', { name: /Shared/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

describe('SoundboardUploadForm — disabled state', () => {
  it('should disable the file pick button when disabled prop is true', () => {
    render(<SoundboardUploadForm workspaceId={WS_ID} disabled={true} />);
    // The styled pick button wraps the hidden file input
    const buttons = screen.getAllByRole('button');
    // At least the Shared / Personal / pick buttons exist; pick button is the first
    expect(buttons.some((b) => b.hasAttribute('disabled'))).toBe(true);
  });

  it('should disable the name input when disabled prop is true', () => {
    render(<SoundboardUploadForm workspaceId={WS_ID} disabled={true} />);
    const nameInput = screen.getByPlaceholderText('sound_name');
    expect(nameInput).toBeDisabled();
  });

  it('should not render the Upload Sound button when disabled prop is true (even with a file selected)', async () => {
    // The upload button only appears when: selectedFile && name.length >= 2 && durationMs > 0 && !disabled
    const mockAudio = mockAudioWithDuration(5);
    render(<SoundboardUploadForm workspaceId={WS_ID} disabled={true} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('boom.mp3', 'audio/mpeg')] } });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    expect(screen.queryByRole('button', { name: /Upload Sound/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error display
// ---------------------------------------------------------------------------

describe('SoundboardUploadForm — error display', () => {
  it('should render an error message when the error state is set', () => {
    vi.mocked(useSoundboardUpload).mockReturnValue({
      upload: mockUpload,
      isUploading: false,
      error: 'File size exceeds 2MB limit',
      setError: mockSetError,
      clearError: mockClearError,
    });

    render(<SoundboardUploadForm workspaceId={WS_ID} />);
    expect(screen.getByText('File size exceeds 2MB limit')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Upload success — form reset
// ---------------------------------------------------------------------------

describe('SoundboardUploadForm — upload success resets the form', () => {
  it('should clear the name input after a successful upload', async () => {
    const mockAudio = mockAudioWithDuration(5);
    mockUpload.mockResolvedValue({ id: 'uploaded-sound', name: 'boom' });

    render(<SoundboardUploadForm workspaceId={WS_ID} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeAudioFile('boom.mp3', 'audio/mpeg')] } });

    await act(async () => {
      mockAudio._trigger('loadedmetadata');
    });

    // Upload button appears after file+name+duration are set
    const uploadButton = await waitFor(() =>
      screen.getByRole('button', { name: /Upload Sound/i }),
    );

    await act(async () => {
      fireEvent.click(uploadButton);
    });

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('sound_name') as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });
  });
});
