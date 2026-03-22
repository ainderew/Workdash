/**
 * Shared mock factories for AV settings tests.
 */

export function createMockMediaStreamTrack(
  overrides?: Partial<MediaStreamTrack>,
): MediaStreamTrack {
  return {
    id: 'track-1',
    kind: 'audio',
    label: 'Mock Track',
    enabled: true,
    muted: false,
    readyState: 'live',
    contentHint: '',
    onended: null,
    onmute: null,
    onunmute: null,
    stop: vi.fn(),
    clone: vi.fn(),
    getCapabilities: vi.fn(() => ({})),
    getConstraints: vi.fn(() => ({})),
    getSettings: vi.fn(() => ({}) as MediaTrackSettings),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    ...overrides,
  } as unknown as MediaStreamTrack;
}

export function createMockMediaStream(): MediaStream {
  const track = createMockMediaStreamTrack();
  return {
    id: 'stream-1',
    active: true,
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => [track]),
    getVideoTracks: vi.fn(() => [track]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(),
    getTrackById: vi.fn(),
    onaddtrack: null,
    onremovetrack: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaStream;
}

export function createMockDevice(
  overrides?: Partial<MediaDeviceInfo>,
): MediaDeviceInfo {
  return {
    deviceId: 'device-1',
    groupId: 'group-1',
    kind: 'audioinput',
    label: 'Mock Microphone',
    toJSON: vi.fn(() => ({})),
    ...overrides,
  } as MediaDeviceInfo;
}

export function createMockAudioContext(): AudioContext {
  const analyser = {
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
    getFloatFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const source = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: { value: 440, linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: {
        value: 0,
        linearRampToValueAtTime: vi.fn(),
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })),
    createMediaStreamDestination: vi.fn(() => ({
      stream: createMockMediaStream(),
    })),
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  } as unknown as AudioContext;
}

export function setupMediaDevicesMock(devices?: MediaDeviceInfo[]) {
  const enumerateDevices = vi
    .fn()
    .mockResolvedValue(devices ?? [createMockDevice()]);
  const getUserMedia = vi
    .fn()
    .mockResolvedValue(createMockMediaStream());
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();

  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      enumerateDevices,
      getUserMedia,
      addEventListener,
      removeEventListener,
    },
    writable: true,
    configurable: true,
  });

  return { enumerateDevices, getUserMedia, addEventListener, removeEventListener };
}
