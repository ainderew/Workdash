import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

interface Option {
    name: string;
    line: string;
    body: string;
    link?: { href: string; label: string };
    ours?: boolean;
}

/**
 * Answers the question a visitor arriving from a "Gather alternative" or
 * "Discord alternative" search is already asking. Gather's price was checked
 * on its own pricing page in October 2026; re-check it with /vs and
 * /gather-alternative.
 */
const OPTIONS: Option[] = [
    {
        name: "Discord",
        line: "A voice channel is a door you open.",
        body: "Join a voice channel and see who is already there. WorkDash adds a walkable world where entering a room joins its conversation. Keep your server for everything else.",
    },
    {
        name: "Gather",
        line: "Built for offices, and paid-only now.",
        body: "Gather ended its free plan in September 2025 and costs $12 to $15 per person a month. WorkDash keeps the 2D world and room-by-room voice, free, for groups up to about twenty.",
        link: { href: "/gather-alternative", label: "Free Gather alternative" },
    },
    {
        name: "WorkDash",
        line: "One room, always open.",
        body: "See who's on before you join. Walk into a room and you're talking to everyone in it; step out when you're done. It runs in a browser tab.",
        ours: true,
    },
];

export function WhyNot() {
    return (
        <section
            id="why"
            aria-labelledby="why-title"
            className="py-24 bg-[var(--wd-surface-panel-2)] border-y border-[var(--wd-border-subtle)]"
        >
            <div className="max-w-6xl mx-auto px-6">
                <h2
                    id="why-title"
                    className="text-4xl md:text-5xl font-bold text-[var(--wd-text-primary)] mb-12 text-center tracking-tight"
                >
                    Why not just Discord{" "}
                    <span className="text-[var(--wd-landing-accent)]">or Gather?</span>
                </h2>

                <div className="grid gap-6 md:grid-cols-3">
                    {OPTIONS.map((option, index) => (
                        <motion.div
                            key={option.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.08 }}
                            className={`flex flex-col rounded-2xl bg-[var(--wd-surface-panel)] p-7 ${
                                option.ours
                                    ? "border-2 border-[var(--wd-landing-accent)]"
                                    : "border border-[var(--wd-border-subtle)]"
                            }`}
                        >
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--wd-landing-accent)]">
                                {option.name}
                            </h3>
                            <p className="mt-3 text-xl font-bold text-[var(--wd-text-primary)]">
                                {option.line}
                            </p>
                            <p className="mt-3 text-[var(--wd-text-muted)] leading-relaxed">
                                {option.body}
                            </p>
                            {option.link && (
                                <Link
                                    href={option.link.href}
                                    className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--wd-landing-accent)] hover:text-[var(--wd-landing-accent-hover)] transition-colors group"
                                >
                                    {option.link.label}
                                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                        </motion.div>
                    ))}
                </div>

                <p className="mt-10 text-center">
                    <Link
                        href="/vs"
                        className="text-sm font-bold text-[var(--wd-text-muted)] underline underline-offset-4 hover:text-[var(--wd-landing-accent)] transition-colors"
                    >
                        See the full comparison
                    </Link>
                </p>
            </div>
        </section>
    );
}
