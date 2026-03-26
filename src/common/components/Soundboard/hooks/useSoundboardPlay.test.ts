import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSoundboardStore from '@/common/store/soundboardStore';
import type { SoundboardSound } from '../_types';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('@/communication/soundboard/soundboardService', () => ({
  SoundboardService: {
    getInstance: vi.fn(() => ({
      playSound: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

// sonner toast — silence error toasts in test output
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Lazy import after mocks
// ---------------------------------------------------------------------------

import { useSoundboardPlay } from './useSoundboardPlay';
import { SoundboardService } from '@/communication/soundboard/soundboardService';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSound(overrides: Partial<SoundboardSound> = {}): SoundboardSound {
  return {
    id: 'sound-1',
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

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  useSoundboardStore.setState({
    workspaceSounds: [],
    personalSounds: [],
    isLoading: false,
    fetchedWorkspaceId: null,
    isPlaying: false,
    lastPlayedAt: null,
    cooldownMs: 5000,
  });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// canPlay derivation
// ---------------------------------------------------------------------------

describe('useSoundboardPlay — canPlay', () => {
  it('should expose canPlay=true when the store allows playing', () => {
    const { result } = renderHook(() => useSoundboardPlay());
    expect(result.current.canPlay).toBe(true);
  });

  it('should expose canPlay=false while a sound is playing', () => {
    useSoundboardStore.setState({ isPlaying: true });
    const { result } = renderHook(() => useSoundboardPlay());
    expect(result.current.canPlay).toBe(false);
  });

  it('should expose canPlay=false when cooldownRemaining > 0', () => {
    const now = Date.now();
    useSoundboardStore.setState({ isPlaying: false, lastPlayedAt: now, cooldownMs: 5000 });

    const { result } = renderHook(() => useSoundboardPlay());

    // No time elapsed — cooldown is fresh
    expect(result.current.canPlay).toBe(false);
  });

  it('should transition canPlay to true after the cooldown elapses', () => {
    const now = Date.now();
    useSoundboardStore.setState({ isPlaying: false, lastPlayedAt: now, cooldownMs: 5000 });

    const { result } = renderHook(() => useSoundboardPlay());
    expect(result.current.canPlay).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5100);
    });

    expect(result.current.canPlay).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cooldownRemaining updates
// ---------------------------------------------------------------------------

describe('useSoundboardPlay — cooldownRemaining', () => {
  it('should start at 0 when no sound has been played', () => {
    const { result } = renderHook(() => useSoundboardPlay());
    expect(result.current.cooldownRemaining).toBe(0);
  });

  it('should start near cooldownMs immediately after a sound plays', () => {
    const now = Date.now();
    useSoundboardStore.setState({ lastPlayedAt: now, cooldownMs: 5000 });

    const { result } = renderHook(() => useSoundboardPlay());

    // At t=0 remaining ≈ 5000ms (within one tick)
    expect(result.current.cooldownRemaining).toBeGreaterThan(4900);
    expect(result.current.cooldownRemaining).toBeLessThanOrEqual(5000);
  });

  it('should decrement cooldownRemaining every 100ms tick', () => {
    const now = Date.now();
    useSoundboardStore.setState({ lastPlayedAt: now, cooldownMs: 5000 });

    const { result } = renderHook(() => useSoundboardPlay());

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.cooldownRemaining).toBeLessThanOrEqual(4100);
    expect(result.current.cooldownRemaining).toBeGreaterThanOrEqual(3900);
  });

  it('should clamp cooldownRemaining to 0 and stop the interval when done', () => {
    const now = Date.now();
    useSoundboardStore.setState({ lastPlayedAt: now, cooldownMs: 5000 });

    const { result } = renderHook(() => useSoundboardPlay());

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.cooldownRemaining).toBe(0);
  });

  it('should reset cooldownRemaining to 0 when lastPlayedAt becomes null', () => {
    const now = Date.now();
    useSoundboardStore.setState({ lastPlayedAt: now, cooldownMs: 5000 });

    const { result } = renderHook(() => useSoundboardPlay());
    expect(result.current.cooldownRemaining).toBeGreaterThan(0);

    act(() => {
      useSoundboardStore.setState({ lastPlayedAt: null });
    });

    expect(result.current.cooldownRemaining).toBe(0);
  });

  it('should clear the interval on unmount to prevent state updates after unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const now = Date.now();
    useSoundboardStore.setState({ lastPlayedAt: now, cooldownMs: 5000 });

    const { unmount } = renderHook(() => useSoundboardPlay());
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// playSound — happy path
// ---------------------------------------------------------------------------

describe('useSoundboardPlay — playSound', () => {
  it('should call SoundboardService.getInstance().playSound with the correct sound', async () => {
    const mockPlaySound = vi.fn().mockResolvedValue(undefined);
    vi.mocked(SoundboardService.getInstance).mockReturnValue({ playSound: mockPlaySound } as never);

    const sound = makeSound();
    const { result } = renderHook(() => useSoundboardPlay());

    await act(async () => {
      await result.current.playSound(sound);
    });

    expect(mockPlaySound).toHaveBeenCalledWith(sound);
  });

  it('should still delegate to service when isPlaying is true (service handles guard)', async () => {
    useSoundboardStore.setState({ isPlaying: true });

    const mockPlaySound = vi.fn();
    vi.mocked(SoundboardService.getInstance).mockReturnValue({ playSound: mockPlaySound } as never);

    const { result } = renderHook(() => useSoundboardPlay());

    await act(async () => {
      await result.current.playSound(makeSound());
    });

    expect(mockPlaySound).toHaveBeenCalled();
  });

  it('should still delegate to service during cooldown (service handles guard)', async () => {
    const now = Date.now();
    useSoundboardStore.setState({ isPlaying: false, lastPlayedAt: now, cooldownMs: 5000 });

    const mockPlaySound = vi.fn();
    vi.mocked(SoundboardService.getInstance).mockReturnValue({ playSound: mockPlaySound } as never);

    const { result } = renderHook(() => useSoundboardPlay());

    await act(async () => {
      await result.current.playSound(makeSound());
    });

    expect(mockPlaySound).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// playSound — error handling
// ---------------------------------------------------------------------------

describe('useSoundboardPlay — error handling', () => {
  it('should show a toast error when SoundboardService.playSound throws', async () => {
    vi.mocked(SoundboardService.getInstance).mockReturnValue({
      playSound: vi.fn().mockRejectedValue(new Error('No send transport available')),
    } as never);

    const { result } = renderHook(() => useSoundboardPlay());

    await act(async () => {
      await result.current.playSound(makeSound());
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to play sound',
      expect.objectContaining({ description: 'No send transport available' }),
    );
  });

  it('should use a generic fallback description for non-Error throws', async () => {
    vi.mocked(SoundboardService.getInstance).mockReturnValue({
      playSound: vi.fn().mockRejectedValue('string-error'),
    } as never);

    const { result } = renderHook(() => useSoundboardPlay());

    await act(async () => {
      await result.current.playSound(makeSound());
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to play sound',
      expect.objectContaining({ description: 'Please try again' }),
    );
  });
});
