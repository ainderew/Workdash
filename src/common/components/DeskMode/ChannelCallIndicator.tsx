import React from "react";
import { Phone } from "lucide-react";
import useCallStore from "@/common/store/callStore";

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

  return (
    <span
      className="inline-flex items-center gap-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor: "var(--wd-success)",
        color: "#fff",
      }}
      title={`${call.participants.length} in call`}
    >
      <Phone size={10} className="animate-pulse" />
      {call.participants.length}
    </span>
  );
}
