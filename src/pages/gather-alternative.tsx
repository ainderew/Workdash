import React from "react";
import { DiscoveryLinks, RoomPreview } from "@/components/discovery/DiscoveryPage";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, MinusIcon } from "lucide-react";
import { Navbar } from "@/components/navbar/navbar";
import { Footer } from "@/components/landingPage/footer/footer";
import { Seo } from "@/common/components/Seo";

/**
 * Every competitor figure below was read on that vendor's own pricing page.
 * Re-check them each quarter and bump this date; a wrong price is worse than
 * no price. Leave out anything you can't confirm at the source.
 */
const PRICES_CHECKED = "October 2026";

interface Plan {
    product: string;
    free: string;
    paid: string;
    source: string;
    ours?: boolean;
}

const PLANS: Plan[] = [
    {
        product: "WorkDash",
        free: "Free for the whole group, comfortable up to about 20 people",
        paid: "No paid plan yet",
        source: "/pricing",
        ours: true,
    },
    {
        product: "Gather",
        free: "None since September 2025 (30-day trial)",
        paid: "$12 per user a month billed yearly, $15 monthly",
        source: "https://www.gather.town/pricing",
    },
    {
        product: "WorkAdventure",
        free: "Up to 10 people online at the same time",
        paid: "From €8 per user a month",
        source: "https://workadventu.re/pricing/",
    },
    {
        product: "Kumospace",
        free: "Up to 5 registered members, 1 floor",
        paid: "$16 per user a month billed yearly, $20 monthly, 5-member minimum",
        source: "https://www.kumospace.com/pricing",
    },
    {
        product: "SoWork",
        free: "Up to 10 members, 30-minute meetings",
        paid: "From $5.40 per member a month billed yearly",
        source: "https://www.sowork.com/pricing",
    },
    {
        product: "flat.social",
        free: "Up to 5 people at once",
        paid: "$6 per seat a month, 10-seat minimum",
        source: "https://flat.social/pricing",
    },
];

const CARRIES_OVER = [
    "Proximity audio, by room: everyone in the same room hears each other",
    "A private office for conversations that stay between the people inside",
    "A 2D world your avatar walks around in",
    "Video and screen sharing",
    "Text channels and threads, with the full history kept",
    "Runs in the browser, phones included",
];

const DOES_NOT = [
    "Audio that fades with distance. Voice works by room: walk into the café or the campfire and you hear everyone there.",
    "Big events and conferences. WorkDash is comfortable up to about 20 people.",
    "Maps you design yourself. There is one shared world for now.",
    "The polish of an established product. It is in early access, built by one person.",
];

const STEPS = [
    "Sign in with Google or an email link, and name your room.",
    "Copy the invite link and post it wherever your group already talks.",
    "Everyone signs in and walks in. Nothing to install.",
];

function OpenRoomButton({ location }: { location: string }) {
    return (
        <Link
            href="/app"
            data-umami-event="cta_open_room"
            data-umami-event-location={location}
            className="wd-landing-btn-primary group"
        >
            Open a free room
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
    );
}

export default function GatherAlternativePage() {
    return (
        <>
            <Seo
                title="Free Gather Alternative for Small Groups (2026) | WorkDash"
                description="Gather ended its free plan in September 2025. WorkDash keeps proximity audio and a 2D world, free, for groups under 20. See what carries over and what doesn't."
                path="/gather-alternative"
            />
            <div className="wd-discovery w-full min-h-screen bg-[var(--wd-surface-base)] text-[var(--wd-text-primary)]">
                <Navbar />

                <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        A free Gather alternative{" "}
                        <span className="text-[var(--wd-landing-accent)]">
                            for small groups
                        </span>
                    </h1>

                    <div className="space-y-5 text-lg text-[var(--wd-text-muted)] leading-relaxed max-w-2xl mb-10">
                        <p>
                            Gather ended its free plan on September 15, 2025. It
                            now costs $15 per person a month, or $12 billed
                            yearly, after a 30-day trial.
                        </p>
                        <p>
                            If you used Gather to hang out with a small group
                            rather than run an office, WorkDash keeps the parts
                            you used, and it is free.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mb-20">
                        <OpenRoomButton location="gather_alternative_top" />
                        <Link href="/vs" className="wd-landing-btn-secondary">
                            Compare with Discord too
                        </Link>
                    </div>

                    <RoomPreview />

                    <div className="grid gap-10 md:grid-cols-2 mb-20">
                        <section aria-labelledby="carries-over">
                            <h2 id="carries-over" className="text-2xl font-bold mb-5">
                                What carries over
                            </h2>
                            <ul className="space-y-3">
                                {CARRIES_OVER.map((item) => (
                                    <li key={item} className="flex gap-3 text-[var(--wd-text-secondary)]">
                                        <CheckIcon
                                            aria-hidden="true"
                                            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--wd-success)]"
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>
                        <section aria-labelledby="does-not">
                            <h2 id="does-not" className="text-2xl font-bold mb-5">
                                What doesn&rsquo;t, yet
                            </h2>
                            <ul className="space-y-3">
                                {DOES_NOT.map((item) => (
                                    <li key={item} className="flex gap-3 text-[var(--wd-text-secondary)]">
                                        <MinusIcon
                                            aria-hidden="true"
                                            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--wd-text-muted)]"
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    <section aria-labelledby="free-plans" className="mb-20">
                        <h2 id="free-plans" className="text-2xl font-bold mb-5">
                            Free plans compared
                        </h2>
                        <div className="overflow-x-auto rounded-2xl border border-[var(--wd-border-subtle)]">
                            <table className="w-full text-left border-collapse min-w-[38rem]">
                                <caption className="sr-only">
                                    Free plans and starting prices of Gather and
                                    similar products
                                </caption>
                                <thead>
                                    <tr className="bg-[var(--wd-surface-panel-2)]">
                                        <th scope="col" className="p-4 font-bold text-sm">Product</th>
                                        <th scope="col" className="p-4 font-bold text-sm">Free plan</th>
                                        <th scope="col" className="p-4 font-bold text-sm">Paid from</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {PLANS.map((plan, i) => (
                                        <tr
                                            key={plan.product}
                                            className={i % 2 ? "bg-[var(--wd-surface-panel)]/40" : ""}
                                        >
                                            <th
                                                scope="row"
                                                className={`p-4 font-bold text-sm align-top ${
                                                    plan.ours
                                                        ? "text-[var(--wd-landing-accent)]"
                                                        : "text-[var(--wd-text-secondary)]"
                                                }`}
                                            >
                                                <a
                                                    href={plan.source}
                                                    className="hover:underline underline-offset-4"
                                                    rel={plan.ours ? undefined : "noopener noreferrer"}
                                                >
                                                    {plan.product}
                                                </a>
                                            </th>
                                            <td className="p-4 align-top text-sm">{plan.free}</td>
                                            <td className="p-4 align-top text-sm">{plan.paid}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4 text-sm text-[var(--wd-text-muted)] leading-relaxed">
                            Checked {PRICES_CHECKED} on each product&rsquo;s own
                            pricing page (linked from its name). Plans change, so
                            check before deciding. We are not affiliated with any
                            of them.
                        </p>
                    </section>

                    <section aria-labelledby="moving" className="mb-12">
                        <h2 id="moving" className="text-2xl font-bold mb-5">
                            Moving your group over
                        </h2>
                        <ol className="space-y-3 list-decimal pl-5 text-[var(--wd-text-secondary)] marker:text-[var(--wd-landing-accent)] marker:font-bold">
                            {STEPS.map((step) => (
                                <li key={step} className="pl-1">
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </section>

                    <OpenRoomButton location="gather_alternative_bottom" />
                    <DiscoveryLinks current="/gather-alternative" />
                </main>

                <Footer />
            </div>
        </>
    );
}
