export type LoungeNudgeKind = "live" | "quorum";

export interface LoungeNudgeInput {
    nudgesEnabled: boolean;
    isInAnyCall: boolean;
    myStatusId: string;
    isSnoozed: boolean;
    liveParticipantCount: number;
    callStartedAt: string | null;
    lastLiveNudgeCallStart: string | null;
    onlineCount: number;
    withinLoungeHours: boolean;
    currentNightKey: string;
    lastQuorumNightKey: string | null;
}

/** Statuses where the user has signalled "do not interrupt me". */
const SUPPRESSED_STATUS_IDS = new Set(["focus", "dnd", "do-not-disturb"]);

export function isLoungeNudgeSuppressedStatus(statusId: string): boolean {
    return SUPPRESSED_STATUS_IDS.has(statusId);
}

/**
 * Pure nudge policy. The live-call nudge fires once per call (keyed by
 * startedAt) at any hour; the quorum nudge fires at most once per night and
 * only inside lounge hours. Both stay quiet while the user is in a call,
 * focused, or snoozed for the night.
 */
export function decideLoungeNudge(
    input: LoungeNudgeInput,
): LoungeNudgeKind | null {
    if (!input.nudgesEnabled) return null;
    if (input.isInAnyCall) return null;
    if (SUPPRESSED_STATUS_IDS.has(input.myStatusId)) return null;
    if (input.isSnoozed) return null;

    if (input.liveParticipantCount > 0) {
        if (
            input.callStartedAt &&
            input.callStartedAt !== input.lastLiveNudgeCallStart
        ) {
            return "live";
        }
        return null;
    }

    if (
        input.onlineCount >= 2 &&
        input.withinLoungeHours &&
        input.currentNightKey !== input.lastQuorumNightKey
    ) {
        return "quorum";
    }

    return null;
}
