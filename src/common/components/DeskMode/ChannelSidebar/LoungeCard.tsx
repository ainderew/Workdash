import React, { useState } from 'react';
import { Sofa, Music } from 'lucide-react';
import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import { usePresenceStore } from '@/common/store/presenceStore';
import useUserStore from '@/common/store/useStore';
import useMusicStore from '@/common/store/musicStore';
import usePlaylistStore from '@/common/store/playlistStore';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';
import { joinLoungeCall } from '@/communication/callSignaling/loungeCall';
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

  const musicWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
  const musicSession = useMusicStore((s) =>
    musicWorkspaceId ? s.sessionsByWorkspace[musicWorkspaceId] : null,
  );
  const currentTrack = musicSession?.currentTrack ?? null;
  const isMusicPlaying = musicSession?.state === 'playing';

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
      await joinLoungeCall(loungeChannelId, { navigate: false });
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
      className={`wd-lounge-card relative isolate mx-2 mt-2 cursor-pointer overflow-hidden rounded-xl border p-3 text-left transition-colors wd-ring-focus ${
        isBusy ? 'opacity-60' : ''
      } ${
        isLive || isInLounge
          ? 'border-[var(--wd-success)] shadow-[0_0_16px_rgb(var(--wd-success-rgb)/0.18)]'
          : 'border-[var(--wd-den-border)] shadow-[0_0_18px_rgb(var(--wd-accent-rgb)/0.10)] hover:border-[var(--wd-accent)]'
      }`}
    >
      {/* mini hearth — drifting embers + lamplight glow, clipped to the card */}
      <div className="wd-lounge-card-fx" aria-hidden="true">
        <div className="wd-lounge-card-glow" />
        <span className="wd-lounge-card-ember" />
        <span className="wd-lounge-card-ember" />
        <span className="wd-lounge-card-ember" />
        <span className="wd-lounge-card-ember" />
      </div>

      <div className="relative z-10">
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
        </div>

        {/* Now-playing — read-only glance; controls live in NowPlayingBar */}
        {currentTrack ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-[rgb(0_0_0/0.18)] p-1.5">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md"
              style={{
                background:
                  'linear-gradient(135deg, var(--wd-accent), color-mix(in srgb, var(--wd-accent) 45%, black))',
              }}
            >
              {isMusicPlaying ? (
                <span className="wd-np-eq">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <Music size={13} className="text-white/70" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold wd-text-primary">
                {currentTrack.title}
              </span>
              <span className="block truncate text-[10px] wd-text-muted">
                added by {currentTrack.requestedBy}
              </span>
            </span>
          </div>
        ) : (
          (isLive || isInLounge) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                usePlaylistStore.getState().setSidebarOpen(true);
              }}
              className="mt-1.5 w-full py-1 text-center text-[11px] wd-text-muted transition-colors hover:wd-text-primary"
            >
              ♪ Add a song
            </button>
          )
        )}

        {isInLounge ? (
          <button
            type="button"
            onClick={(e) => void handleLeave(e)}
            disabled={isBusy}
            className="mt-2.5 w-full rounded-lg border border-[rgb(var(--wd-danger-rgb)/0.5)] bg-[rgb(var(--wd-danger-rgb)/0.12)] py-1.5 text-[12px] font-bold text-[var(--wd-danger)] disabled:opacity-60"
          >
            Get up
          </button>
        ) : (
          <span
            className="mt-2.5 block w-full rounded-lg py-1.5 text-center text-[12px] font-bold"
            style={{
              background: isLive
                ? 'linear-gradient(180deg, color-mix(in srgb, var(--wd-success) 82%, white), var(--wd-success))'
                : 'linear-gradient(180deg, var(--wd-accent-hover), var(--wd-accent))',
              color: isLive ? 'white' : 'var(--primary-foreground)',
            }}
          >
            {isLive ? 'Join' : 'Sit down'}
          </span>
        )}
      </div>
    </div>
  );
}
