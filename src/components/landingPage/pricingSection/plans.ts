/**
 * Placeholder plans for the landing page. Names, prices and perks come from
 * `feature-plans/billing/00-overview.md` §5 and are still working names:
 * nothing here is for sale yet. Edit this file while the tiers are being
 * brainstormed; the section renders whatever is listed.
 */

export type BillingInterval = "monthly" | "yearly";

export interface Plan {
    id: string;
    name: string;
    /** Who the plan is bought for. */
    scope: string;
    pitch: string;
    /** Whole dollars. Null means free. */
    price: Record<BillingInterval, number> | null;
    note: string;
    features: string[];
    /** Shown as a chip on the card the section leads with. */
    highlight?: string;
    /** False until the plan can actually be bought. */
    available: boolean;
}

export const PLANS: Plan[] = [
    {
        id: "free",
        name: "Free",
        scope: "For everyone",
        pitch: "The room's already open.",
        price: null,
        note: "No card, now or later.",
        features: [
            "Voice, video and proximity audio",
            "Presence, the lounge and nudges",
            "Chat, threads and DMs with full history and search",
            "As many rooms and channels as you like",
            "400+ avatar options and 7 themes",
            "Uploads up to 100 MB",
        ],
        available: true,
    },
    {
        id: "den-plus",
        name: "Den+",
        scope: "Per workspace",
        pitch: "Make it your place, and keep everything.",
        price: { monthly: 8, yearly: 80 },
        note: "One friend pays for the whole den.",
        features: [
            "Files kept for a year, not a week",
            "Uploads up to 500 MB",
            "Screen share at 1080p60",
            "250 custom emoji and 150 soundboard sounds",
            "Your own invite link, like workdash.site/invite/the-boys",
            "Room for up to 100 people",
        ],
        highlight: "For the whole den",
        available: false,
    },
    {
        id: "regular",
        name: "Regular",
        scope: "Per person",
        pitch: "Be a regular.",
        price: { monthly: 4, yearly: 40 },
        note: "Just for you, in every den you're in.",
        features: [
            "A Regular badge, or Founding Regular if you're early",
            "Your own name color or gradient in chat",
            "6 more profile effects and 6 more super reactions",
            "10 more emotes in the world",
            "Regular-only accessories and kart skins",
            "Uploads up to 500 MB anywhere",
        ],
        available: false,
    },
];
