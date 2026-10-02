import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

/**
 * The real first-run path: sign in, "Create Workspace", then "Create Invite
 * Link" in the members panel. Keep these steps in sync with the app's flow.
 */
const STEPS = [
    {
        title: "Sign in",
        body: "With Google, or a link sent to your email. Nothing to download.",
    },
    {
        title: "Make your group's room",
        body: "Give it a name. That's the whole setup.",
    },
    {
        title: "Send one invite link",
        body: "Drop it in your group chat. Friends sign in and land in your room.",
    },
];

export function HowItWorks() {
    return (
        <section
            id="how-it-works"
            aria-labelledby="how-title"
            className="py-24 bg-[var(--wd-surface-base)]"
        >
            <div className="max-w-5xl mx-auto px-6 text-center">
                <h2
                    id="how-title"
                    className="text-4xl md:text-5xl font-bold text-[var(--wd-text-primary)] mb-14 tracking-tight"
                >
                    Open a room in{" "}
                    <span className="text-[var(--wd-landing-accent)]">two minutes</span>
                </h2>

                <ol className="grid gap-6 md:grid-cols-3 text-left">
                    {STEPS.map((step, index) => (
                        <motion.li
                            key={step.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.08 }}
                            className="rounded-2xl border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)] p-7"
                        >
                            <span
                                aria-hidden="true"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wd-landing-accent-soft)] text-sm font-bold text-[var(--wd-landing-accent)]"
                            >
                                {index + 1}
                            </span>
                            <h3 className="mt-4 text-xl font-bold text-[var(--wd-text-primary)]">
                                {step.title}
                            </h3>
                            <p className="mt-2 text-[var(--wd-text-muted)] leading-relaxed">
                                {step.body}
                            </p>
                        </motion.li>
                    ))}
                </ol>

                <Link
                    href="/app"
                    data-umami-event="cta_open_room"
                    data-umami-event-location="how_it_works"
                    className="wd-landing-btn-primary mt-12 group"
                >
                    Open the room
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </section>
    );
}
