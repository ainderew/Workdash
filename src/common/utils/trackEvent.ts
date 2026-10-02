/**
 * Custom events for the self-hosted Umami script loaded by
 * `components/Analytics.tsx`. A no-op whenever that script isn't on the page:
 * local dev, tests, or a visitor's ad blocker.
 *
 * Event names are snake_case and describe what happened ("den_created"), so
 * the Umami dashboard reads as a funnel. Never put personal data in `data`:
 * no names, emails or workspace names.
 *
 * Marketing-page clicks are tracked with `data-umami-event` attributes on the
 * links themselves instead; Umami binds those on its own.
 */

type EventData = Record<string, string | number | boolean>;

declare global {
    interface Window {
        umami?: { track: (event: string, data?: EventData) => void };
    }
}

export function trackEvent(event: string, data?: EventData): void {
    try {
        window.umami?.track(event, data);
    } catch {
        // Analytics must never break the thing it is measuring.
    }
}
