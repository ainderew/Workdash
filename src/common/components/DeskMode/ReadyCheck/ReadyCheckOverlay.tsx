import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useReadyCheckStore, {
    selectActiveParticipantCheck,
    selectSnapshotByCheckId,
} from "@/common/store/readyCheckStore";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { ReadyCheckClientService } from "@/communication/readyCheck/readyCheckService";
import { playLockedInChime } from "@/communication/readyCheck/readyCheckSound";
import { useReadyCheckCountdown } from "./useReadyCheckCountdown";
import SummoningStage from "./SummoningStage";
import type { RitualPhase } from "./_ritual";
import type { ChatV2CharacterCustomization } from "@/communication/chatV2/_types";

/**
 * Drives the ready-check "summoning ritual". Unlike the old modal, the overlay
 * stays mounted for every participant (invoker or target) through the whole
 * fill, so each person watches the hearth light up seat by seat and sees the
 * locked-in climax — then it auto-dismisses.
 */
function ReadyCheckOverlay() {
    const localUserId = useUserStore((s) => s.backendUser?.id);

    const candidate = useReadyCheckStore((s) =>
        selectActiveParticipantCheck(s, localUserId),
    );

    const [engagedId, setEngagedId] = useState<string | null>(null);
    const [phase, setPhase] = useState<RitualPhase>("gathering");
    const dismissedRef = useRef<Set<string>>(new Set());
    const wrapperRef = useRef<HTMLDivElement>(null);

    const snapshot = useReadyCheckStore((s) =>
        selectSnapshotByCheckId(s, engagedId),
    );
    const localResponse = useReadyCheckStore((s) =>
        engagedId ? s.localResponseByCheckId[engagedId] : undefined,
    );
    const members = useChatV2Store((s) =>
        snapshot ? s.membersByRoomId[snapshot.channelId] : undefined,
    );

    const remaining = useReadyCheckCountdown(
        snapshot && !snapshot.resolved ? snapshot.expiresAt : null,
    );

    const closeRitual = () => {
        if (engagedId) dismissedRef.current.add(engagedId);
        setEngagedId(null);
        setPhase("gathering");
    };

    // Engage when a fresh check the local user takes part in appears.
    useEffect(() => {
        const id = candidate?.checkId;
        if (id && id !== engagedId && !dismissedRef.current.has(id)) {
            setEngagedId(id);
            setPhase("gathering");
        }
    }, [candidate?.checkId, engagedId]);

    // Resolution → ignite (all in) or fade (timeout/cancel), then auto-close.
    useEffect(() => {
        if (!snapshot?.resolved || phase !== "gathering") return;
        if (snapshot.resolvedReason === "all-responded") {
            setPhase("igniting");
            playLockedInChime();
            const t = setTimeout(closeRitual, 2400);
            return () => clearTimeout(t);
        }
        setPhase("exiting");
        const t = setTimeout(closeRitual, 1100);
        return () => clearTimeout(t);
    }, [snapshot, phase]);

    // Focus the primary action when the ritual opens.
    useEffect(() => {
        if (!engagedId) return;
        const el = wrapperRef.current?.querySelector<HTMLButtonElement>(
            "[data-autofocus]",
        );
        el?.focus();
    }, [engagedId]);

    const avatarById = useMemo(() => {
        const map = new Map<
            number,
            {
                image?: string | null;
                characterCustomization?: ChatV2CharacterCustomization | null;
            }
        >();
        members?.forEach((m) =>
            map.set(m.userId, {
                image: m.user.image,
                characterCustomization: m.user.characterCustomization,
            }),
        );
        return map;
    }, [members]);

    const localTarget = snapshot?.targets.find((t) => t.userId === localUserId);
    const isPendingLocal =
        localTarget?.state === "pending" &&
        !snapshot?.resolved &&
        localResponse === undefined;

    const handleRespond = (ready: boolean) => {
        if (!snapshot) return;
        void ReadyCheckClientService.getInstance().respond(snapshot.checkId, ready);
    };
    const handleCancel = () => {
        if (!snapshot) return;
        void ReadyCheckClientService.getInstance().cancel(snapshot.checkId);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            if (isPendingLocal) handleRespond(false);
            else closeRitual();
        }
    };

    // AnimatePresence stays mounted so the backdrop can fade out on close.
    return (
        <AnimatePresence>
            {engagedId && snapshot && (
                <motion.div
                    key="ready-check-ritual"
                    ref={wrapperRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ready-check-title"
                    onKeyDown={handleKeyDown}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="wd-summon-backdrop fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-md"
                >
                    <SummoningStage
                        snapshot={snapshot}
                        localUserId={localUserId}
                        avatarById={avatarById}
                        phase={phase}
                        remaining={remaining}
                        hasLocalResponse={localResponse !== undefined}
                        onRespond={handleRespond}
                        onCancel={handleCancel}
                        onDismiss={closeRitual}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ReadyCheckOverlay;
