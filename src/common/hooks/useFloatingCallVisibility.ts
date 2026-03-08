import useCallStore from '@/common/store/callStore';
import useChatV2Store from '@/common/store/chatV2Store';
import useUiStore from '@/common/store/uiStore';

/**
 * Determines whether the floating call window should be visible.
 *
 * Visible when:
 * 1. User is in an active call (currentCall !== null)
 * 2. User is NOT currently viewing the call's channel (navigated away)
 * 3. App is in desk mode
 */
export function useFloatingCallVisibility() {
  const currentCall = useCallStore((s) => s.currentCall);
  const currentRoomId = useChatV2Store((s) => s.currentRoomId);
  const interactionMode = useUiStore((s) => s.interactionMode);
  const callPresence = useCallStore((s) =>
    currentCall ? s.activeCallsByChannel[currentCall.channelId] : null,
  );

  const isInCall = currentCall !== null;
  const isViewingCallChannel = currentCall?.channelId === currentRoomId;
  const isDeskMode = interactionMode === 'desk';

  const shouldShow = isInCall && !isViewingCallChannel && isDeskMode;

  return {
    shouldShow,
    channelId: currentCall?.channelId ?? null,
    callPresence,
  };
}
