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

  const { btn, icon } = sizeConfig[size];

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
              : noiseCancellation
                ? 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
                : 'border-[var(--wd-warning)] text-[var(--wd-warning)]'
          }`}
          style={
            !noiseCancellation && !isToggling
              ? { backgroundColor: 'color-mix(in srgb, var(--wd-warning) 12%, transparent)' }
              : undefined
          }
        >
          <AudioLines size={icon} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {noiseCancellation ? 'Noise cancellation on' : 'Noise cancellation off'}
      </TooltipContent>
    </Tooltip>
  );
}
