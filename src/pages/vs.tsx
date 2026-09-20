import React from "react";
import Link from "next/link";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Navbar } from "@/components/navbar/navbar";
import { Footer } from "@/components/landingPage/footer/footer";
import { Seo } from "@/common/components/Seo";

/** Bump this whenever the competitor columns are re-checked. */
const LAST_CHECKED = "September 2026";

interface Row {
    label: string;
    workdash: string | boolean;
    gather: string | boolean;
    discord: string | boolean;
}

/**
 * Deliberately compares capabilities, not prices or limits: those change
 * without notice and a stale table is worse than no table.
 */
const ROWS: Row[] = [
    {
        label: "Built for",
        workdash: "A friend group hanging out",
        gather: "Teams, offices and events",
        discord: "Communities of any size",
    },
    {
        label: "Walk-up proximity audio",
        workdash: true,
        gather: true,
        discord: false,
    },
    {
        label: "2D world you move around in",
        workdash: true,
        gather: true,
        discord: false,
    },
    {
        label: "A room that stays open",
        workdash: true,
        gather: true,
        discord: true,
    },
    {
        label: "Text channels and threads",
        workdash: true,
        gather: "Chat, not channels",
        discord: true,
    },
    {
        label: "Screen sharing",
        workdash: true,
        gather: true,
        discord: true,
    },
    {
        label: "Comfortable group size",
        workdash: "About 20",
        gather: "Scales to large events",
        discord: "Scales to very large servers",
    },
    {
        label: "Maturity",
        workdash: "Early access, small project",
        gather: "Established product",
        discord: "Established product",
    },
];

function Cell({ value }: { value: string | boolean }) {
    if (value === true) {
        return (
            <>
                <CheckIcon
                    className="w-5 h-5 text-[var(--wd-success)] inline"
                    aria-hidden="true"
                />
                <span className="sr-only">Yes</span>
            </>
        );
    }
    if (value === false) {
        return (
            <>
                <MinusIcon
                    className="w-5 h-5 text-[var(--wd-text-muted)] inline"
                    aria-hidden="true"
                />
                <span className="sr-only">No</span>
            </>
        );
    }
    return <span className="text-sm">{value}</span>;
}

export default function ComparePage() {
    return (
        <>
            <Seo
                title="WorkDash vs Gather vs Discord — which one fits your group?"
                description="An honest comparison of WorkDash, Gather and Discord for keeping a room open with friends: proximity audio, 2D worlds, channels, group size and maturity."
                path="/vs"
            />
            <div className="w-full min-h-screen bg-[var(--wd-surface-base)] text-[var(--wd-text-primary)]">
                <Navbar />

                <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        WorkDash vs Gather vs{" "}
                        <span className="text-[var(--wd-landing-accent)]">
                            Discord
                        </span>
                    </h1>

                    <div className="space-y-5 text-lg text-[var(--wd-text-muted)] leading-relaxed max-w-2xl mb-14">
                        <p>
                            These three overlap, but they were built for
                            different rooms. Discord is the default for talking
                            to people online and is better at it than anything
                            here &mdash; but a voice channel is a door you open,
                            not a place you can see into.
                        </p>
                        <p>
                            Gather put people on a map and made audio work by
                            distance. It is aimed at companies: offices,
                            onboarding, conferences. It is a more finished
                            product than WorkDash and will stay that way for a
                            while.
                        </p>
                        <p>
                            WorkDash is the small version of that idea, built
                            for a group of friends who already talk every night
                            and want one room that is simply always open. If you
                            need to run a 200-person event, use Gather. If you
                            want a server for a community, use Discord.
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-[var(--wd-border-subtle)]">
                        <table className="w-full text-left border-collapse min-w-[38rem]">
                            <caption className="sr-only">
                                Feature comparison of WorkDash, Gather and
                                Discord
                            </caption>
                            <thead>
                                <tr className="bg-[var(--wd-surface-panel-2)]">
                                    <th scope="col" className="p-4 font-bold text-sm">
                                        &nbsp;
                                    </th>
                                    <th
                                        scope="col"
                                        className="p-4 font-bold text-sm text-[var(--wd-landing-accent)]"
                                    >
                                        WorkDash
                                    </th>
                                    <th scope="col" className="p-4 font-bold text-sm">
                                        Gather
                                    </th>
                                    <th scope="col" className="p-4 font-bold text-sm">
                                        Discord
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {ROWS.map((row, i) => (
                                    <tr
                                        key={row.label}
                                        className={
                                            i % 2
                                                ? "bg-[var(--wd-surface-panel)]/40"
                                                : ""
                                        }
                                    >
                                        <th
                                            scope="row"
                                            className="p-4 font-medium text-sm text-[var(--wd-text-secondary)] align-top"
                                        >
                                            {row.label}
                                        </th>
                                        <td className="p-4 align-top">
                                            <Cell value={row.workdash} />
                                        </td>
                                        <td className="p-4 align-top">
                                            <Cell value={row.gather} />
                                        </td>
                                        <td className="p-4 align-top">
                                            <Cell value={row.discord} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-6 text-sm text-[var(--wd-text-muted)] leading-relaxed">
                        Gather and Discord details last checked {LAST_CHECKED}.
                        Both are actively developed and change without telling
                        us, so check their own sites before deciding. Prices and
                        plan limits are deliberately left out here rather than
                        risk quoting them wrong. We are not affiliated with
                        either.
                    </p>

                    <div className="mt-12 flex flex-col sm:flex-row gap-4">
                        <Link href="/app" className="wd-landing-btn-primary">
                            Open the room
                        </Link>
                        <Link href="/" className="wd-landing-btn-secondary">
                            What WorkDash does
                        </Link>
                    </div>
                </main>

                <Footer />
            </div>
        </>
    );
}
