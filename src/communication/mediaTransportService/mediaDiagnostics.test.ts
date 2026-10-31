import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioDiagnosticSample, observeMediaTransport } from './mediaDiagnostics';

const stats = (lost: number, received: number) => new Map([
    ['candidate', { id: 'candidate', type: 'local-candidate', candidateType: 'relay', address: 'private-address' }],
    ['pair', { id: 'pair', type: 'candidate-pair', state: 'succeeded', nominated: true, localCandidateId: 'candidate', currentRoundTripTime: 0.08 }],
    ['audio', { id: 'audio', type: 'inbound-rtp', kind: 'audio', packetsLost: lost, packetsReceived: received, jitter: 0.01, totalSamplesReceived: 48000 }],
]) as unknown as RTCStatsReport;

describe('privacy-safe media statistics', () => {
    afterEach(() => vi.useRealTimers());
    it('uses interval loss and strips every RTC identifier and address', () => {
        const previous = new Map();
        expect(audioDiagnosticSample(stats(100, 900), previous).lossPercent).toBeUndefined();
        const sample = audioDiagnosticSample(stats(102, 998), previous);
        expect(sample).toEqual({ path: 'relay', rttMs: 80, jitterMs: 10, lossPercent: 2, decoded: true });
        expect(JSON.stringify(sample)).not.toContain('private-address');
        audioDiagnosticSample(new Map() as unknown as RTCStatsReport, previous);
        expect(previous.size).toBe(0);
    });
    it('stops polling on transport closure and never retains reports offline', async () => {
        vi.useFakeTimers(); let closed!: () => void;
        const send = vi.fn();
        const transport = { closed: false, connectionState: 'connected', on: vi.fn(), off: vi.fn(), getStats: vi.fn().mockResolvedValue(stats(0, 100)), observer: { once: vi.fn((_name, callback) => { closed = callback; }) } };
        observeMediaTransport(transport as never, 'recv', send);
        await vi.advanceTimersByTimeAsync(15000);
        expect(send).toHaveBeenCalledTimes(2);
        transport.closed = true; closed();
        await vi.advanceTimersByTimeAsync(30000);
        expect(transport.getStats).toHaveBeenCalledTimes(2);
        expect(vi.getTimerCount()).toBe(0);
    });
});
