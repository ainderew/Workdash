import { useEffect, useRef } from 'react';
import useCallStore from '@/common/store/callStore';
import useUiStore from '@/common/store/uiStore';
import { AudioChat } from '@/communication/audioChat/audioChat';

/**
 * World proximity voice exists only in world mode, outside any call.
 *
 * - Leaving that state (switch to desk, a call starts, another tab takes a
 *   call) releases the world mic and stops zone voices.
 * - Returning to it (back to world, the call ends) resumes hearing the zone.
 *   The mic stays off until the user unmutes.
 *
 * Mount once, after services are initialized.
 */
export function useWorldVoice() {
  const isWorldMode = useUiStore((s) => s.interactionMode === 'world');
  const inCall = useCallStore(
    (s) => s.currentCall !== null || s.callOwnershipStatus !== null,
  );
  const allowed = isWorldMode && !inCall;
  const wasAllowed = useRef(allowed);

  useEffect(() => {
    if (wasAllowed.current === allowed) return;
    wasAllowed.current = allowed;

    const audio = AudioChat.getInstance();
    if (allowed) {
      void audio.resumeWorldVoice();
    } else {
      audio.stopWorldVoice();
    }
  }, [allowed]);
}
