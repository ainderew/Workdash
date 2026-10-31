import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac, randomBytes } from 'node:crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
const cookieName = process.env.NODE_ENV === 'production' ? '__Host-wd-guest' : 'wd-guest';
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const origin = process.env.NEXTAUTH_URL;
    const upstream = process.env.GUEST_INTERNAL_URL;
    const key = process.env.GUEST_PROXY_SECRET;
    if (!origin || !upstream || !key || key.length < 32) {
        if (req.method === 'GET') return res.json({ enabled: false, creation: false, joins: false, roomSize: 8, lifetimeSeconds: 1200, voice: false });
        return res.status(503).json({ code: 'UNAVAILABLE' });
    }
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).end(); }
    if (req.method === 'POST' && (req.headers.origin !== new URL(origin).origin || req.headers['x-guest-request'] !== '1' || !req.headers['content-type']?.startsWith('application/json'))) return res.status(403).json({ code: 'FORBIDDEN' });
    // Never trust an arbitrary X-Forwarded-For. Set a single header here only
    // when the ingress overwrites it and direct access to Next is blocked.
    const trustedHeader = process.env.GUEST_TRUSTED_IP_HEADER?.toLowerCase();
    const forwarded = trustedHeader ? req.headers[trustedHeader] : undefined;
    const address = typeof forwarded === 'string' && forwarded.length < 80 && !forwarded.includes(',') ? forwarded : req.socket.remoteAddress || 'unknown';
    const network = createHmac('sha256', key).update(`guest-network:${address}`).digest('hex');
    let token = req.cookies[cookieName];
    const setCookie = (value: string) => res.setHeader('Set-Cookie', `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=90000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    if (req.method === 'POST' && req.body?.action === 'bootstrap') {
        if (!token || !tokenPattern.test(token)) { token = randomBytes(32).toString('base64url'); setCookie(token); }
        return res.json({ ok: true });
    }
    if (req.method === 'POST' && (!token || !tokenPattern.test(token))) return res.status(401).json({ code: 'SESSION_EXPIRED' });
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-guest-proxy': key, 'x-guest-network': network };
    if (token) headers['x-guest-session'] = token;
    if (req.body?.command?.action === 'claim') {
        const session = await getServerSession(req, res, authOptions);
        if (!session?.backendJwt) return res.status(401).json({ code: 'SIGN_IN_REQUIRED' });
        headers.Authorization = `Bearer ${session.backendJwt}`;
    }
    try {
        const path = req.method === 'GET' ? 'config' : req.body?.action === 'telemetry' ? 'telemetry' : 'command';
        const response = await fetch(`${upstream.replace(/\/$/, '')}/${path}`, {
            method: req.method, headers,
            ...(req.method === 'POST' ? { body: JSON.stringify(req.body) } : {}),
            signal: AbortSignal.timeout(9000), redirect: 'error',
        });
        if (response.headers.get('retry-after')) res.setHeader('Retry-After', response.headers.get('retry-after')!);
        if (response.status === 204) return res.status(204).end();
        const data: unknown = await response.json();
        return res.status(response.status).json(data);
    } catch { return res.status(503).json({ code: 'UNAVAILABLE' }); }
}
