import { useEffect } from "react";
import { toast } from "sonner";
import useCallStore from "@/common/store/callStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { usePresenceStore } from "@/common/store/presenceStore";
import useUserStore from "@/common/store/useStore";
import useWorkspaceStore from "@/common/store/workspaceStore";
import { joinLoungeCall } from "@/communication/callSignaling/loungeCall";
import { decideLoungeNudge } from "@/common/utils/loungeNudge";
import {
    areNudgesEnabled,
    getLastLiveNudgeCallStart,
    getLastQuorumNightKey,
    getLoungeHours,
    isSnoozed,
    isWithinLoungeHours,
    nightKeyFor,
    setLastLiveNudgeCallStart,
    setLastQuorumNightKey,
    snoozeUntilMorning,
} from "@/common/utils/loungePrefs";

const NUDGE_TOAST_DURATION_MS = 15_000;

const formatOccupants = (names: string[]): string => {
    if (names.length === 0) return "Someone is";
    if (names.length === 1) return `${names[0]} is`;
    if (names.length === 2) return `${names[0]} & ${names[1]} are`;
    return `${names[0]}, ${names[1]} +${names.length - 2} are`;
};

/**
 * Watches presence and lounge call state for the selected workspace and
 * surfaces at most one toast at a time: a live-call nudge (any hour, once per
 * call) or a quorum nudge (inside lounge hours, once per night).
 */
export function useLoungeNudges(): void {
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const loungeChannelId = useWorkspaceStore(
        (s) =>
            s.workspaces.find((ws) => ws.id === selectedWorkspaceId)
                ?.loungeChannelId ?? null,
    );
    const localUserId = useUserStore((s) => s.backendUser?.id);

    const call = useCallStore((s) =>
        loungeChannelId ? s.activeCallsByChannel[loungeChannelId] : undefined,
    );
    const isInAnyCall = useCallStore((s) => s.currentCall !== null);
    const myStatusId = usePresenceStore((s) => s.myStatus.statusId);
    const onlineCount = usePresenceStore((s) => {
        let count = 0;
        for (const [uid, presence] of Object.entries(s.presenceMap)) {
            if (Number(uid) === localUserId) continue;
            if (presence && presence.statusId !== "offline") count += 1;
        }
        return count;
    });

    const participantCount = call?.participants.length ?? 0;
    const callStartedAt = call?.startedAt ?? null;
    const amInLoungeCall =
        localUserId !== undefined &&
        (call?.participants.some((p) => p.userId === localUserId) ?? false);

    useEffect(() => {
        if (!loungeChannelId || localUserId === undefined) return;
        if (amInLoungeCall) return;

        const now = new Date();
        const decision = decideLoungeNudge({
            nudgesEnabled: areNudgesEnabled(),
            isInAnyCall,
            myStatusId,
            isSnoozed: isSnoozed(now),
            liveParticipantCount: participantCount,
            callStartedAt,
            lastLiveNudgeCallStart: getLastLiveNudgeCallStart(),
            onlineCount,
            withinLoungeHours: isWithinLoungeHours(now, getLoungeHours()),
            currentNightKey: nightKeyFor(now),
            lastQuorumNightKey: getLastQuorumNightKey(),
        });
        if (!decision) return;

        if (decision === "live" && callStartedAt) {
            setLastLiveNudgeCallStart(callStartedAt);
            const names =
                useCallStore
                    .getState()
                    .activeCallsByChannel[loungeChannelId]?.participants.map(
                        (p) => p.displayName,
                    ) ?? [];
            toast(`${formatOccupants(names)} in the lounge`, {
                description: "The couch has room.",
                duration: NUDGE_TOAST_DURATION_MS,
                action: {
                    label: "Join",
                    onClick: () => void joinLoungeCall(loungeChannelId),
                },
                cancel: {
                    label: "Not tonight",
                    onClick: () => snoozeUntilMorning(new Date()),
                },
            });
            return;
        }

        if (decision === "quorum") {
            setLastQuorumNightKey(nightKeyFor(now));
            toast(
                `${onlineCount} ${onlineCount === 1 ? "friend is" : "friends are"} online`,
                {
                    description: "Open the lounge?",
                    duration: NUDGE_TOAST_DURATION_MS,
                    action: {
                        label: "Start call",
                        onClick: () => void joinLoungeCall(loungeChannelId),
                    },
                    cancel: {
                        label: "Not tonight",
                        onClick: () => snoozeUntilMorning(new Date()),
                    },
                },
            );
        }
    }, [
        loungeChannelId,
        localUserId,
        amInLoungeCall,
        isInAnyCall,
        myStatusId,
        participantCount,
        callStartedAt,
        onlineCount,
    ]);
}
