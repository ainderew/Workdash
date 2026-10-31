import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('next-auth/next', () => ({ getServerSession: getSession }));
vi.mock('../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }));
import handler from '../../pages/api/guest/index';
function request(body: unknown, extras = {}) {
    return { method: 'POST', headers: { origin: 'http://localhost:8084', 'x-guest-request': '1', 'content-type': 'application/json' }, cookies: { 'wd-guest': 'a'.repeat(43) }, socket: { remoteAddress: '127.0.0.1' }, body, ...extras } as unknown as NextApiRequest;
}
function response() {
    const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), end: vi.fn() };
    res.status.mockReturnValue(res); res.json.mockReturnValue(res); res.end.mockReturnValue(res);
    return res as unknown as NextApiResponse & typeof res;
}
beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('NEXTAUTH_URL', 'http://localhost:8084'); vi.stubEnv('GUEST_INTERNAL_URL', 'http://127.0.0.1:4000/internal/guest'); vi.stubEnv('GUEST_PROXY_SECRET', 'p'.repeat(32));
    getSession.mockReset(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, headers: new Headers(), json: async () => ({ ok: true }) }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('guest same-origin proxy boundary', () => {
    it('rejects cross-origin posts before contacting guest storage', async () => {
        const res = response(); await handler(request({ action: 'bootstrap' }, { headers: { origin: 'https://evil.example', 'x-guest-request': '1', 'content-type': 'application/json' } }), res);
        expect(res.status).toHaveBeenCalledWith(403); expect(fetch).not.toHaveBeenCalled();
    });
    it('requires a valid HttpOnly guest cookie for commands', async () => {
        const res = response(); await handler(request({ command: { action: 'create' } }, { cookies: {} }), res);
        expect(res.status).toHaveBeenCalledWith(401); expect(fetch).not.toHaveBeenCalled();
    });
    it('bootstraps a cookie without returning its credential to JavaScript', async () => {
        const res = response(); await handler(request({ action: 'bootstrap' }, { cookies: {} }), res);
        expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringMatching(/wd-guest=[\w-]{43}; Path=\/; HttpOnly; SameSite=Lax/));
        expect(res.json).toHaveBeenCalledWith({ ok: true }); expect(fetch).not.toHaveBeenCalled();
    });
    it('never forwards client-supplied account authorization', async () => {
        const res = response(); const req = request({ command: { action: 'claim' } }); req.headers.authorization = 'Bearer attacker';
        getSession.mockResolvedValue(null); await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(401); expect(fetch).not.toHaveBeenCalled();
    });
    it('takes account identity only from the authenticated NextAuth session', async () => {
        getSession.mockResolvedValue({ backendJwt: 'server-verified-session-token' });
        const res = response(); await handler(request({ command: { action: 'claim' } }), res);
        expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:4000/internal/guest/command', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer server-verified-session-token' }) }));
    });
    it('ignores spoofed forwarding headers unless explicitly configured', async () => {
        vi.stubEnv('GUEST_TRUSTED_IP_HEADER', '');
        const res = response(); const req = request({ command: { action: 'inspect' } }); req.headers['x-forwarded-for'] = '1.2.3.4';
        await handler(req, res); const first = vi.mocked(fetch).mock.calls[0]?.[1]?.headers;
        req.headers['x-forwarded-for'] = '5.6.7.8'; await handler(req, response());
        expect(vi.mocked(fetch).mock.calls[1]?.[1]?.headers).toEqual(first);
    });
    it('fails closed when the backend is unreachable', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('timeout'));
        const res = response(); await handler(request({ command: { action: 'inspect' } }), res);
        expect(res.status).toHaveBeenCalledWith(503);
    });
});

it('forwards bounded telemetry through the private route and preserves empty success responses', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 204, headers: new Headers() } as Response);
    const res = response();
    await handler(request({ action: 'telemetry', event: 'save_intent', source: 'hero' }), res);
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:4000/internal/guest/telemetry', expect.objectContaining({ method: 'POST' }));
    expect(res.status).toHaveBeenCalledWith(204); expect(res.end).toHaveBeenCalled();
});
