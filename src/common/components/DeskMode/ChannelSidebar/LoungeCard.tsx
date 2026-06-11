import React, { useState } from 'react';
import { Sofa } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';
import useUserStore from '@/common/store/useStore';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';
import { logger } from '@/common/utils/logger';
import UserAvatar from '../UserAvatar';

interface LoungeCardProps {
  loungeChannelId: string;
  onSelectRoom: (roomId: string) => void;
}

export default function LoungeCard({
  loungeChannelId,
  onSelectRoom,
}: LoungeCardProps) {
  const [isBusy, setIsBusy] = useState(false);

  const roomName = useChatV2Store(
    (s) => s.roomsById[loungeChannelId]?.name ?? 'Lounge',
  );
  const call = useCallStore((s) => s.activeCallsByChannel[loungeChannelId]);
  const currentCall = useCallStore((s) => s.currentCall);
  const localUserId = useUserStore((s) => s.backendUser?.id);

  const onlineCount = usePresenceStore((s) => {
    let count = 0;
    for (const [uid, presence] of Object.entries(s.presenceMap)) {
      if (Number(uid) === localUserId) continue;
      if (presence && presence.statusId !== 'offline') count += 1;
    }
    return count;
  });

  const participants = call?.participants ?? [];
  const isLive = participants.length > 0;
  const isInLounge = currentCall?.channelId === loungeChannelId;

  const handleCardClick = async () => {
    if (isBusy) return;
    onSelectRoom(loungeChannelId);
    if (isInLounge) return;

    setIsBusy(true);
    try {
      const service = CallSignalingService.getInstance();
      const activeCall = useCallStore.getState().currentCall;
      if (activeCall && activeCall.channelId !== loungeChannelId) {
        await service.leaveCall(activeCall.channelId);
      }
      if (isLive) {
        await service.joinCall(loungeChannelId);
      } else {
        await service.startCall(loungeChannelId);
      }
    } catch (err) {
      logger.error('Failed to join the lounge:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBusy) return;
    setIsBusy(true);
    try {
      await CallSignalingService.getInstance().leaveCall(loungeChannelId);
    } catch (err) {
      logger.error('Failed to leave the lounge:', err);
    } finally {
      setIsBusy(false);
    }
  };

  const meta = isInLounge
    ? `You${participants.length > 1 ? ` + ${participants.length - 1}` : ''} on the couch`
    : isLive
      ? `${participants.length} hanging out`
      : onlineCount > 0
        ? `${onlineCount} ${onlineCount === 1 ? 'friend' : 'friends'} online`
        : "Nobody's here yet";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        isInLounge
          ? `Open ${roomName}`
          : isLive
            ? `Join the ${roomName} call`
            : `Start hanging out in ${roomName}`
      }
      aria-disabled={isBusy}
      onClick={() => void handleCardClick()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void handleCardClick();
        }
      }}
      className={`mx-2 mt-2 cursor-pointer rounded-xl border p-3 text-left transition-colors wd-ring-focus ${
        isBusy ? 'opacity-60' : ''
      } ${
        isLive || isInLounge
          ? 'border-[var(--wd-success)] shadow-[0_0_14px_rgb(var(--wd-success-rgb)/0.15)]'
          : 'wd-border-subtle hover:border-[var(--wd-border-strong)]'
      } wd-bg-panel-2`}
    >
      <div className="flex items-center gap-2">
        <Sofa size={14} className="wd-text-muted shrink-0" />
        <span className="flex-1 truncate text-[13px] font-bold wd-text-primary">
          {roomName}
        </span>
        {(isLive || isInLounge) && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--wd-success)] motion-safe:animate-pulse" />
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {participants.length > 0 && (
          <span className="flex shrink-0">
            {participants.slice(0, 3).map((p, i) => (
              <span key={p.userId} title={p.displayName} className={i > 0 ? '-ml-2' : ''}>
                <UserAvatar name={p.displayName} size="xs" />
              </span>
            ))}
            {participants.length > 3 && (
              <span className="-ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border wd-border-subtle wd-bg-elevated text-[10px] font-bold wd-text-muted">
                +{participants.length - 3}
              </span>
            )}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[11.5px] wd-text-muted">
          {meta}
        </span>
        {isInLounge ? (
          <button
            type="button"
            onClick={(e) => void handleLeave(e)}
            disabled={isBusy}
            className="shrink-0 rounded-lg border border-[rgb(var(--wd-success-rgb)/0.5)] bg-[rgb(var(--wd-success-rgb)/0.1)] px-2.5 py-1 text-[11px] font-bold text-[var(--wd-success)] disabled:opacity-60"
          >
            Get up
          </button>
        ) : (
          <span
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white ${
              isLive ? 'bg-[var(--wd-success)]' : 'bg-[var(--wd-accent)]'
            }`}
          >
            {isLive ? 'Join' : 'Start'}
          </span>
        )}
      </div>
    </div>
  );
}
