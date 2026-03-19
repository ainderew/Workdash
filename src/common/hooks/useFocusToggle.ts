import { useCallback } from 'react';
import { AudioChat } from '@/communication/audioChat/audioChat';
import useFocusStore from '@/common/store/focusStore';
import usePlayersStore from '@/common/store/playerStore';
import { AvailabilityStatus } from '@/game/player/_enums';

export function useFocusToggle() {
  const isInFocusMode = useFocusStore((s) => s.localFocusMode);

  const toggleFocusMode = useCallback(() => {
    const audioChat = AudioChat.getInstance();
    const next = !isInFocusMode;

    if (next) {
      audioChat.enableFocusMode();
    } else {
      audioChat.disableFocusMode();
    }
    audioChat.emitFocusModeChange();

    useFocusStore.getState().setLocalFocusMode(next);

    // Update Phaser player if it exists (no-op in desk mode)
    const { localPlayerId, playerMap } = usePlayersStore.getState();
    const player = localPlayerId ? playerMap[localPlayerId] : null;
    if (player) {
      player.changePlayerAvailabilityStatus(
        next ? AvailabilityStatus.FOCUS : AvailabilityStatus.ONLINE,
      );
    }
  }, [isInFocusMode]);

  return { isInFocusMode, toggleFocusMode };
}
