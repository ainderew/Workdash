import React, { useState } from "react";
import { Phone, Video } from "lucide-react";
import useCallStore from "@/common/store/callStore";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";

interface StartCallButtonProps {
  channelId: string;
}

export default function StartCallButton({ channelId }: StartCallButtonProps) {
  const callActive = useCallStore(
    (s) => !!s.activeCallsByChannel[channelId],
  );
  const inACall = useCallStore((s) => s.currentCall !== null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Don't show if a call is already active in this channel
  if (callActive) return null;

  const handleStart = async (type: "audio" | "video") => {
    setIsLoading(true);
    setIsOpen(false);
    try {
      const service = CallSignalingService.getInstance();
      await service.startCall(channelId, type);
    } catch (err) {
      console.error("Failed to start call:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || inACall}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md wd-text-secondary hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={inACall ? "Leave your current call first" : "Start a call"}
      >
        <Phone size={16} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border wd-border-subtle shadow-lg py-1"
            style={{ backgroundColor: "var(--wd-surface-panel)" }}
          >
            <button
              type="button"
              onClick={() => handleStart("audio")}
              className="w-full text-left px-3 py-2 text-sm wd-text-primary hover:bg-[var(--wd-surface-elevated)] flex items-center gap-2"
            >
              <Phone size={14} />
              Start Huddle
            </button>
            <button
              type="button"
              onClick={() => handleStart("video")}
              className="w-full text-left px-3 py-2 text-sm wd-text-primary hover:bg-[var(--wd-surface-elevated)] flex items-center gap-2"
            >
              <Video size={14} />
              Start Video Call
            </button>
          </div>
        </>
      )}
    </div>
  );
}
