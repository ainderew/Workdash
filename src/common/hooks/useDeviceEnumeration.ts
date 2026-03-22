import { useEffect, useRef } from 'react';
import useUiStore from '@/common/store/uiStore';

const DEBOUNCE_MS = 300;

/**
 * App-level hook that enumerates media devices on mount and listens for
 * devicechange events with debouncing. Uses enumerateDevices() directly
 * (no getUserMedia) so it never triggers permission prompts.
 *
 * Mount once in App.tsx — all other hooks read device lists from uiStore.
 */
export function useDeviceEnumeration() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices) return;

    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const microphones = devices.filter((d) => d.kind === 'audioinput');
        const cameras = devices.filter((d) => d.kind === 'videoinput');
        const outputs = devices.filter((d) => d.kind === 'audiooutput');

        useUiStore.getState().setAllDevices({ microphones, cameras, outputs });
      } catch {
        // enumerateDevices failed — store stays as-is
      }
    };

    enumerate();

    const handleDeviceChange = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(enumerate, DEBOUNCE_MS);
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange,
      );
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
}
