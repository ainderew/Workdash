import { useEffect, type RefObject } from 'react';
import { AudioChat } from '@/communication/audioChat/audioChat';

/** RMS threshold below which audio is considered background noise (0–1 scale) */
const NOISE_FLOOR = 0.01;
/** Ms the level must stay above NOISE_FLOOR before activating the highlight */
const ACTIVATION_DELAY_MS = 50;
/** Ms the level must stay below NOISE_FLOOR before deactivating the highlight */
const DEACTIVATION_DELAY_MS = 500;

/**
 * Monitors a participant's audio level via an AnalyserNode and toggles a
 * `data-speaking="true"` attribute on the referenced tile DOM node.
 *
 * Uses hysteresis: 50 ms activation / 500 ms deactivation to prevent flicker.
 * All mutations are direct DOM writes — no React state is involved.
 */
export function useActiveSpeaker(
  displayName: string,
  isLocal: boolean,
  isMuted: boolean,
  tileRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    const tileEl = tileRef.current;
    if (!tileEl) return;

    // When muted, ensure highlight is off and skip monitoring
    if (isMuted) {
      tileEl.removeAttribute('data-speaking');
      return;
    }

    let speaking = false;
    let activationTimer: number | null = null;
    let deactivationTimer: number | null = null;
    let animFrameId: number;
    let dataArray: Uint8Array | null = null;

    const checkAudioLevel = () => {
      const audioChat = AudioChat.getInstance();
      const analyser = isLocal
        ? audioChat.getLocalAnalyser()
        : audioChat.getOrCreateAnalyserForUser(displayName);

      if (!analyser) {
        animFrameId = requestAnimationFrame(checkAudioLevel);
        return;
      }

      if (!dataArray || dataArray.length !== analyser.frequencyBinCount) {
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      }

      analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS from time-domain samples (centered at 128)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const aboveThreshold = rms > NOISE_FLOOR;

      if (aboveThreshold && !speaking) {
        // Audio detected — cancel any pending deactivation, start activation
        if (deactivationTimer !== null) {
          clearTimeout(deactivationTimer);
          deactivationTimer = null;
        }
        if (activationTimer === null) {
          activationTimer = window.setTimeout(() => {
            speaking = true;
            tileEl.setAttribute('data-speaking', 'true');
            activationTimer = null;
          }, ACTIVATION_DELAY_MS);
        }
      } else if (!aboveThreshold && speaking) {
        // Audio dropped — cancel any pending activation, start deactivation
        if (activationTimer !== null) {
          clearTimeout(activationTimer);
          activationTimer = null;
        }
        if (deactivationTimer === null) {
          deactivationTimer = window.setTimeout(() => {
            speaking = false;
            tileEl.removeAttribute('data-speaking');
            deactivationTimer = null;
          }, DEACTIVATION_DELAY_MS);
        }
      } else if (aboveThreshold && speaking) {
        // Still speaking — cancel any pending deactivation
        if (deactivationTimer !== null) {
          clearTimeout(deactivationTimer);
          deactivationTimer = null;
        }
      } else {
        // Still silent — cancel any pending activation
        if (activationTimer !== null) {
          clearTimeout(activationTimer);
          activationTimer = null;
        }
      }

      animFrameId = requestAnimationFrame(checkAudioLevel);
    };

    animFrameId = requestAnimationFrame(checkAudioLevel);

    return () => {
      cancelAnimationFrame(animFrameId);
      if (activationTimer !== null) clearTimeout(activationTimer);
      if (deactivationTimer !== null) clearTimeout(deactivationTimer);
      tileEl.removeAttribute('data-speaking');
    };
  }, [displayName, isLocal, isMuted, tileRef]);
}
