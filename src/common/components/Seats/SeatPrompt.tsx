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
 * you're seated. On touch screens it sits bottom-right, under the right thumb,
 * clear of the joystick on the left.
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
            className="fixed left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-2rem)] bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] lg:bottom-[calc(var(--ui-controls-height)+1.75rem)] pointer-coarse:left-auto pointer-coarse:right-4 pointer-coarse:translate-x-0 pointer-coarse:max-w-[calc(100vw-10.5rem)] pointer-coarse:flex-wrap pointer-coarse:gap-y-1.5 z-[45] flex items-center gap-2.5 rounded-xl border wd-border-subtle wd-bg-panel-2 px-2.5 py-2 shadow-lg"
        >
            <button
                type="button"
                disabled={taken}
                onClick={(event) => {
                    EventBus.emit(SEAT_TOGGLE_EVENT);
                    event.currentTarget.blur(); // keep keys going to the game
                }}
                className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md pointer-coarse:grow px-2.5 py-1 text-xs font-semibold transition-colors pointer-coarse:min-h-10 pointer-coarse:px-4 pointer-coarse:text-sm ${
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
                    <kbd className="pointer-coarse:hidden rounded border border-current/30 px-1 font-mono text-[10px] leading-4 opacity-80">
                        E
                    </kbd>
                )}
            </button>
            {taken && <span className="pr-1 text-xs wd-text-muted pointer-coarse:basis-full pointer-coarse:px-1 pointer-coarse:text-center">{prompt.occupant} is sitting here</span>}
            {seated && <span className="pr-1 text-[11px] wd-text-muted pointer-coarse:hidden">or move to stand</span>}
        </div>
    );
}
