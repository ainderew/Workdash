import { afterEach, describe, expect, it, vi } from 'vitest';
import { guestSource } from './funnel';

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); window.history.replaceState(null, '', '/'); });
describe('guest funnel privacy', () => {
    it('never forwards arbitrary paths, fragments, identifiers or query strings', () => {
        for (const input of ['/#invite=private', 'person@example.com', '/try?private=1', null, {}, 'hero#private']) expect(guestSource(input)).toBe('direct');
        expect(guestSource('hero')).toBe('hero');
    });
    it('sends only the fixed event and source, once per page, without the invite URL', async () => {
        vi.resetModules();
        window.history.replaceState(null, '', '/try?from=friends&email=private@example.invalid#invite=private');
        const request = vi.fn().mockResolvedValue({ status: 204 });
        vi.stubGlobal('fetch', request);
        const { guestFunnelEvent } = await import('./funnel');
        guestFunnelEvent('entry_viewed'); guestFunnelEvent('entry_viewed');
        expect(request).toHaveBeenCalledTimes(1);
        expect(request.mock.calls[0][0]).toBe('/api/guest');
        expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ action: 'telemetry', event: 'entry_viewed', source: 'friends' });
        expect(sessionStorage.getItem('workdash:guest-source')).toBe('friends');
    });
});
