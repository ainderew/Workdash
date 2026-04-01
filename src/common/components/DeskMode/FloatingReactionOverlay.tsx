import React from "react";
import { useShallow } from "zustand/react/shallow";
import useCallReactionStore from "@/common/store/callReactionStore";

interface FloatingReactionOverlayProps {
  userId: number;
}

export default function FloatingReactionOverlay({
  userId,
}: FloatingReactionOverlayProps) {
  const reactions = useCallReactionStore(
    useShallow((s) => s.floatingReactions.filter((r) => r.userId === userId)),
  );
  const removeReaction = useCallReactionStore((s) => s.removeReaction);

  if (reactions.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="absolute text-2xl wd-reaction-float"
          style={{ left: `${deriveOffset(r.id)}%`, bottom: "30%" }}
          onAnimationEnd={() => removeReaction(r.id)}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

/** Derive a stable horizontal offset (20–80%) from the reaction id */
function deriveOffset(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return 20 + (Math.abs(hash) % 61);
}
