import React, { useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { Floaties, SPRITES } from "../floaties/floaties";
import { BillingInterval, Plan, PLANS } from "./plans";

const INTERVALS: { id: BillingInterval; label: string; hint?: string }[] = [
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly", hint: "2 months free" },
];

function IntervalToggle({
    value,
    onChange,
}: {
    value: BillingInterval;
    onChange: (next: BillingInterval) => void;
}) {
    return (
        <div
            role="group"
            aria-label="Billing period"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)] p-1"
        >
            {INTERVALS.map((option) => {
                const active = option.id === value;
                return (
                    <button
                        key={option.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.id)}
                        className={`rounded-full px-5 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wd-landing-accent)] ${
                            active
                                ? "bg-[var(--wd-landing-accent)] text-white"
                                : "text-[var(--wd-text-muted)] hover:text-[var(--wd-text-primary)]"
                        }`}
                    >
                        {option.label}
                        {option.hint && " "}
                        {option.hint && (
                            <span
                                className={`ml-1 text-xs ${
                                    active ? "text-white/80" : "text-[var(--wd-landing-accent)]"
                                }`}
                            >
                                {option.hint}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function PlanCard({
    plan,
    interval,
    index,
}: {
    plan: Plan;
    interval: BillingInterval;
    index: number;
}) {
    const amount = plan.price ? `$${plan.price[interval]}` : "$0";
    const suffix = plan.price ? (interval === "monthly" ? "/month" : "/year") : "forever";

    return (
        <motion.article
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            className={`relative flex flex-col rounded-2xl bg-[var(--wd-surface-panel)] p-8 ${
                plan.highlight
                    ? "border-2 border-[var(--wd-landing-accent)] shadow-[0_0_48px_rgb(var(--wd-landing-accent-rgb)/0.18)]"
                    : "border border-[var(--wd-border-subtle)]"
            }`}
        >
            {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--wd-landing-accent)] px-3 py-1 text-xs font-bold text-white">
                    {plan.highlight}
                </span>
            )}

            <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-[var(--wd-text-primary)]">
                    {plan.name}
                </h2>
                {!plan.available && (
                    <span className="rounded-full border border-[var(--wd-border-subtle)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--wd-text-muted)]">
                        Planned
                    </span>
                )}
            </div>
            <p className="mt-1 text-sm font-bold uppercase tracking-wider text-[var(--wd-landing-accent)]">
                {plan.scope}
            </p>
            {/* Two lines tall on wide screens so prices line up across cards */}
            <p className="mt-4 text-[var(--wd-text-secondary)] lg:min-h-12">{plan.pitch}</p>

            <div className="mt-6 flex items-baseline gap-2">
                <motion.span
                    key={amount}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-5xl font-bold tabular-nums text-[var(--wd-text-primary)]"
                >
                    {amount}
                </motion.span>
                <span className="text-[var(--wd-text-muted)]">{suffix}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--wd-text-muted)]">{plan.note}</p>

            <ul className="mt-8 space-y-3 border-t border-[var(--wd-border-subtle)] pt-8">
                {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-[var(--wd-text-secondary)]">
                        <CheckIcon
                            aria-hidden="true"
                            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--wd-landing-accent)]"
                        />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <div className="mt-auto pt-8">
                {plan.available ? (
                    <Link href="/app" className="wd-landing-btn-primary w-full group">
                        Pull up a chair
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                ) : (
                    <button
                        type="button"
                        disabled
                        className="wd-landing-btn-secondary w-full pointer-events-none opacity-60"
                    >
                        Not for sale yet
                    </button>
                )}
            </div>
        </motion.article>
    );
}

export function Pricing() {
    const [interval, setBillingInterval] = useState<BillingInterval>("monthly");

    return (
        <MotionConfig reducedMotion="user">
            <section
                id="pricing"
                aria-labelledby="pricing-heading"
                className="pt-32 pb-24 bg-[var(--wd-surface-base)] relative overflow-hidden"
            >
                <Floaties
                    items={[
                        { ...SPRITES.star, top: "12%", right: "6%", drift: -80, display: 36, rotate: 10 },
                        { ...SPRITES.plant, top: "78%", left: "4%", drift: 40, display: 52, opacity: 0.9 },
                    ]}
                />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h1
                            id="pricing-heading"
                            className="text-4xl md:text-5xl font-bold text-[var(--wd-text-primary)] mb-6 tracking-tight"
                        >
                            Free now, extras{" "}
                            <span className="text-[var(--wd-landing-accent)]">later</span>
                        </h1>
                        <p className="text-[var(--wd-text-muted)] max-w-2xl mx-auto text-lg">
                            Everything you can do today is free and stays free. The
                            paid plans below are a sketch of what could come next.
                            None of them is for sale, and the names, prices and
                            perks will change.
                        </p>
                        <div className="mt-10">
                            <IntervalToggle value={interval} onChange={setBillingInterval} />
                        </div>
                    </div>

                    <div className="mx-auto grid max-w-md gap-8 lg:max-w-6xl lg:grid-cols-3">
                        {PLANS.map((plan, index) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                interval={interval}
                                index={index}
                            />
                        ))}
                    </div>

                    <p className="mt-12 text-center text-sm text-[var(--wd-text-muted)] max-w-2xl mx-auto">
                        Voice, presence, the lounge and your whole chat history
                        are never paywalled. Paid plans only raise the ceilings
                        that cost us money, or add flair. No ads, no pay-to-win.
                    </p>
                </div>
            </section>
        </MotionConfig>
    );
}
