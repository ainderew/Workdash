const COOLDOWN_MS = 30_000;

/** roomId → timestamp when cooldown ends */
const cooldownEndByRoom = new Map<string, number>();
const listeners = new Set<() => void>();

export function setEveryoneCooldown(roomId: string): void {
  cooldownEndByRoom.set(roomId, Date.now() + COOLDOWN_MS);
  listeners.forEach((cb) => cb());
}

export function getEveryoneCooldownRemaining(roomId: string): number {
  const end = cooldownEndByRoom.get(roomId);
  if (!end) return 0;
  const remaining = Math.ceil((end - Date.now()) / 1000);
  if (remaining <= 0) {
    cooldownEndByRoom.delete(roomId);
    return 0;
  }
  return remaining;
}

export function subscribeEveryoneCooldown(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
