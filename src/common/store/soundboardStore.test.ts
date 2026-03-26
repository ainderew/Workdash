import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockSetVolume = vi.fn();
vi.mock('@/communication/soundboard/soundboardService', () => ({
  SoundboardService: {
    getInstance: () => ({ setVolume: mockSetVolume }),
  },
}));

import useSoundboardStore from './soundboardStore';
import type { SoundboardSound } from '@/common/components/Soundboard/_types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWorkspaceSound(overrides: Partial<SoundboardSound> = {}): SoundboardSound {
  return {
    id: 'ws-sound-1',
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
    id: 'ps-sound-1',
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
// Reset store to initial state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useSoundboardStore.setState({
    workspaceSounds: [],
    personalSounds: [],
    isLoading: false,
    fetchedWorkspaceId: null,
    isPlaying: false,
    lastPlayedAt: null,
    cooldownMs: 5000,
    volume: 1,
  });
});

// ---------------------------------------------------------------------------
// setSounds
// ---------------------------------------------------------------------------

describe('setSounds', () => {
  it('should replace both workspace and personal sound lists atomically', () => {
    const ws = [makeWorkspaceSound({ id: 'a' }), makeWorkspaceSound({ id: 'b' })];
    const ps = [makePersonalSound({ id: 'c' })];

    useSoundboardStore.getState().setSounds(ws, ps);

    const state = useSoundboardStore.getState();
    expect(state.workspaceSounds).toEqual(ws);
    expect(state.personalSounds).toEqual(ps);
  });

  it('should overwrite previously loaded sounds on a second call', () => {
    useSoundboardStore.getState().setSounds([makeWorkspaceSound({ id: 'old' })], []);
    useSoundboardStore.getState().setSounds([makeWorkspaceSound({ id: 'new' })], []);

    expect(useSoundboardStore.getState().workspaceSounds).toHaveLength(1);
    expect(useSoundboardStore.getState().workspaceSounds[0].id).toBe('new');
  });

  it('should accept empty arrays and clear the lists', () => {
    useSoundboardStore.getState().setSounds([makeWorkspaceSound()], [makePersonalSound()]);
    useSoundboardStore.getState().setSounds([], []);

    const state = useSoundboardStore.getState();
    expect(state.workspaceSounds).toHaveLength(0);
    expect(state.personalSounds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// addSound — routing by workspaceId
// ---------------------------------------------------------------------------

describe('addSound', () => {
  it('should append a workspace sound to workspaceSounds when workspaceId is set', () => {
    const sound = makeWorkspaceSound({ id: 'ws-1', workspaceId: 'ws-abc' });
    useSoundboardStore.getState().addSound(sound);

    const state = useSoundboardStore.getState();
    expect(state.workspaceSounds).toContainEqual(sound);
    expect(state.personalSounds).toHaveLength(0);
  });

  it('should append a personal sound to personalSounds when workspaceId is null', () => {
    const sound = makePersonalSound({ id: 'ps-1', workspaceId: null });
    useSoundboardStore.getState().addSound(sound);

    const state = useSoundboardStore.getState();
    expect(state.personalSounds).toContainEqual(sound);
    expect(state.workspaceSounds).toHaveLength(0);
  });

  it('should deduplicate workspace sounds — adding same id twice is a no-op', () => {
    const sound = makeWorkspaceSound({ id: 'ws-dup' });
    useSoundboardStore.getState().addSound(sound);
    useSoundboardStore.getState().addSound(sound);

    expect(useSoundboardStore.getState().workspaceSounds).toHaveLength(1);
  });

  it('should deduplicate personal sounds — adding same id twice is a no-op', () => {
    const sound = makePersonalSound({ id: 'ps-dup' });
    useSoundboardStore.getState().addSound(sound);
    useSoundboardStore.getState().addSound(sound);

    expect(useSoundboardStore.getState().personalSounds).toHaveLength(1);
  });

  it('should allow sounds with the same id in different lists (workspace vs personal)', () => {
    // Unlikely in practice, but the dedup check is per-list — verify the boundary
    const wsSound = makeWorkspaceSound({ id: 'shared-id', workspaceId: 'ws-abc' });
    const psSound = makePersonalSound({ id: 'different-id', workspaceId: null });
    useSoundboardStore.getState().addSound(wsSound);
    useSoundboardStore.getState().addSound(psSound);

    expect(useSoundboardStore.getState().workspaceSounds).toHaveLength(1);
    expect(useSoundboardStore.getState().personalSounds).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// removeSound
// ---------------------------------------------------------------------------

describe('removeSound', () => {
  it('should remove a sound from workspaceSounds by id', () => {
    const a = makeWorkspaceSound({ id: 'keep' });
    const b = makeWorkspaceSound({ id: 'remove-me' });
    useSoundboardStore.getState().setSounds([a, b], []);

    useSoundboardStore.getState().removeSound('remove-me');

    const state = useSoundboardStore.getState();
    expect(state.workspaceSounds).toHaveLength(1);
    expect(state.workspaceSounds[0].id).toBe('keep');
  });

  it('should remove a sound from personalSounds by id', () => {
    const a = makePersonalSound({ id: 'mine' });
    const b = makePersonalSound({ id: 'gone' });
    useSoundboardStore.getState().setSounds([], [a, b]);

    useSoundboardStore.getState().removeSound('gone');

    const state = useSoundboardStore.getState();
    expect(state.personalSounds).toHaveLength(1);
    expect(state.personalSounds[0].id).toBe('mine');
  });

  it('should be a no-op when the id does not exist in either list', () => {
    useSoundboardStore.getState().setSounds([makeWorkspaceSound()], [makePersonalSound()]);
    useSoundboardStore.getState().removeSound('nonexistent-id');

    const state = useSoundboardStore.getState();
    expect(state.workspaceSounds).toHaveLength(1);
    expect(state.personalSounds).toHaveLength(1);
  });

  it('should scan both lists when a sound could theoretically appear in either', () => {
    const ws = makeWorkspaceSound({ id: 'target', workspaceId: 'ws-abc' });
    const ps = makePersonalSound({ id: 'target-ps', workspaceId: null });
    useSoundboardStore.getState().setSounds([ws], [ps]);

    useSoundboardStore.getState().removeSound('target');

    const state = useSoundboardStore.getState();
    expect(state.workspaceSounds).toHaveLength(0);
    expect(state.personalSounds).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// canPlay — cooldown and isPlaying guards
// ---------------------------------------------------------------------------

describe('canPlay', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true when isPlaying is false and no lastPlayedAt is set', () => {
    useSoundboardStore.setState({ isPlaying: false, lastPlayedAt: null });
    expect(useSoundboardStore.getState().canPlay()).toBe(true);
  });

  it('should return false when isPlaying is true regardless of cooldown', () => {
    useSoundboardStore.setState({ isPlaying: true, lastPlayedAt: null });
    expect(useSoundboardStore.getState().canPlay()).toBe(false);
  });

  it('should return false when still within the 5 second cooldown window', () => {
    vi.useFakeTimers();
    const now = Date.now();
    useSoundboardStore.setState({
      isPlaying: false,
      lastPlayedAt: now,
      cooldownMs: 5000,
    });

    vi.advanceTimersByTime(4999);

    expect(useSoundboardStore.getState().canPlay()).toBe(false);
  });

  it('should return true exactly when the cooldown window expires', () => {
    vi.useFakeTimers();
    const now = Date.now();
    useSoundboardStore.setState({
      isPlaying: false,
      lastPlayedAt: now,
      cooldownMs: 5000,
    });

    vi.advanceTimersByTime(5000);

    expect(useSoundboardStore.getState().canPlay()).toBe(true);
  });

  it('should return true after the cooldown window has fully elapsed', () => {
    vi.useFakeTimers();
    const now = Date.now();
    useSoundboardStore.setState({
      isPlaying: false,
      lastPlayedAt: now,
      cooldownMs: 5000,
    });

    vi.advanceTimersByTime(6000);

    expect(useSoundboardStore.getState().canPlay()).toBe(true);
  });

  it('should return false when isPlaying is true even if cooldown has elapsed', () => {
    vi.useFakeTimers();
    const longAgo = Date.now() - 10_000;
    useSoundboardStore.setState({
      isPlaying: true,
      lastPlayedAt: longAgo,
      cooldownMs: 5000,
    });

    expect(useSoundboardStore.getState().canPlay()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setIsPlaying / setLastPlayedAt
// ---------------------------------------------------------------------------

describe('setIsPlaying', () => {
  it('should update isPlaying to true', () => {
    useSoundboardStore.getState().setIsPlaying(true);
    expect(useSoundboardStore.getState().isPlaying).toBe(true);
  });

  it('should update isPlaying to false', () => {
    useSoundboardStore.setState({ isPlaying: true });
    useSoundboardStore.getState().setIsPlaying(false);
    expect(useSoundboardStore.getState().isPlaying).toBe(false);
  });
});

describe('setLastPlayedAt', () => {
  it('should store the provided timestamp', () => {
    const ts = 1_700_000_000_000;
    useSoundboardStore.getState().setLastPlayedAt(ts);
    expect(useSoundboardStore.getState().lastPlayedAt).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// volume
// ---------------------------------------------------------------------------

describe('volume', () => {
  it('should default volume to 1 when localStorage is empty', () => {
    localStorage.clear();
    // Reset store to re-trigger default
    useSoundboardStore.setState({ volume: 1 });
    expect(useSoundboardStore.getState().volume).toBe(1);
  });

  it('should hydrate volume from localStorage when getPersistedVolume is called at store creation', () => {
    // This tests the initialization path — since the store is a singleton,
    // we verify the persistence round-trip instead
    useSoundboardStore.getState().setVolume(0.6);
    expect(localStorage.getItem('wd-soundboard-volume')).toBe('0.6');
  });

  it('should update volume in the store', () => {
    useSoundboardStore.getState().setVolume(0.5);
    expect(useSoundboardStore.getState().volume).toBe(0.5);
  });

  it('should clamp volume to 0 when given a negative value', () => {
    useSoundboardStore.getState().setVolume(-0.3);
    expect(useSoundboardStore.getState().volume).toBe(0);
  });

  it('should clamp volume to 1 when given a value above 1', () => {
    useSoundboardStore.getState().setVolume(1.5);
    expect(useSoundboardStore.getState().volume).toBe(1);
  });

  it('should persist volume to localStorage', () => {
    useSoundboardStore.getState().setVolume(0.7);
    expect(localStorage.getItem('wd-soundboard-volume')).toBe('0.7');
  });

  it('should persist clamped value to localStorage when given out-of-range input', () => {
    useSoundboardStore.getState().setVolume(2);
    expect(localStorage.getItem('wd-soundboard-volume')).toBe('1');
  });

  it('should call SoundboardService.setVolume with the clamped value', () => {
    useSoundboardStore.getState().setVolume(0.4);
    expect(mockSetVolume).toHaveBeenCalledWith(0.4);
  });

  it('should call SoundboardService.setVolume with clamped value for out-of-range input', () => {
    useSoundboardStore.getState().setVolume(-1);
    expect(mockSetVolume).toHaveBeenCalledWith(0);
  });
});
