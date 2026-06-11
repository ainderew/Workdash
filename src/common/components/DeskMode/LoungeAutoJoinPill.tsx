import React, { useEffect, useRef, useState } from 'react';
import { Sofa, X } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';
import useUserStore from '@/common/store/useStore';
import useWorkspaceStore from '@/common/store/workspaceStore';
import { joinLoungeCall } from '@/communication/callSignaling/loungeCall';
import {
  isAutoJoinEnabled,
  setLastLiveNudgeCallStart,
} from '@/common/utils/loungePrefs';
import { logger } from '@/common/utils/logger';

const COUNTDOWN_SECONDS = 5;
/** Auto-join only competes for "app open" — stop arming after this window. */
const ARM_WINDOW_MS = 60_000;

const SUPPRESSED_STATUS_IDS = new Set(['focus', 'dnd', 'do-not-disturb']);

type PillPhase = 'hidden' | 'counting' | 'manual';

export default function LoungeAutoJoinPill() {
  const [phase, setPhase] = useState<PillPhase>('hidden');
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const armedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());

  const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
  const loungeChannelId = useWorkspaceStore(
    (s) =>
      s.workspaces.find((ws) => ws.id === selectedWorkspaceId)
        ?.loungeChannelId ?? null,
  );
  const localUserId = useUserStore((s) => s.backendUser?.id);
  const call = useCallStore((s) =>
    loungeChannelId ? s.activeCallsByChannel[loungeChannelId] : undefined,
  );
  const isInAnyCall = useCallStore((s) => s.currentCall !== null);
  const ownershipStatus = useCallStore((s) => s.callOwnershipStatus);
  const myStatusId = usePresenceStore((s) => s.myStatus.statusId);

  const roomName = useChatV2Store((s) =>
    loungeChannelId ? (s.roomsById[loungeChannelId]?.name ?? 'Lounge') : 'Lounge',
  );

  const participantCount = call?.participants.length ?? 0;
  const amInLoungeCall =
    localUserId !== undefined &&
    (call?.participants.some((p) => p.userId === localUserId) ?? false);

  useEffect(() => {
    if (armedRef.current) return;
    if (Date.now() - mountedAtRef.current > ARM_WINDOW_MS) return;
    if (!loungeChannelId || localUserId === undefined) return;
    if (!isAutoJoinEnabled()) return;
    if (participantCount === 0 || amInLoungeCall) return;
    if (isInAnyCall || ownershipStatus !== null) return;
    if (SUPPRESSED_STATUS_IDS.has(myStatusId)) return;

    armedRef.current = true;
    if (call?.startedAt) {
      setLastLiveNudgeCallStart(call.startedAt);
    }
    setSecondsLeft(COUNTDOWN_SECONDS);
    setPhase('counting');
  }, [
    loungeChannelId,
    localUserId,
    participantCount,
    amInLoungeCall,
    isInAnyCall,
    ownershipStatus,
    myStatusId,
    call?.startedAt,
  ]);

  useEffect(() => {
    if (phase !== 'counting') return;
    if (secondsLeft <= 0) {
      setPhase('hidden');
      joinLoungeCall(loungeChannelId!).catch((err) => {
        logger.warn('Lounge auto-join blocked — falling back to manual:', err);
        setPhase('manual');
      });
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, loungeChannelId]);

  if (phase === 'hidden' || !loungeChannelId) return null;
  if (participantCount === 0 || isInAnyCall) return null;

  const joinNow = () => {
    setPhase('hidden');
    joinLoungeCall(loungeChannelId).catch((err) => {
      logger.error('Failed to join the lounge:', err);
      setPhase('manual');
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[210] flex items-center gap-3 rounded-xl border wd-border-subtle wd-bg-panel-2 px-3.5 py-2.5 shadow-lg">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--wd-success-rgb)/0.14)]">
        <Sofa size={14} className="text-[var(--wd-success)]" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold wd-text-primary">
          {phase === 'counting'
            ? `Joining ${roomName} in ${secondsLeft}s…`
            : `${roomName} is live`}
        </span>
        <span className="text-[10px] wd-text-muted">
          {participantCount} {participantCount === 1 ? 'person' : 'people'} in
          there · joins muted
        </span>
      </div>
      <button
        type="button"
        onClick={joinNow}
        className="shrink-0 rounded-md bg-[var(--wd-success)] px-2.5 py-1 text-[11px] font-bold text-white"
      >
        Join now
      </button>
      <button
        type="button"
        aria-label="Cancel auto-join"
        onClick={() => setPhase('hidden')}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md wd-text-muted hover:bg-[var(--wd-surface-elevated)]"
      >
        <X size={13} />
      </button>
    </div>
  );
}
