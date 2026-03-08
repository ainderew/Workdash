import React from "react";
import { Phone } from "lucide-react";
import useCallStore from "@/common/store/callStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { useCharacterFaceAvatar } from "@/common/utils/characterFaceAvatar";

function MiniAvatar({
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
    "inline-flex items-center justify-center h-4 w-4 rounded-full ring-1";

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={displayName}
        className={`${sharedClass} object-cover`}
        style={{ ringColor: "var(--wd-surface-panel)" }}
      />
    );
  }

  if (spriteAvatar) {
    return (
      <img
        src={spriteAvatar}
        alt={displayName}
        className={sharedClass}
        style={{
          imageRendering: "pixelated",
          ringColor: "var(--wd-surface-panel)",
        }}
      />
    );
  }

  return (
    <span
      className={`${sharedClass} text-[8px] font-bold`}
      style={{
        backgroundColor: "var(--wd-surface-elevated)",
        color: "var(--wd-text-primary)",
        ringColor: "var(--wd-surface-panel)",
      }}
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}

interface ChannelCallIndicatorProps {
  channelId: string;
}

export default function ChannelCallIndicator({
  channelId,
}: ChannelCallIndicatorProps) {
  const call = useCallStore(
    (s) => s.activeCallsByChannel[channelId],
  );

  if (!call) return null;

  const MAX_AVATARS = 3;
  const participants = call.participants.slice(0, MAX_AVATARS);
  const overflow = call.participants.length - MAX_AVATARS;

  return (
    <span
      className="inline-flex items-center gap-1 shrink-0"
      title={`${call.participants.length} in call`}
    >
      {/* Stacked avatars */}
      <span className="inline-flex items-center -space-x-1.5">
        {participants.map((p) => (
          <MiniAvatar
            key={p.userId}
            userId={p.userId}
            displayName={p.displayName}
            channelId={channelId}
          />
        ))}
        {overflow > 0 && (
          <span
            className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[7px] font-bold ring-1"
            style={{
              backgroundColor: "var(--wd-surface-elevated)",
              color: "var(--wd-text-muted)",
              ringColor: "var(--wd-surface-panel)",
            }}
          >
            +{overflow}
          </span>
        )}
      </span>

      {/* Green call badge */}
      <span
        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: "var(--wd-success)",
          color: "#fff",
        }}
      >
        <Phone size={10} className="animate-pulse" />
        {call.participants.length}
      </span>
    </span>
  );
}
