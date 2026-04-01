import { useCallback } from "react";
import { ReactionService } from "@/communication/reaction/reaction";
import usePlayersStore from "@/common/store/playerStore";
import useUserStore from "@/common/store/useStore";
import useCallReactionStore from "@/common/store/callReactionStore";

export function useCallReaction() {
  const localPlayerId = usePlayersStore((s) => s.localPlayerId);
  const localUserId = useUserStore((s) => s.backendUser?.id);
  const raisedHands = useCallReactionStore((s) => s.raisedHands);
  const isRaisingHand = localUserId ? raisedHands.has(localUserId) : false;

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!localPlayerId || !localUserId) return;
      const reactionService = ReactionService.getInstance();
      reactionService.sendReaction({
        reaction: emoji,
        playerId: localPlayerId,
        userId: localUserId,
      });
    },
    [localPlayerId, localUserId],
  );

  const toggleRaiseHand = useCallback(() => {
    if (!localUserId) return;
    const emoji = isRaisingHand ? "stop-raise-hand" : "🤚";
    sendReaction(emoji);
  }, [isRaisingHand, localUserId, sendReaction]);

  return { sendReaction, toggleRaiseHand, isRaisingHand };
}
