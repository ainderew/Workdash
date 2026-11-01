import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
export function Challenge({ onToken, attempt }: { onToken: (value: string) => void; attempt: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    const key = process.env.NEXT_PUBLIC_GUEST_TURNSTILE_SITE_KEY;
    useEffect(() => {
        const api = (window as unknown as { turnstile?: Turnstile }).turnstile;
        if (!ready || !api || !ref.current || !key) return;
        const id = api.render(ref.current, { sitekey: key, action: 'guest_admission', callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken(''), theme: 'auto' });
        return () => api.remove(id);
    }, [ready, key, onToken, attempt]);
    if (!key) return null;
    return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} /><div ref={ref} aria-label="Guest room security check" /></>;
}
