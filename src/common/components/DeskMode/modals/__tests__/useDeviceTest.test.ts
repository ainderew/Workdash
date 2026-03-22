import { renderHook, act } from '@testing-library/react';
import { useDeviceTest } from '../hooks/useDeviceTest';
import {
  createMockMediaStream,
  createMockAudioContext,
  setupMediaDevicesMock,
} from './media-test-utils';

// Mock store + service dependencies
vi.mock('@/common/store/uiStore', () => {
  const store = {
    selectedMicrophoneId: '',
    selectedCameraId: '',
    selectedOutputDeviceId: '',
  };
  const useUiStore = vi.fn((selector: (s: typeof store) => unknown) => selector(store));
  useUiStore.getState = () => store;
  return { default: useUiStore };
});

vi.mock('@/common/store/callStore', () => {
  const store = {
    currentCall: null,
    localMedia: { video: false },
  };
  const useCallStore = vi.fn((selector: (s: typeof store) => unknown) => selector(store));
  useCallStore.getState = () => store;
  return { default: useCallStore };
});

vi.mock('@/communication/videoChat/videoChat', () => ({
  VideoChatService: {
    getInstance: vi.fn(() => ({
      getCurrentStream: vi.fn(() => null),
    })),
  },
}));

const mockRaf = vi.fn(() => 1);
const mockCaf = vi.fn();

// Ensure raf/caf are always available (jsdom doesn't provide them)
globalThis.requestAnimationFrame = mockRaf as unknown as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = mockCaf as unknown as typeof cancelAnimationFrame;

describe('useDeviceTest', () => {
  let mockAudioContext: AudioContext;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockAudioContext = createMockAudioContext();
    vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext));

    const mediaDevices = setupMediaDevicesMock();
    mockGetUserMedia = mediaDevices.getUserMedia;

    // Re-apply after useFakeTimers which may override them
    globalThis.requestAnimationFrame = mockRaf as unknown as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = mockCaf as unknown as typeof cancelAnimationFrame;
    mockRaf.mockClear();
    mockCaf.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore our mocks after useRealTimers might clear them
    globalThis.requestAnimationFrame = mockRaf as unknown as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = mockCaf as unknown as typeof cancelAnimationFrame;
  });

  it('startMicTest calls getUserMedia with audio constraints', async () => {
    const { result } = renderHook(() => useDeviceTest());

    await act(async () => {
      await result.current.startMicTest();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true }),
    );
    expect(result.current.isMicTesting).toBe(true);
  });

  it('stopMicTest cleans up stream and AudioContext', async () => {
    const mockStream = createMockMediaStream();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { result } = renderHook(() => useDeviceTest());

    await act(async () => {
      await result.current.startMicTest();
    });

    act(() => {
      result.current.stopMicTest();
    });

    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
    expect(result.current.isMicTesting).toBe(false);
    expect(result.current.micLevel).toBe(0);
  });

  it('cleanup on unmount stops everything', async () => {
    const mockStream = createMockMediaStream();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { result, unmount } = renderHook(() => useDeviceTest());

    await act(async () => {
      await result.current.startMicTest();
    });

    // Clear to isolate unmount-specific calls
    mockCaf.mockClear();
    const track = mockStream.getTracks()[0];
    (track.stop as ReturnType<typeof vi.fn>).mockClear();

    unmount();

    // The unmount cleanup should call cancelAnimationFrame for the active raf
    // and stop mic stream tracks
    expect(mockCaf).toHaveBeenCalledWith(1);
    expect(track.stop).toHaveBeenCalled();
  });

  it('startCameraPreview calls getUserMedia with video constraints', async () => {
    const { result } = renderHook(() => useDeviceTest());

    await act(async () => {
      await result.current.startCameraPreview();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ video: true }),
    );
    expect(result.current.isCameraPreviewActive).toBe(true);
  });

  it('stopCameraPreview stops tracks', async () => {
    const mockStream = createMockMediaStream();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { result } = renderHook(() => useDeviceTest());

    await act(async () => {
      await result.current.startCameraPreview();
    });

    act(() => {
      result.current.stopCameraPreview();
    });

    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
    expect(result.current.isCameraPreviewActive).toBe(false);
    expect(result.current.cameraStream).toBeNull();
  });

  it('playSpeakerTest sets isSpeakerTesting true then false', async () => {
    const { result } = renderHook(() => useDeviceTest());

    // Start the speaker test
    await act(async () => {
      result.current.playSpeakerTest();
    });

    // After the async function runs, isSpeakerTesting should be true
    expect(result.current.isSpeakerTesting).toBe(true);

    // Advance past the 1100ms timeout to trigger the cleanup
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.isSpeakerTesting).toBe(false);
  });

  it('getUserMedia rejection sets error state', async () => {
    const domError = new DOMException('Not allowed', 'NotAllowedError');
    mockGetUserMedia.mockRejectedValueOnce(domError);

    const { result } = renderHook(() => useDeviceTest());

    await act(async () => {
      await result.current.startMicTest();
    });

    expect(result.current.micError).toBe(
      'Microphone access denied. Check browser permissions.',
    );
    expect(result.current.isMicTesting).toBe(false);
  });
});
