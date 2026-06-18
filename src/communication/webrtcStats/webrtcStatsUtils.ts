import type { ConnectionQuality } from '@/common/store/callStore';

/**
 * Pure, deterministic helpers behind the connection-quality indicators.
 * Extracted from the polling service so the decision logic can be unit-tested
 * without WebRTC, timers, or the store.
 */

export const QUALITY_RANK: Record<ConnectionQuality, number> = {
  unknown: -1,
  good: 0,
  fair: 1,
  poor: 2,
};

/** Keep the worse of two qualities (a peer/call = its weakest stream). */
export function worseQuality(
  a: ConnectionQuality | undefined,
  b: ConnectionQuality,
): ConnectionQuality {
  if (!a) return b;
  return QUALITY_RANK[b] > QUALITY_RANK[a] ? b : a;
}

/** Percentage of packets lost over an interval. 0 when nothing was expected. */
export function lossPercent(deltaLost: number, deltaReceived: number): number {
  const total = deltaLost + deltaReceived;
  if (total <= 0) return 0;
  return (deltaLost / total) * 100;
}

/**
 * Classify one stream from its round-trip time and loss. Thresholds are the
 * historical aggregate thresholds, so a video-only stream with no audio loss
 * keeps its previous rating (no behavior change for the common case).
 */
export function classifyQuality(
  rttMs: number,
  lossPercentValue: number,
): ConnectionQuality {
  if (rttMs < 150 && lossPercentValue < 2) return 'good';
  if (rttMs < 300 && lossPercentValue < 5) return 'fair';
  return 'poor';
}
