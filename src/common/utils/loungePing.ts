import { toast } from "sonner";
import useCallStore from "@/common/store/callStore";
import { usePresenceStore } from "@/common/store/presenceStore";
import useUserStore from "@/common/store/useStore";
import { joinLoungeCall } from "@/communication/callSignaling/loungeCall";
import { isLoungeNudgeSuppressedStatus } from "@/common/utils/loungeNudge";
import { isSnoozed, snoozeUntilMorning } from "@/common/utils/loungePrefs";

export interface LoungePingPayload {
    workspaceId: string;
    loungeChannelId: string;
    byUserId: number;
}

/**
 * Shows the "X is holding the couch" toast for a crew ping, honouring the
 * same suppression rules as automatic nudges (own ping, in a call, focus/DND,
 * snoozed for the night).
 */
export function showLoungePingToast(payload: LoungePingPayload): void {
    const localUserId = useUserStore.getState().backendUser?.id;
    if (localUserId === undefined || payload.byUserId === localUserId) return;
    if (useCallStore.getState().currentCall !== null) return;
    if (
        isLoungeNudgeSuppressedStatus(
            usePresenceStore.getState().myStatus.statusId,
        )
    ) {
        return;
    }
    if (isSnoozed(new Date())) return;

    const pinger = useCallStore
        .getState()
        .activeCallsByChannel[payload.loungeChannelId]?.participants.find(
            (p) => p.userId === payload.byUserId,
        );
    const name = pinger?.displayName ?? "A friend";

    toast(`${name} is holding the couch`, {
        description: "Come hang out in the lounge?",
        duration: 15_000,
        action: {
            label: "Join",
            onClick: () => void joinLoungeCall(payload.loungeChannelId),
        },
        cancel: {
            label: "Not tonight",
            onClick: () => snoozeUntilMorning(new Date()),
        },
    });
}
