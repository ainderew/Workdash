/**
 * Returns a compact human label for an offline user's last-seen moment.
 * Examples: "just now", "5m ago", "2h ago", "yesterday", "3d ago", "on Mar 2".
 * Input: epoch ms.
 */
export function formatLastSeen(epochMs: number): string {
    const diffMs = Date.now() - epochMs;
    if (diffMs < 60_000) return "just now";
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    const date = new Date(epochMs);
    return `on ${date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    })}`;
}
