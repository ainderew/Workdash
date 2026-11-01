const sources = ['direct', 'hero', 'demo', 'friends', 'comparison', 'footer'] as const;
export const guestSource = (value: unknown) => typeof value === 'string' && sources.includes(value as typeof sources[number]) ? value : 'direct';
const sent = new Set<string>();

/** Explicit payload only. /try keeps Umami disabled so invite URLs never reach it. */
export function guestFunnelEvent(event: 'entry_viewed' | 'world_entered' | 'save_intent') {
    if (sent.has(event)) return;
    sent.add(event);
    let source = 'direct';
    try {
        const from = new URLSearchParams(window.location.search).get('from');
        source = guestSource(from ?? sessionStorage.getItem('workdash:guest-source'));
        sessionStorage.setItem('workdash:guest-source', source);
    } catch { /* Tracking never blocks a trial. */ }
    void fetch('/api/guest', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Guest-Request': '1' },
        body: JSON.stringify({ action: 'telemetry', event, source }), keepalive: true, signal: AbortSignal.timeout(5000),
    }).catch(() => {});
}
