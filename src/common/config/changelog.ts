export interface ChangelogEntry {
    /** ISO date, used for <time> and the sitemap's lastmod. */
    date: string;
    title: string;
    items: string[];
}

/**
 * Hand-maintained. The Docker build excludes .git, so this cannot be generated
 * from history at build time — add an entry here when you ship something a
 * person would notice.
 */
export const CHANGELOG: ChangelogEntry[] = [
    {
        date: "2026-09-20",
        title: "Honest landing page, and links that preview",
        items: [
            "Removed testimonials and pricing tiers that described things that did not exist.",
            "Pasting a WorkDash link into a chat now shows a title, description and a picture of the room.",
            "The browser tab finally has an icon.",
        ],
    },
    {
        date: "2026-09-09",
        title: "Trimming",
        items: ["Removed the Project Zomboid integration."],
    },
    {
        date: "2026-09-06",
        title: "Phones can switch modes",
        items: [
            "World and desk mode switching is reachable on a phone instead of desktop-only.",
        ],
    },
    {
        date: "2026-08-12",
        title: "Custom status, everywhere it matters",
        items: [
            "Your custom status shows in the @mention autocomplete.",
            "It also shows in member lists and the message feed.",
            "The status picker moved under your name where people were looking for it.",
        ],
    },
    {
        date: "2026-07-14",
        title: "Ticket previews in threads",
        items: [
            "Linear and Jira links render as preview cards inside the thread panel.",
        ],
    },
    {
        date: "2026-06-26",
        title: "Calls tell you when they are struggling",
        items: [
            "Call quality problems and connection failures surface instead of failing silently.",
            "A warm 'Lamplight' boot screen replaced the jargon-heavy loading copy.",
            "Fixed the message list flickering while you scrolled past hovered rows.",
            "Fixed a missing avatar on the first message after someone left a call.",
        ],
    },
    {
        date: "2026-06-17",
        title: "The lounge gets music and a hearth",
        items: [
            "Music auto-join, a compact now-playing bar, and clear Listen / Leave controls.",
            "The lounge card shows what is playing and lets you add a song.",
            "Animated profile effects play when a profile card opens.",
            "The cozy den theme landed and became the default.",
            "Composer drafts persist per room, so a half-typed message survives a tab switch.",
            "Search results highlight the term you searched for.",
        ],
    },
    {
        date: "2026-06-14",
        title: "Ready checks clean up after themselves",
        items: ["The ready-check dismisses itself once everyone has locked in."],
    },
];
