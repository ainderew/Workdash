import React from "react";
import { PhoneOff } from "lucide-react";
import useCallStore from "@/common/store/callStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { useCallOwnershipActions } from "@/common/hooks/useCallOwnershipActions";

/**
 * Small floating indicator shown when the user is passive or rejoin-available
 * and NOT currently viewing the call's channel. When they ARE viewing the
 * call's channel, CallBanner handles the passive/rejoin UI inline.
 */
export default function FloatingPassiveCallIndicator() {
  const callOwnershipStatus = useCallStore((s) => s.callOwnershipStatus);
  const ownershipChannelId = useCallStore((s) => s.ownershipChannelId);
  const currentRoomId = useChatV2Store((s) => s.currentRoomId);
  const roomName = useChatV2Store(
    (s) => s.roomsById[ownershipChannelId ?? ""]?.name ?? "call",
  );

  const isPassive = callOwnershipStatus === "passive";
  const isRejoinAvailable = callOwnershipStatus === "rejoin-available";
  const isViewingCallChannel = ownershipChannelId === currentRoomId;

  // Only show when passive/rejoin AND not viewing the call's channel
  if ((!isPassive && !isRejoinAvailable) || isViewingCallChannel || !ownershipChannelId) {
    return null;
  }

  return (
    <FloatingPassiveCallIndicatorInner
      ownershipChannelId={ownershipChannelId}
      roomName={roomName}
      isRejoinAvailable={isRejoinAvailable}
    />
  );
}

interface InnerProps {
  ownershipChannelId: string;
  roomName: string;
  isRejoinAvailable: boolean;
}

function FloatingPassiveCallIndicatorInner({ ownershipChannelId, roomName, isRejoinAvailable }: InnerProps) {
  const { handleTakeOver, handleRejoin, isTransferring, isRejoining } = useCallOwnershipActions(ownershipChannelId);

  if (isRejoinAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-[200] flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 wd-bg-panel-2 border border-[var(--wd-warning)] shadow-lg">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full shrink-0 bg-[color-mix(in_srgb,var(--wd-warning)_20%,transparent)]">
          <PhoneOff size={11} className="text-[var(--wd-warning)]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium wd-text-primary">Call disconnected</span>
          <span className="text-[10px] wd-text-muted">#{roomName}</span>
        </div>
        <button
          type="button"
          onClick={handleRejoin}
          disabled={isRejoining}
          className="wd-btn-primary text-[11px] px-2.5 py-1 rounded-md shrink-0"
        >
          {isRejoining ? "Rejoining..." : "Rejoin"}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 wd-bg-panel-2 wd-border-subtle border shadow-lg">
      <span className="h-2 w-2 rounded-full bg-[var(--wd-success)] animate-pulse shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs wd-text-muted">Call active in another tab</span>
        <span className="text-[10px] wd-text-muted">#{roomName}</span>
      </div>
      <button
        type="button"
        onClick={handleTakeOver}
        disabled={isTransferring}
        className="wd-btn-secondary text-[11px] px-2.5 py-1 rounded-md shrink-0"
      >
        {isTransferring ? "Transferring..." : "Take over"}
      </button>
    </div>
  );
}
