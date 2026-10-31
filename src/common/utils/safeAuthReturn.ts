/** Only known application destinations can be used after a magic-link login. */
export function safeAuthReturn(value: unknown): string {
    if (value === '/try' || value === '/app') return value;
    if (typeof value === 'string' && /^\/invite\/[A-Za-z0-9_-]{1,128}$/.test(value)) return value;
    return '/app';
}
