import type { Transport } from 'mediasoup-client/types';

type Direction = 'send' | 'recv';
export type MediaDiagnostic = {
    event: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'quality' | 'audio_received' | 'microphone_denied' | 'microphone_unavailable' | 'playback_blocked' | 'allocation_refused' | 'media_error';
    direction: Direction;
    elapsedMs?: number;
    rttMs?: number;
    jitterMs?: number;
    lossPercent?: number;
    path?: 'direct' | 'relay' | 'unknown';
};
type Counter = { lost: number; received: number };
const bounded = (n: unknown, max: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : undefined;

/** Reduces RTC statistics locally. No address, candidate, track or participant ID leaves this function. */
export function audioDiagnosticSample(stats: RTCStatsReport, previous: Map<string, Counter>) {
    let lost = 0; let received = 0; let decoded = false;
    let rttMs: number | undefined; let jitterMs: number | undefined;
    let path: MediaDiagnostic['path'] = 'unknown';
    const seen = new Set<string>();
    for (const entry of stats.values()) {
        if (entry.type === 'candidate-pair' && entry.state === 'succeeded' && entry.nominated) {
            rttMs = bounded(entry.currentRoundTripTime * 1000, 10000);
            const local = stats.get(entry.localCandidateId);
            if (local) path = local.candidateType === 'relay' ? 'relay' : 'direct';
        }
        if (entry.type !== 'inbound-rtp' || (entry.kind ?? entry.mediaType) !== 'audio') continue;
        seen.add(entry.id);
        const current = { lost: Math.max(0, entry.packetsLost ?? 0), received: Math.max(0, entry.packetsReceived ?? 0) };
        const prev = previous.get(entry.id);
        if (prev) {
            lost += Math.max(0, current.lost - prev.lost);
            received += Math.max(0, current.received - prev.received);
        }
        previous.set(entry.id, current);
        decoded ||= (entry.totalSamplesReceived ?? 0) > 0;
        const jitter = bounded(entry.jitter * 1000, 10000);
        if (jitter !== undefined) jitterMs = Math.max(jitterMs ?? 0, jitter);
    }
    for (const id of previous.keys()) if (!seen.has(id)) previous.delete(id);
    return { path, rttMs, jitterMs, lossPercent: lost + received > 0 ? bounded(100 * lost / (lost + received), 100) : undefined, decoded };
}

/** Observes the real account/guest transports without changing their media behavior. */
export function observeMediaTransport(transport: Transport, direction: Direction, send: (report: MediaDiagnostic) => void) {
    let started: number | undefined; let receivedAudio = false; let busy = false; let nextQuality = performance.now() + 15000;
    const previous = new Map<string, Counter>();
    const report = (value: MediaDiagnostic) => {
        try { if (!transport.closed) send(value); } catch { /* Keep diagnostics out of the call control path. */ }
    };
    const stateChanged = (state: string) => {
        if (state === 'connecting') { started = performance.now(); report({ event: 'connecting', direction }); }
        if (state === 'connected') report({ event: 'connected', direction, ...(started !== undefined ? { elapsedMs: bounded(performance.now() - started, 120000) } : {}) });
        if (state === 'failed' || state === 'disconnected') report({ event: state, direction });
    };
    transport.on('connectionstatechange', stateChanged);
    const timer = setInterval(() => {
        if (busy || transport.closed || transport.connectionState !== 'connected') return;
        const qualityDue = performance.now() >= nextQuality;
        if (!qualityDue && (direction !== 'recv' || receivedAudio)) return;
        busy = true;
        void transport.getStats().then(stats => {
            const { decoded, ...sample } = audioDiagnosticSample(stats, previous);
            if (qualityDue) { nextQuality = performance.now() + 15000; report({ event: 'quality', direction, ...sample }); }
            if (decoded && !receivedAudio) { receivedAudio = true; report({ event: 'audio_received', direction, path: sample.path, ...(started !== undefined ? { elapsedMs: bounded(performance.now() - started, 120000) } : {}) }); }
        }).catch(() => { /* Diagnostics must never disrupt a call. */ }).finally(() => { busy = false; });
    }, 1000);
    const cleanup = () => { clearInterval(timer); previous.clear(); transport.off('connectionstatechange', stateChanged); };
    transport.observer.once('close', cleanup);
    return cleanup;
}
