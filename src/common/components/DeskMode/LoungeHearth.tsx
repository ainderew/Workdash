import React, { useState } from 'react';
import { toast } from 'sonner';
import { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import { logger } from '@/common/utils/logger';

export function LoungeHearthBackdrop() {
  return (
    <>
      <div className="wd-hearth-glow" />
      <span className="wd-ember" />
      <span className="wd-ember" />
      <span className="wd-ember" />
      <span className="wd-ember" />
      <span className="wd-ember" />
    </>
  );
}

interface LoungeSoloStateProps {
  workspaceId: string;
}

export function LoungeSoloState({ workspaceId }: LoungeSoloStateProps) {
  const [isPinging, setIsPinging] = useState(false);
  const [pinged, setPinged] = useState(false);

  const pingCrew = async () => {
    if (isPinging || pinged) return;
    setIsPinging(true);
    try {
      await ChatV2Service.getInstance().pingLounge(workspaceId);
      setPinged(true);
      toast('Crew pinged', {
        description: "Everyone online can see you're holding the couch.",
      });
    } catch (err) {
      logger.error('Failed to ping crew:', err);
      toast(err instanceof Error ? err.message : 'Failed to ping the crew');
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="relative z-[1] flex flex-col items-center gap-1.5 px-3 pb-3 pt-1 text-center">
      <p className="text-xs font-semibold wd-text-primary">
        You&apos;re the first one down here
      </p>
      <p className="text-[10.5px] wd-text-muted">
        The fire&apos;s lit — friends can see the lounge glowing
      </p>
      <button
        type="button"
        onClick={() => void pingCrew()}
        disabled={isPinging || pinged}
        className="mt-1 rounded-lg bg-[rgb(var(--wd-den-fire-rgb))] px-3 py-1.5 text-[11px] font-bold text-[rgb(var(--wd-den-bg-1-rgb))] transition-opacity disabled:opacity-60"
      >
        {pinged ? 'Crew pinged' : isPinging ? 'Pinging…' : 'Ping the crew'}
      </button>
    </div>
  );
}
