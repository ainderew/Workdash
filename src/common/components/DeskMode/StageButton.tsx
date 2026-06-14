import React from 'react';
import { MonitorPlay } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import useUserStore from '@/common/store/useStore';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { CallControlSize } from './CallControlBar';

const sizeConfig = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
} as const;

const iconSize = { sm: 13, md: 15 } as const;

/**
 * Take or release the synced stage. Presents your screen if you're sharing,
 * otherwise your camera. While someone else holds the stage this takes it over
 * (last-writer-wins). Self-contained — reads call state from the store.
 */
export default function StageButton({ size = 'md' }: { size?: CallControlSize }) {
  const channelId = useCallStore((s) => s.currentCall?.channelId ?? null);
  const presenter = useCallStore((s) => s.presenter);
  const localScreen = useCallStore((s) => s.localMedia.screen);
  const localUserId = useUserStore((s) => s.backendUser?.id ?? null);

  if (!channelId || localUserId == null) return null;

  const isPresenter = presenter?.userId === localUserId;
  const someoneElsePresenting = presenter != null && !isPresenter;

  const handleClick = () => {
    const service = CallSignalingService.getInstance();
    if (isPresenter) {
      service.setPresenter(channelId, null);
    } else {
      service.setPresenter(channelId, {
        userId: localUserId,
        source: localScreen ? 'screen' : 'camera',
      });
    }
  };

  const label = isPresenter
    ? 'Leave stage — back to grid for everyone'
    : someoneElsePresenting
      ? 'Take over the stage'
      : localScreen
        ? 'Present your screen to everyone in full quality'
        : 'Put yourself on stage for everyone';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          aria-pressed={isPresenter}
          className={`inline-flex items-center justify-center ${sizeConfig[size]} rounded-full border cursor-pointer transition-colors ${
            isPresenter
              ? 'border-[var(--wd-text-primary)] text-[var(--wd-text-primary)] bg-[var(--wd-surface-elevated)]'
              : 'wd-border-subtle wd-text-secondary hover:wd-text-primary'
          }`}
        >
          <MonitorPlay size={iconSize[size]} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
