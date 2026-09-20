import React from "react";
import Script from "next/script";

/**
 * Self-hosted Umami. Cookieless and collects no personal data, so it needs no
 * consent banner.
 *
 * Both values are baked in at build time by the deploy workflow. When either
 * is missing — local dev, or before the droplet's Umami instance exists — this
 * renders nothing and no request is made.
 */
const UMAMI_URL = process.env.NEXT_PUBLIC_UMAMI_URL;
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export function Analytics() {
    if (!UMAMI_URL || !UMAMI_WEBSITE_ID) {
        return null;
    }

    return (
        <Script
            src={`${UMAMI_URL.replace(/\/+$/, "")}/script.js`}
            data-website-id={UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
        />
    );
}
