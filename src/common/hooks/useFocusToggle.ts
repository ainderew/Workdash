import { useCallback } from 'react';
import { AudioChat } from '@/communication/audioChat/audioChat';
import { CallSignalingService } from '@/communication/callSignaling/callSignalingService';
import useFocusStore from '@/common/store/focusStore';
import usePlayersStore from '@/common/store/playerStore';
import useCallStore from '@/common/store/callStore';
import useUiStore from '@/common/store/uiStore';
import { AvailabilityStatus } from '@/game/player/_enums';
import { logger } from '@/common/utils/logger';

export function useFocusToggle() {
  const isInFocusMode = useFocusStore((s) => s.localFocusMode);

  const toggleFocusMode = useCallback(async () => {
    try {
      const audioChat = AudioChat.getInstance();
      const next = !isInFocusMode;

      if (next) {
        audioChat.enableFocusMode();
      } else {
        await audioChat.disableFocusMode();
      }

      // Update stores before emitting so observers see consistent state
      useFocusStore.getState().setLocalFocusMode(next);
      useUiStore.getState().setIsMuted(audioChat.isMuted);

      audioChat.emitFocusModeChange();

      // Notify call signaling if in an active call
      const call = useCallStore.getState().currentCall;
      if (call) {
        CallSignalingService.getInstance().setMedia(call.channelId, {
          audio: !audioChat.isMuted,
        });
      }

      // Update Phaser player if it exists (no-op in desk mode)
      const { localPlayerId, playerMap } = usePlayersStore.getState();
      const player = localPlayerId ? playerMap[localPlayerId] : null;
      if (player) {
        player.changePlayerAvailabilityStatus(
          next ? AvailabilityStatus.FOCUS : AvailabilityStatus.ONLINE,
        );
      }
    } catch (err) {
      logger.error('Failed to toggle focus mode:', err);
    }
  }, [isInFocusMode]);

  return { isInFocusMode, toggleFocusMode };
}
