import { useEffect, useRef } from "react";
import useCallStore from "@/common/store/callStore";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";

/**
 * Keeps the cross-workspace call indicator state in sync with the user's
 * current workspace membership.
 *
 *   - Pushes the latest workspace IDs into CallSignalingService so the
 *     service can re-fetch on socket reconnect.
 *   - Triggers a bulk snapshot fetch whenever the list changes.
 *   - Drops callStore entries for workspaces the user no longer belongs to
 *     — server emissions stop for those rooms, so without explicit cleanup
 *     a stale badge would linger until logout.
 *
 * Caller is responsible for passing a referentially-stable array (e.g.
 * derived via useMemo from a Zustand selector).
 */
export function useWorkspaceCallSync(workspaceIds: string[]): void {
    const previousWorkspaceIdsRef = useRef<string[]>([]);

    useEffect(() => {
        const service = CallSignalingService.getInstance();
        service.setKnownWorkspaceIds(workspaceIds);

        const current = new Set(workspaceIds);
        const removed = previousWorkspaceIdsRef.current.filter(
            (id) => !current.has(id),
        );
        for (const wsId of removed) {
            useCallStore.getState().clearWorkspaceCallActivity(wsId);
        }
        previousWorkspaceIdsRef.current = workspaceIds;

        if (workspaceIds.length === 0) return;
        void service.fetchActiveCallsForWorkspaces(workspaceIds);
    }, [workspaceIds]);
}
