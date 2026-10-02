/**
 * Canonical site identity, used for metadata and link previews.
 *
 * SITE_URL has no trailing slash. It is hardcoded rather than read from an
 * env var because these values are baked into static HTML at build time and
 * the deploy workflow passes no NEXT_PUBLIC_ build arg for them.
 */
export const SITE_URL = "https://workdash.site";
export const SITE_NAME = "WorkDash";
export const SITE_TAGLINE = "The room's already open";
export const SITE_DESCRIPTION =
    "Keep one room open for your friend group: proximity voice chat, video and channels in a small 2D world. Runs in your browser. Free, no card.";
export const OG_IMAGE = "/assets/og.jpg";
export const OG_IMAGE_ALT =
    "The WorkDash world: a top-down pixel lounge with bookshelves, couches and a player standing by the coffee table.";
