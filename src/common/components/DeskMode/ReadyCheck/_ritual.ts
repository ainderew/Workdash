import type {
  ReadyCheckResolvedReason,
  ReadyCheckResponseState,
} from "@/communication/readyCheck/_types";

/** Drives the overlay's mount lifecycle through the fill and climax. */
export type RitualPhase = "gathering" | "igniting" | "exiting";

export interface SeatPosition {
  /** px offset from the ring centre */
  x: number;
  y: number;
}

/**
 * Evenly place `count` seats on a circle of `radius` (px), first seat at the
 * top and proceeding clockwise. Small lobbies (≤ 8) read as a clean campfire
 * circle; the caller falls back to a wrapped grid above that.
 */
export function seatPositions(count: number, radius: number): SeatPosition[] {
  if (count <= 0) return [];
  const out: SeatPosition[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (-90 + (i * 360) / count) * (Math.PI / 180);
    out.push({
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    });
  }
  return out;
}

/** Max seats that still read as a circle; above this we grid-wrap. */
export const RING_SEAT_LIMIT = 8;

/** Visual treatment per response state — colour token + label. */
export const SEAT_STATE: Record<
  ReadyCheckResponseState,
  { token: string; label: string }
> = {
  ready: { token: "var(--wd-success)", label: "In" },
  "not-ready": { token: "var(--wd-danger)", label: "Out" },
  focused: { token: "var(--wd-warning)", label: "Heads down" },
  pending: { token: "var(--wd-text-muted)", label: "Waiting" },
};

export function titleFor(invokerName: string, isInvoker: boolean): string {
  return isInvoker ? "Calling the squad in" : `${invokerName} is calling everyone in`;
}

export function resolutionCopy(reason: ReadyCheckResolvedReason | null): {
  heading: string;
  locked: boolean;
} {
  switch (reason) {
    case "all-responded":
      return { heading: "Locked in", locked: true };
    case "timeout":
      return { heading: "Timed out", locked: false };
    case "cancelled":
      return { heading: "Called off", locked: false };
    case "call-ended":
      return { heading: "Call ended", locked: false };
    default:
      return { heading: "", locked: false };
  }
}
