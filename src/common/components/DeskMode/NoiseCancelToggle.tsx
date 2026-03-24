import React, { useCallback, useState } from 'react';
import { AudioLines } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import useAudioStore from '@/common/store/audioStore';
import { AudioChat } from '@/communication/audioChat/audioChat';
import { RNNoiseService } from '@/communication/audioChat/rnnoiseService';
import type { CallControlSize } from './CallControlBar';

const sizeConfig = {
  sm: { btn: 'h-7 w-7', icon: 13 },
  md: { btn: 'h-8 w-8', icon: 15 },
} as const;

interface NoiseCancelToggleProps {
  size?: CallControlSize;
}

export default function NoiseCancelToggle({ size = 'md' }: NoiseCancelToggleProps) {
  const noiseCancellation = useAudioStore((s) => s.noiseCancellation);
  const noiseCancellationActive = useAudioStore((s) => s.noiseCancellationActive);
  const audioQualityMode = useAudioStore((s) => s.audioQualityMode);
  const setNoiseCancellation = useAudioStore((s) => s.setNoiseCancellation);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const newValue = !noiseCancellation;
      setNoiseCancellation(newValue);
      const currentMode = useAudioStore.getState().audioQualityMode;
      if (currentMode === 'standard') {
        await AudioChat.getInstance().applyQualityMode('standard');
      }
    } finally {
      setIsToggling(false);
    }
  }, [isToggling, noiseCancellation, setNoiseCancellation]);

  if (audioQualityMode === 'studio' || !RNNoiseService.isSupported()) {
    return null;
  }

  // User wants NC on but RNNoise failed to load — show warning state.
  // Skip during toggle (pipeline is rebuilding, ncActive hasn't updated yet).
  const isFallback = noiseCancellation && !noiseCancellationActive && !isToggling;

  const { btn, icon } = sizeConfig[size];

  const tooltipText = isToggling
    ? 'Switching...'
    : isFallback
      ? 'Noise cancellation failed to load — using basic filter'
      : noiseCancellation
        ? 'Noise cancellation on'
        : 'Noise cancellation off';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={noiseCancellation}
          aria-label="Toggle noise cancellation"
          className={`inline-flex items-center justify-center ${btn} rounded-full border cursor-pointer transition-colors ${
            isToggling
              ? 'opacity-60 cursor-wait'
              : isFallback
                ? 'border-[var(--wd-warning)] text-[var(--wd-warning)]'
                : noiseCancellation
                  ? 'border-[var(--wd-success)] text-[var(--wd-success)]'
                  : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
          }`}
        >
          <AudioLines size={icon} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
