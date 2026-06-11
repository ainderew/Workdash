import useCallStore from "@/common/store/callStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";

/**
 * One-click lounge entry: optionally navigate to the lounge channel, leave
 * whatever call the user is currently in, then join the live lounge call or
 * start a fresh one. Shared by the sidebar LoungeCard and nudge toasts.
 */
export async function joinLoungeCall(
    loungeChannelId: string,
    options?: { navigate?: boolean },
): Promise<void> {
    if (options?.navigate !== false) {
        void useChatV2Store.getState().selectRoom(loungeChannelId);
    }

    const service = CallSignalingService.getInstance();
    const currentCall = useCallStore.getState().currentCall;
    if (currentCall && currentCall.channelId !== loungeChannelId) {
        await service.leaveCall(currentCall.channelId);
    } else if (currentCall) {
        return;
    }

    const isLive =
        (useCallStore.getState().activeCallsByChannel[loungeChannelId]
            ?.participants.length ?? 0) > 0;
    if (isLive) {
        await service.joinCall(loungeChannelId);
    } else {
        await service.startCall(loungeChannelId);
    }
}
