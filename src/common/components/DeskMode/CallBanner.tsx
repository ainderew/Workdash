import React, { useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import useCallStore from "@/common/store/callStore";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";
import { logger } from "@/common/utils/logger";
import { useCallOwnershipActions } from "@/common/hooks/useCallOwnershipActions";
import CallView from "./CallView";
import CallAvatar from "./CallAvatar";

interface CallBannerProps {
  channelId: string;
}

export default function CallBanner({ channelId }: CallBannerProps) {
  const call = useCallStore((s) => s.activeCallsByChannel[channelId]);
  const currentCall = useCallStore((s) => s.currentCall);
  const manualFloating = useCallStore((s) => s.manualFloating);
  const isCallOwner = useCallStore((s) => s.isCallOwner);
  const callOwnershipStatus = useCallStore((s) => s.callOwnershipStatus);
  const ownershipChannelId = useCallStore((s) => s.ownershipChannelId);
  const [isJoining, setIsJoining] = useState(false);
  const { handleTakeOver, handleRejoin, isTransferring, isRejoining } = useCallOwnershipActions(channelId);

  if (!call) return null;

  const isInThisCall = currentCall?.channelId === channelId;
  const isInAnotherCall =
    currentCall !== null && currentCall.channelId !== channelId;
  const isPassiveOnThisChannel =
    callOwnershipStatus === "passive" && ownershipChannelId === channelId;
  const isRejoinAvailableOnThisChannel =
    callOwnershipStatus === "rejoin-available" && ownershipChannelId === channelId;

  const handleJoin = async () => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      const service = CallSignalingService.getInstance();
      await service.joinCall(channelId);
    } catch (err) {
      logger.error("Failed to join call:", err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      const service = CallSignalingService.getInstance();
      await service.leaveCall(channelId);
    } catch (err) {
      logger.error("Failed to leave call:", err);
    }
  };

  if (isInThisCall && isCallOwner) {
    if (manualFloating) return null;
    return (
      <CallView
        channelId={channelId}
        onLeave={handleLeave}
        onPictureInPicture={() => useCallStore.getState().setManualFloating(true)}
        onFullscreen={() => {
          const store = useCallStore.getState();
          store.setManualFloating(true);
          store.setFloatingWindowState('fullscreen');
        }}
      />
    );
  }

  if (isPassiveOnThisChannel) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 wd-bg-panel-2 border-b wd-border-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full shrink-0 bg-[var(--wd-accent)]">
            <Phone size={13} className="text-white" />
          </span>
          <span className="text-sm font-medium wd-text-primary truncate">
            Call active in another tab
          </span>
          <span className="text-xs wd-text-muted shrink-0">
            {call.participants.length}{" "}
            {call.participants.length === 1 ? "participant" : "participants"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleTakeOver}
          disabled={isTransferring}
          className="wd-btn-secondary text-xs px-3 h-7 shrink-0"
        >
          {isTransferring ? "Transferring..." : "Take over here"}
        </button>
      </div>
    );
  }

  if (isRejoinAvailableOnThisChannel) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 wd-bg-panel-2 border-b border-[var(--wd-warning)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full shrink-0 bg-[color-mix(in_srgb,var(--wd-warning)_20%,transparent)]">
            <PhoneOff size={13} className="text-[var(--wd-warning)]" />
          </span>
          <span className="text-sm font-medium wd-text-primary truncate">
            Call disconnected
          </span>
          <span className="text-xs wd-text-muted shrink-0">
            {call.participants.length}{" "}
            {call.participants.length === 1 ? "participant" : "participants"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRejoin}
          disabled={isRejoining}
          className="wd-btn-primary text-xs px-3 h-7 shrink-0"
        >
          {isRejoining ? "Rejoining..." : "Rejoin call"}
        </button>
      </div>
    );
  }

  // User is viewing a channel with an active call they haven't joined
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 wd-bg-panel-2 border-b wd-border-subtle">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full shrink-0 bg-[var(--wd-success)]">
          {call.type === "video" ? (
            <Video size={13} className="text-white" />
          ) : (
            <Phone size={13} className="text-white" />
          )}
        </span>

        <span className="text-sm font-medium wd-text-primary truncate">
          {call.type === "video" ? "Video call" : "Voice call"} in progress
        </span>

        <span className="text-xs wd-text-muted shrink-0">
          {call.participants.length}{" "}
          {call.participants.length === 1 ? "participant" : "participants"}
        </span>

        <div className="flex -space-x-1.5 shrink-0">
          {call.participants.slice(0, 5).map((p) => (
            <CallAvatar
              key={p.userId}
              userId={p.userId}
              displayName={p.displayName}
              channelId={channelId}
            />
          ))}
          {call.participants.length > 5 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-bold wd-bg-elevated wd-text-muted">
              +{call.participants.length - 5}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleJoin}
        disabled={isInAnotherCall || isJoining}
        className="wd-btn-primary text-xs px-3 h-7 shrink-0"
        title={
          isInAnotherCall
            ? "Leave your current call first"
            : "Join call"
        }
      >
        {isJoining ? "Joining..." : "Join"}
      </button>
    </div>
  );
}
