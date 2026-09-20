import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
import { Floaties, SPRITES } from "../floaties/floaties";

const spec = [
    { label: "Price", value: "Free — no card, no seats, no tiers" },
    { label: "Room size", value: "Comfortable up to about 20 people" },
    { label: "Stage", value: "Early access. Expect rough edges." },
    { label: "Sign in", value: "Google, or a magic link by email" },
];

export function Status() {
    return (
        <section
            id="status"
            className="py-32 bg-[var(--wd-surface-base)] relative overflow-hidden"
        >
            <Floaties
                items={[
                    { ...SPRITES.coffee, top: "20%", right: "8%", drift: 60, display: 44, rotate: -8 },
                    { ...SPRITES.pizza, top: "70%", left: "7%", drift: -110, display: 40, rotate: 12 },
                ]}
            />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-[var(--wd-text-primary)] mb-6">
                        Where things{" "}
                        <span className="text-[var(--wd-landing-accent)]">
                            stand
                        </span>
                    </h2>
                    <p className="text-[var(--wd-text-muted)] max-w-2xl mx-auto text-lg">
                        There is no pricing page yet because there is nothing to
                        charge for yet.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mx-auto rounded-2xl border-2 border-[var(--wd-landing-accent)] bg-[var(--wd-surface-panel)] p-8 shadow-lg"
                >
                    <dl className="divide-y divide-[var(--wd-border-subtle)]">
                        {spec.map((item) => (
                            <div
                                key={item.label}
                                className="flex flex-col gap-1 py-4 first:pt-0 sm:flex-row sm:items-baseline sm:gap-6"
                            >
                                <dt className="text-sm font-bold uppercase tracking-wider text-[var(--wd-landing-accent)] sm:w-32 sm:shrink-0">
                                    {item.label}
                                </dt>
                                <dd className="text-[var(--wd-text-secondary)]">
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    <Link
                        href="/app"
                        className="wd-landing-btn-primary mt-8 w-full group"
                    >
                        Open the room
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
