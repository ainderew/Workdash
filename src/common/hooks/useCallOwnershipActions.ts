import { useState } from "react";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";
import useCallStore from "@/common/store/callStore";
import { logger } from "@/common/utils/logger";

export function useCallOwnershipActions(channelId: string) {
  const [isTransferring, setIsTransferring] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);

  const handleTakeOver = async () => {
    if (isTransferring) return;
    setIsTransferring(true);
    try {
      const result = await CallSignalingService.getInstance().transferCallToThisTab(channelId);
      if (!result.success) {
        useCallStore.getState().clearCallOwnership();
      }
    } catch (err) {
      logger.error("Failed to transfer call:", err);
      useCallStore.getState().clearCallOwnership();
    } finally {
      setIsTransferring(false);
    }
  };

  const handleRejoin = async () => {
    if (isRejoining) return;
    setIsRejoining(true);
    try {
      const result = await CallSignalingService.getInstance().rejoinCall(channelId);
      if (!result.success) {
        useCallStore.getState().clearCallOwnership();
      }
    } catch (err) {
      logger.error("Failed to rejoin call:", err);
      useCallStore.getState().clearCallOwnership();
    } finally {
      setIsRejoining(false);
    }
  };

  return { handleTakeOver, handleRejoin, isTransferring, isRejoining };
}
