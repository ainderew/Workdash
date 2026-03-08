import React from "react";
import { Phone, Video } from "lucide-react";
import useCallStore from "@/common/store/callStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { useCharacterFaceAvatar } from "@/common/utils/characterFaceAvatar";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";
import CallView from "./CallView";

function ParticipantAvatar({
  userId,
  displayName,
  channelId,
}: {
  userId: number;
  displayName: string;
  channelId: string;
}) {
  const members = useChatV2Store((s) => s.membersByRoomId[channelId]);
  const member = members?.find((m) => m.userId === userId);
  const profileImage = member?.user?.image;
  const characterCustomization = member?.user?.characterCustomization ?? null;
  const spriteAvatar = useCharacterFaceAvatar(characterCustomization);

  const sharedClass =
    "inline-flex items-center justify-center h-5 w-5 rounded-full border wd-border-subtle";

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={displayName}
        title={displayName}
        className={`${sharedClass} object-cover`}
      />
    );
  }

  if (spriteAvatar) {
    return (
      <img
        src={spriteAvatar}
        alt={displayName}
        title={displayName}
        className={sharedClass}
        style={{ imageRendering: "pixelated" }}
      />
    );
  }

  return (
    <span
      className={`${sharedClass} text-[9px] font-bold`}
      style={{
        backgroundColor: "var(--wd-surface-elevated)",
        color: "var(--wd-text-primary)",
      }}
      title={displayName}
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}

interface CallBannerProps {
  channelId: string;
}

export default function CallBanner({ channelId }: CallBannerProps) {
  const call = useCallStore((s) => s.activeCallsByChannel[channelId]);
  const currentCall = useCallStore((s) => s.currentCall);

  if (!call) return null;

  const isInThisCall = currentCall?.channelId === channelId;
  const isInAnotherCall =
    currentCall !== null && currentCall.channelId !== channelId;

  const handleJoin = async () => {
    try {
      const service = CallSignalingService.getInstance();
      await service.joinCall(channelId);
    } catch (err) {
      console.error("Failed to join call:", err);
    }
  };

  const handleLeave = async () => {
    try {
      const service = CallSignalingService.getInstance();
      await service.leaveCall(channelId);
    } catch (err) {
      console.error("Failed to leave call:", err);
    }
  };

  // User is in this call — show full call view
  if (isInThisCall) {
    return <CallView channelId={channelId} onLeave={handleLeave} />;
  }

  // User is viewing a channel with an active call they haven't joined
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 wd-bg-panel-2 border-b wd-border-subtle">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="inline-flex items-center justify-center h-6 w-6 rounded-full shrink-0"
          style={{ backgroundColor: "var(--wd-success)" }}
        >
          {call.type === "video" ? (
            <Video size={13} color="#fff" />
          ) : (
            <Phone size={13} color="#fff" />
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
            <ParticipantAvatar
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
        disabled={isInAnotherCall}
        className="wd-btn-primary text-xs px-3 h-7 shrink-0"
        title={
          isInAnotherCall
            ? "Leave your current call first"
            : "Join call"
        }
      >
        Join
      </button>
    </div>
  );
}
