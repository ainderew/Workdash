import React from "react";
import { Phone } from "lucide-react";
import useCallStore from "@/common/store/callStore";
import useCallReactionStore from "@/common/store/callReactionStore";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import CallAvatar from "./CallAvatar";

interface ChannelCallIndicatorProps {
  channelId: string;
}

export default function ChannelCallIndicator({
  channelId,
}: ChannelCallIndicatorProps) {
  const call = useCallStore(
    (s) => s.activeCallsByChannel[channelId],
  );

  const raisedHands = useCallReactionStore((s) => s.raisedHands);

  if (!call) return null;

  const raisedParticipants = call.participants.filter(
    (p) => raisedHands.has(p.userId),
  );
  const raisedCount = raisedParticipants.length;

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
          <CallAvatar
            key={p.userId}
            userId={p.userId}
            displayName={p.displayName}
            channelId={channelId}
            size="sm"
          />
        ))}
        {overflow > 0 && (
          <span
            className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[7px] font-bold ring-1 ring-[var(--wd-surface-panel)]"
            style={{
              backgroundColor: "var(--wd-surface-elevated)",
              color: "var(--wd-text-muted)",
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

      {/* Raise hand indicator */}
      {raisedCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[10px] font-semibold cursor-default bg-[var(--wd-surface-base)] text-[var(--wd-warning)] border border-[var(--wd-warning)]">
              ✋ {raisedCount}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={4}>
            <div className="flex flex-col gap-0.5">
              {raisedParticipants.map((p) => (
                <span key={p.userId}>{p.displayName}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}
