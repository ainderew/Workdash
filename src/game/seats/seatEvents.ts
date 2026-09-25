/** What the React seat prompt shows for the local player. */
export type SeatPrompt =
    | { state: "free"; seatId: string }
    | { state: "taken"; seatId: string; occupant: string }
    | { state: "seated"; seatId: string }
    | null;

/** EventBus: game -> React, the current prompt. */
export const SEAT_PROMPT_EVENT = "seat-prompt";
/** EventBus: React -> game, sit on the offered seat or stand up. */
export const SEAT_TOGGLE_EVENT = "seat-toggle";
