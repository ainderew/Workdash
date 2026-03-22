import React from 'react';
import { render, screen } from '@testing-library/react';
import AudioVideoPanel from '../user-settings/AudioVideoPanel';
import { createMockDevice, createMockMediaStream } from './media-test-utils';

// Mock useAudioVideoSettings
const mockAudioVideoSettings = {
  isMuted: false,
  toggleMic: vi.fn(),
  availableMicrophones: [
    createMockDevice({ deviceId: 'mic-1', label: 'Mic 1', kind: 'audioinput' }),
  ],
  selectedMicrophoneId: 'mic-1',
  selectMicrophone: vi.fn(),
  isVideoOff: false,
  toggleVideo: vi.fn(),
  availableCameras: [
    createMockDevice({ deviceId: 'cam-1', label: 'Camera 1', kind: 'videoinput' }),
  ],
  selectedCameraId: 'cam-1',
  selectCamera: vi.fn(),
  availableOutputDevices: [
    createMockDevice({ deviceId: 'out-1', label: 'Speakers', kind: 'audiooutput' }),
  ],
  selectedOutputDeviceId: 'out-1',
  selectOutputDevice: vi.fn(),
  supportsOutputDeviceSelection: true,
  isInCall: false,
  noiseCancellation: false,
  toggleNoiseCancellation: vi.fn(),
  backgroundMusicEnabled: false,
  musicVolume: 0.3,
  toggleBackgroundMusic: vi.fn(),
  setMusicVolume: vi.fn(),
};

vi.mock('../hooks/useAudioVideoSettings', () => ({
  useAudioVideoSettings: vi.fn(() => mockAudioVideoSettings),
}));

const mockDeviceTest = {
  micLevel: 0,
  isMicTesting: false,
  startMicTest: vi.fn(),
  stopMicTest: vi.fn(),
  cameraStream: null as MediaStream | null,
  isCameraPreviewActive: false,
  startCameraPreview: vi.fn(),
  stopCameraPreview: vi.fn(),
  isSpeakerTesting: false,
  playSpeakerTest: vi.fn(),
  micError: null as string | null,
  cameraError: null as string | null,
};

vi.mock('../hooks/useDeviceTest', () => ({
  useDeviceTest: vi.fn(() => mockDeviceTest),
}));

describe('AudioVideoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults
    mockDeviceTest.isMicTesting = false;
    mockDeviceTest.isCameraPreviewActive = false;
    mockDeviceTest.cameraStream = null;
    mockDeviceTest.micError = null;
    mockDeviceTest.cameraError = null;
    mockAudioVideoSettings.supportsOutputDeviceSelection = true;
  });

  it('renders all 4 section headings', () => {
    const { container } = render(<AudioVideoPanel />);
    // Section headings are uppercase <p> elements inside .wd-settings-section
    const sectionHeadings = container.querySelectorAll(
      '.wd-settings-section .text-\\[11px\\]',
    );
    const headingTexts = Array.from(sectionHeadings).map(
      (el) => el.textContent,
    );
    expect(headingTexts).toContain('Microphone');
    expect(headingTexts).toContain('Camera');
    expect(headingTexts).toContain('Speaker / Output');
    expect(headingTexts).toContain('Background Music');
  });

  it('renders mic test button and level meter when testing', () => {
    mockDeviceTest.isMicTesting = true;
    mockDeviceTest.micLevel = 50;

    render(<AudioVideoPanel />);
    expect(screen.getByRole('button', { name: /Stop Test/ })).toBeInTheDocument();
    expect(screen.getByRole('meter')).toBeInTheDocument();
    expect(screen.getByText('Speak to test your microphone')).toBeInTheDocument();
  });

  it('renders camera test button and preview when testing', () => {
    mockDeviceTest.isCameraPreviewActive = true;
    mockDeviceTest.cameraStream = createMockMediaStream();

    const { container } = render(<AudioVideoPanel />);
    expect(screen.getByRole('button', { name: /Stop Preview/ })).toBeInTheDocument();
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('renders speaker test button', () => {
    render(<AudioVideoPanel />);
    expect(screen.getByRole('button', { name: /Test Speaker/ })).toBeInTheDocument();
  });

  it('hides output section device selector when not supported', () => {
    mockAudioVideoSettings.supportsOutputDeviceSelection = false;

    render(<AudioVideoPanel />);
    expect(
      screen.getByText('Output device selection is not supported in this browser.'),
    ).toBeInTheDocument();
  });

  it('Background Music section present', () => {
    const { container } = render(<AudioVideoPanel />);
    const sectionHeadings = container.querySelectorAll(
      '.wd-settings-section .text-\\[11px\\]',
    );
    const headingTexts = Array.from(sectionHeadings).map(
      (el) => el.textContent,
    );
    expect(headingTexts).toContain('Background Music');
  });
});
