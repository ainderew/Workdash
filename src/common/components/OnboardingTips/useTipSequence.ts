import { useCallback, useEffect, useRef, useState } from "react";
import useUiStore, { type InteractionMode } from "@/common/store/uiStore";
import { EventBus } from "@/game/EventBus";
import { SEAT_PROMPT_EVENT, type SeatPrompt } from "@/game/seats/seatEvents";
import { DESK_SETTLE_MS } from "./constants";
import { markTipSeen, readSeenTips, type SeenTips } from "./tipStorage";
import { waitForFirstSteps } from "./waitForFirstSteps";
import type { TipId } from "./_types";

function nextTip(mode: InteractionMode, seen: SeenTips): TipId | null {
    if (mode === "desk") return seen.world ? null : "world";
    if (!seen.chat) return "chat";
    if (!seen.desk) return "desk";
    return null;
}

/**
 * Decides which first-run tip is showing. In the world: chat first, then desk
 * mode on a later walk. In desk mode: the way back. A tip retires for good when
 * it is dismissed or when the user does the thing it teaches on their own.
 */
export function useTipSequence() {
    const mode = useUiStore((s) => s.interactionMode);
    const modeSwitchCount = useUiStore((s) => s.modeSwitchCount);
    const isChatOpen = useUiStore((s) => s.isChatWindowOpen);
    const isWorldPanelOpen = useUiStore(
        (s) => s.isChatWindowOpen || s.isMembersUiOpen || s.isCalendarUiOpen,
    );
    const isBusy = useUiStore(
        (s) =>
            s.isCommandPaletteOpen ||
            s.isCharacterCustomizationOpen ||
            s.showWorkspaceSelector ||
            s.isAchievementsModalOpen ||
            s.isSoccerStatsModalOpen ||
            s.isSoccerGameControlModalOpen ||
            s.isMatchHistoryModalOpen,
    );
    const [seen, setSeen] = useState<SeenTips>(readSeenTips);
    const [readyTip, setReadyTip] = useState<TipId | null>(null);
    const [isSeatPromptUp, setIsSeatPromptUp] = useState(false);

    // The seat prompt sits where a world tip's card would, so a tip waits
    // until the player has walked away from the chair (or stood up).
    useEffect(() => {
        const onPrompt = (prompt: SeatPrompt) => setIsSeatPromptUp(prompt !== null);
        EventBus.on(SEAT_PROMPT_EVENT, onPrompt);
        return () => {
            EventBus.off(SEAT_PROMPT_EVENT, onPrompt);
        };
    }, []);

    const retire = useCallback((id: TipId) => setSeen(markTipSeen(id)), []);

    useEffect(() => {
        if (isChatOpen) retire("chat");
    }, [isChatOpen, retire]);

    const handledSwitches = useRef(modeSwitchCount);
    useEffect(() => {
        if (modeSwitchCount === handledSwitches.current) return;
        handledSwitches.current = modeSwitchCount;
        retire(mode === "desk" ? "desk" : "world");
    }, [modeSwitchCount, mode, retire]);

    const candidate = nextTip(mode, seen);
    const isHeld = isBusy || (mode === "world" && isWorldPanelOpen);

    // Readiness only builds while nothing is in the way, so closing a panel
    // never makes a tip pop straight up; it waits for the next walk.
    useEffect(() => {
        if (!candidate || isHeld) return;
        const markReady = () => setReadyTip(candidate);
        let cancel: () => void;
        if (mode === "desk") {
            const timer = window.setTimeout(markReady, DESK_SETTLE_MS);
            cancel = () => window.clearTimeout(timer);
        } else {
            cancel = waitForFirstSteps(markReady);
        }
        return () => {
            cancel();
            setReadyTip(null);
        };
    }, [candidate, mode, isHeld]);

    // Unlike a panel, the seat prompt only hides a ready tip; walking past a
    // chair shouldn't restart the wait.
    const isHidden = isHeld || (mode === "world" && isSeatPromptUp);
    const activeTip =
        candidate && readyTip === candidate && !isHidden ? candidate : null;

    const dismiss = useCallback(() => {
        if (activeTip) retire(activeTip);
    }, [activeTip, retire]);

    return { activeTip, dismiss };
}
