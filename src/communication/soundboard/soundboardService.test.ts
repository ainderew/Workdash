import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Web Audio API
// ---------------------------------------------------------------------------

function createMockGainNode() {
  return {
    gain: { value: 1 },
    connect: vi.fn(),
  };
}

function createMockBufferSource() {
  return {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    start: vi.fn(),
    onended: null as (() => void) | null,
  };
}

function createMockMediaStreamDestination() {
  return {
    stream: {
      getAudioTracks: () => [{ stop: vi.fn() }],
    },
  };
}

const mockGainNode = createMockGainNode();
const mockSource = createMockBufferSource();
const mockDestination = createMockMediaStreamDestination();

const mockAudioContext = {
  createGain: vi.fn(() => mockGainNode),
  createBufferSource: vi.fn(() => mockSource),
  createMediaStreamDestination: vi.fn(() => mockDestination),
  decodeAudioData: vi.fn(() => Promise.resolve({} as AudioBuffer)),
  destination: {} as AudioDestinationNode,
  state: 'running' as AudioContextState,
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
};

vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext));

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockProduce = vi.fn(() =>
  Promise.resolve({ close: vi.fn(), closed: false }),
);

vi.mock('@/communication/mediaTransportService/mediaTransportService', () => ({
  MediaTransportService: {
    getInstance: () => ({
      sendTransport: { produce: mockProduce },
    }),
  },
}));

vi.mock('@/common/store/soundboardStore', () => {
  const store = {
    getState: () => ({
      volume: 0.8,
      canPlay: () => true,
      isPlaying: false,
      setIsPlaying: vi.fn(),
      setLastPlayedAt: vi.fn(),
    }),
  };
  return { default: store };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { SoundboardService } from './soundboardService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetServiceInstance() {
  // Reset the singleton so each test starts fresh
  (SoundboardService as unknown as { instance: SoundboardService | null }).instance = null;
}

function makeTestSound() {
  return {
    id: 'test-1',
    workspaceId: 'ws-abc',
    name: 'test-sound',
    audioUrl: 'https://cdn.example.com/test.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 50_000,
    durationMs: 2000,
    uploadedBy: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetServiceInstance();
  mockGainNode.gain.value = 1;
  mockGainNode.connect.mockClear();
  mockSource.connect.mockClear();
  mockSource.start.mockClear();
  mockSource.buffer = null;
  mockSource.onended = null;
  mockAudioContext.state = 'running';
});

// Stub fetch for fetchAudioBuffer
vi.stubGlobal(
  'fetch',
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    }),
  ),
);

describe('SoundboardService — volume control', () => {
  it('should create a GainNode when playSound is called', async () => {
    const service = SoundboardService.getInstance();
    await service.playSound(makeTestSound());

    expect(mockAudioContext.createGain).toHaveBeenCalledOnce();
  });

  it('should initialize gainNode with the store volume value', async () => {
    const service = SoundboardService.getInstance();
    await service.playSound(makeTestSound());

    // Store mock returns volume: 0.8
    expect(mockGainNode.gain.value).toBe(0.8);
  });

  it('should route audio through gainNode: source → gain → destinations', async () => {
    const service = SoundboardService.getInstance();
    await service.playSound(makeTestSound());

    // source connects to gain node
    expect(mockSource.connect).toHaveBeenCalledWith(mockGainNode);
    // gain node connects to both destinations
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockDestination);
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  it('should not connect source directly to destinations', async () => {
    const service = SoundboardService.getInstance();
    await service.playSound(makeTestSound());

    // source should only connect to gain node, not directly to destinations
    expect(mockSource.connect).not.toHaveBeenCalledWith(mockDestination);
    expect(mockSource.connect).not.toHaveBeenCalledWith(mockAudioContext.destination);
  });

  it('setVolume should update gainNode gain value', async () => {
    const service = SoundboardService.getInstance();
    await service.playSound(makeTestSound());

    service.setVolume(0.5);
    expect(mockGainNode.gain.value).toBe(0.5);
  });

  it('setVolume should clamp values below 0', async () => {
    const service = SoundboardService.getInstance();
    await service.playSound(makeTestSound());

    service.setVolume(-1);
    expect(mockGainNode.gain.value).toBe(0);
  });

  it('setVolume should clamp values above 1', async () => {
    const service = SoundboardService.getInstance();
    await service.playSound(makeTestSound());

    service.setVolume(2);
    expect(mockGainNode.gain.value).toBe(1);
  });

  it('setVolume should be a no-op when gainNode is not yet created', () => {
    const service = SoundboardService.getInstance();
    // Call setVolume before any playSound — should not throw
    expect(() => service.setVolume(0.5)).not.toThrow();
  });

  it('cleanup should allow setVolume to be called without error after reset', async () => {
    const service = SoundboardService.getInstance();
    await service.playSound(makeTestSound());
    service.cleanup();

    // After cleanup, gainNode is null — setVolume should still not throw
    expect(() => service.setVolume(0.3)).not.toThrow();
  });
});
