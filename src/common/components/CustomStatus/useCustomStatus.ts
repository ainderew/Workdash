import { usePresenceStore } from '@/common/store/presenceStore';
import type { CustomStatus } from '@/common/store/presenceStore';

/**
 * Reads a single user's custom status. Returns null when unset — callers
 * should render nothing rather than reserving layout space.
 */
export function useCustomStatus(userId: number): CustomStatus | null {
    return usePresenceStore((s) => s.customStatusMap[userId] ?? null);
}

/** Human-readable form used for tooltips and accessible labels. */
export function formatCustomStatus(status: CustomStatus): string {
    return [status.emoji, status.text].filter(Boolean).join(' ');
}
