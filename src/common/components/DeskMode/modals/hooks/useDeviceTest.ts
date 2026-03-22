import { useCallback, useEffect, useRef, useState } from 'react';
import useUiStore from '@/common/store/uiStore';
import useCallStore from '@/common/store/callStore';
import { VideoChatService } from '@/communication/videoChat/videoChat';

interface UseDeviceTestReturn {
  micLevel: number;
  isMicTesting: boolean;
  startMicTest: () => Promise<void>;
  stopMicTest: () => void;

  cameraStream: MediaStream | null;
  isCameraPreviewActive: boolean;
  startCameraPreview: () => Promise<void>;
  stopCameraPreview: () => void;

  isSpeakerTesting: boolean;
  playSpeakerTest: () => Promise<void>;

  micError: string | null;
  cameraError: string | null;
}

export function useDeviceTest(): UseDeviceTestReturn {
  const [micLevel, setMicLevel] = useState(0);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraPreviewActive, setIsCameraPreviewActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isSpeakerTesting, setIsSpeakerTesting] = useState(false);

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(false);
  const speakerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakerAudioContextRef = useRef<AudioContext | null>(null);
  const speakerAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakerTestingRef = useRef(false);

  const isMountedRef = useRef(true);
  const micTestGenerationRef = useRef(0);
  const cameraTestGenerationRef = useRef(0);

  // --- Mic Test ---
  const stopMicTest = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicLevel(0);
    setIsMicTesting(false);
  }, []);

  const startMicTest = useCallback(async () => {
    stopMicTest();
    setMicError(null);

    const generation = ++micTestGenerationRef.current;

    const selectedMicrophoneId = useUiStore.getState().selectedMicrophoneId;

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedMicrophoneId
          ? { deviceId: { exact: selectedMicrophoneId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (generation !== micTestGenerationRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      micStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      setIsMicTesting(true);

      const updateLevel = () => {
        if (!isMountedRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 255) * 100 * 2));
        setMicLevel(normalized);
        rafIdRef.current = requestAnimationFrame(updateLevel);
      };

      rafIdRef.current = requestAnimationFrame(updateLevel);
    } catch (error) {
      if (generation !== micTestGenerationRef.current) return;
      stopMicTest();
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setMicError('Microphone access denied. Check browser permissions.');
      } else {
        setMicError('Selected microphone not found.');
      }
    }
  }, [stopMicTest]);

  // --- Camera Preview ---
  const stopCameraPreview = useCallback(() => {
    if (ownsStreamRef.current && cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    ownsStreamRef.current = false;
    cameraStreamRef.current = null;
    setCameraStream(null);
    setIsCameraPreviewActive(false);
  }, []);

  const startCameraPreview = useCallback(async () => {
    stopCameraPreview();
    setCameraError(null);

    const generation = ++cameraTestGenerationRef.current;

    const currentCall = useCallStore.getState().currentCall;
    const localMedia = useCallStore.getState().localMedia;

    if (currentCall && localMedia.video) {
      const existingStream = VideoChatService.getInstance().getCurrentStream();
      if (existingStream) {
        ownsStreamRef.current = false;
        cameraStreamRef.current = existingStream;
        setCameraStream(existingStream);
        setIsCameraPreviewActive(true);
        return;
      }
    }

    const selectedCameraId = useUiStore.getState().selectedCameraId;

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (generation !== cameraTestGenerationRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      ownsStreamRef.current = true;
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setIsCameraPreviewActive(true);
    } catch (error) {
      if (generation !== cameraTestGenerationRef.current) return;
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Check browser permissions.');
      } else {
        setCameraError('Selected camera not found.');
      }
    }
  }, [stopCameraPreview]);

  // --- Speaker Test ---
  const cleanupSpeakerTest = useCallback(() => {
    if (speakerAudioRef.current) {
      speakerAudioRef.current.pause();
      speakerAudioRef.current.srcObject = null;
      speakerAudioRef.current = null;
    }
    if (
      speakerAudioContextRef.current &&
      speakerAudioContextRef.current.state !== 'closed'
    ) {
      speakerAudioContextRef.current.close().catch(() => {});
      speakerAudioContextRef.current = null;
    }
  }, []);

  const playSpeakerTest = useCallback(async () => {
    if (isSpeakerTestingRef.current) return;
    isSpeakerTestingRef.current = true;
    setIsSpeakerTesting(true);

    const selectedOutputDeviceId =
      useUiStore.getState().selectedOutputDeviceId;

    try {
      const audioContext = new AudioContext();
      speakerAudioContextRef.current = audioContext;

      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = 440;

      const gainNode = audioContext.createGain();

      // Fade envelope: up 50ms, hold, down 100ms over 1s total
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.setValueAtTime(0.3, now + 0.9);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.0);

      oscillator.connect(gainNode);

      if (
        selectedOutputDeviceId &&
        'setSinkId' in HTMLMediaElement.prototype
      ) {
        const dest = audioContext.createMediaStreamDestination();
        gainNode.connect(dest);

        const audio = document.createElement('audio');
        audio.srcObject = dest.stream;
        speakerAudioRef.current = audio;
        await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> })
          .setSinkId(selectedOutputDeviceId)
          .catch(() => {});
        await audio.play().catch(() => {});
      } else {
        gainNode.connect(audioContext.destination);
      }

      oscillator.start(now);
      oscillator.stop(now + 1.0);

      speakerTimeoutRef.current = setTimeout(() => {
        cleanupSpeakerTest();
        isSpeakerTestingRef.current = false;
        if (isMountedRef.current) {
          setIsSpeakerTesting(false);
        }
        speakerTimeoutRef.current = null;
      }, 1100);
    } catch {
      cleanupSpeakerTest();
      isSpeakerTestingRef.current = false;
      if (isMountedRef.current) {
        setIsSpeakerTesting(false);
      }
    }
  }, [cleanupSpeakerTest]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Mic cleanup
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== 'closed'
      ) {
        audioContextRef.current.close().catch(() => {});
      }

      // Camera cleanup — only stop if we own the stream
      if (ownsStreamRef.current && cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Speaker cleanup
      if (speakerTimeoutRef.current) {
        clearTimeout(speakerTimeoutRef.current);
      }
      if (speakerAudioRef.current) {
        speakerAudioRef.current.pause();
        speakerAudioRef.current.srcObject = null;
        speakerAudioRef.current = null;
      }
      if (
        speakerAudioContextRef.current &&
        speakerAudioContextRef.current.state !== 'closed'
      ) {
        speakerAudioContextRef.current.close().catch(() => {});
      }
      isSpeakerTestingRef.current = false;
    };
  }, []);

  return {
    micLevel,
    isMicTesting,
    startMicTest,
    stopMicTest,

    cameraStream,
    isCameraPreviewActive,
    startCameraPreview,
    stopCameraPreview,

    isSpeakerTesting,
    playSpeakerTest,

    micError,
    cameraError,
  };
}
