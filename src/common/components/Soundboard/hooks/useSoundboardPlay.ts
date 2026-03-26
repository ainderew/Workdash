import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import useSoundboardStore from '@/common/store/soundboardStore';
import { SoundboardService } from '@/communication/soundboard/soundboardService';
import type { SoundboardSound } from '../_types';

export function useSoundboardPlay() {
  const isPlaying = useSoundboardStore((s) => s.isPlaying);
  const lastPlayedAt = useSoundboardStore((s) => s.lastPlayedAt);
  const cooldownMs = useSoundboardStore((s) => s.cooldownMs);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for cooldown display
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!lastPlayedAt) {
      setCooldownRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const elapsed = Date.now() - lastPlayedAt;
      const remaining = Math.max(0, cooldownMs - elapsed);
      setCooldownRemaining(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    updateRemaining();
    timerRef.current = setInterval(updateRemaining, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [lastPlayedAt, cooldownMs]);

  const playSound = useCallback(async (sound: SoundboardSound) => {
    try {
      const service = SoundboardService.getInstance();
      await service.playSound(sound);
    } catch (err) {
      toast.error('Failed to play sound', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    }
  }, []);

  const canPlay = !isPlaying && cooldownRemaining <= 0;

  return { playSound, isPlaying, canPlay, cooldownRemaining };
}
