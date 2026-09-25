import React, { useEffect, useState } from "react";
import { Armchair } from "lucide-react";
import { EventBus } from "@/game/EventBus";
import {
    SEAT_PROMPT_EVENT,
    SEAT_TOGGLE_EVENT,
    type SeatPrompt as SeatPromptState,
} from "@/game/seats/seatEvents";

/**
 * Floats above the world controls when you're next to a seat: "Sit" (E),
 * greyed out with who's sitting there when it's taken, or "Stand up" while
 * you're seated.
 */
export default function SeatPrompt() {
    const [prompt, setPrompt] = useState<SeatPromptState>(null);

    useEffect(() => {
        const onPrompt = (next: SeatPromptState) => setPrompt(next);
        EventBus.on(SEAT_PROMPT_EVENT, onPrompt);
        return () => {
            EventBus.off(SEAT_PROMPT_EVENT, onPrompt);
        };
    }, []);

    if (!prompt) return null;
    const taken = prompt.state === "taken";
    const seated = prompt.state === "seated";

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 -translate-x-1/2 bottom-[calc(var(--ui-controls-height)+1.75rem)] z-[45] flex items-center gap-2.5 rounded-xl border wd-border-subtle wd-bg-panel-2 px-2.5 py-2 shadow-lg"
        >
            <button
                type="button"
                disabled={taken}
                onClick={(event) => {
                    EventBus.emit(SEAT_TOGGLE_EVENT);
                    event.currentTarget.blur(); // keep keys going to the game
                }}
                className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    taken
                        ? "cursor-not-allowed bg-[var(--wd-surface-elevated)] wd-text-muted opacity-60"
                        : seated
                          ? "bg-[var(--wd-surface-elevated)] wd-text-primary hover:bg-[var(--wd-surface-overlay)]"
                          : "bg-[var(--wd-accent)] text-white hover:bg-[var(--wd-accent-hover)]"
                }`}
            >
                <Armchair size={14} aria-hidden="true" />
                {taken ? "Seat taken" : seated ? "Stand up" : "Sit"}
                {!taken && (
                    <kbd className="rounded border border-current/30 px-1 font-mono text-[10px] leading-4 opacity-80">
                        E
                    </kbd>
                )}
            </button>
            {taken && <span className="pr-1 text-xs wd-text-muted">{prompt.occupant} is sitting here</span>}
            {seated && <span className="pr-1 text-[11px] wd-text-muted">or move to stand</span>}
        </div>
    );
}
