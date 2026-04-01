import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { CheckIcon, SwordIcon, ShieldIcon } from "lucide-react";

const tiers = [
    {
        name: "Small Party",
        level: 1,
        price: 0,
        icon: SwordIcon,
        features: [
            "Up to 5 Players",
            "Basic Guild Hall",
            "Public Voice Channels",
            "Standard Sprites",
        ],
        cta: "Start Quest",
        xp: 25,
    },
    {
        name: "Guild Upgrade",
        level: 50,
        price: 5,
        icon: ShieldIcon,
        features: [
            "All features from Small Party*",
            "Up to 50 Players",
            "HD Video Streams",
            "Custom Emotes",
            "Role Management",
        ],
        cta: "Upgrade Guild",
        highlight: true,
        xp: 75,
    },
];

function AnimatedPrice({ target }: { target: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!isInView) return;
        if (target === 0) {
            setValue(0);
            return;
        }
        let start = 0;
        const duration = 800;
        const startTime = performance.now();
        function tick(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            start = Math.round(progress * target);
            setValue(start);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }, [isInView, target]);

    return <span ref={ref}>${value}</span>;
}

export function Pricing() {
    return (
        <section
            id="pricing"
            className="py-32 bg-[var(--wd-surface-base)] relative overflow-hidden"
        >
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-[var(--wd-text-primary)] mb-6">
                        Choose Your{" "}
                        <span className="text-[var(--wd-landing-accent)]">
                            Difficulty
                        </span>
                    </h2>
                    <p className="text-[var(--wd-text-muted)]">
                        Scale your server capacity as your guild grows.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
                    {tiers.map((tier, index) => {
                        const isHighlight = tier.highlight;
                        return (
                            <motion.div
                                key={tier.name}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`
                                    relative group min-h-full flex flex-col rounded-2xl p-8 border-2 transition-all duration-300
                                    ${isHighlight ? "bg-[var(--wd-surface-panel)] border-[var(--wd-landing-accent)] shadow-lg z-10" : "bg-[var(--wd-surface-panel)]/50 border-[var(--wd-border-subtle)] hover:border-[var(--wd-border-strong)]"}
                                `}
                            >
                                {isHighlight && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--wd-landing-accent)] text-[var(--wd-surface-base)] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                        Best Value
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="text-sm font-bold uppercase mb-1 text-[var(--wd-landing-accent)]">
                                            LVL {tier.level}
                                        </div>
                                        <h3 className="text-2xl font-bold text-[var(--wd-text-primary)]">
                                            {tier.name}
                                        </h3>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--wd-surface-panel-2)] text-[var(--wd-landing-accent)] border border-[var(--wd-landing-accent)]/30">
                                        <tier.icon className="w-6 h-6" />
                                    </div>
                                </div>

                                {/* XP Bar */}
                                <div className="w-full h-2 bg-[var(--wd-surface-panel-2)] rounded-full mb-8 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{
                                            width: `${tier.xp}%`,
                                        }}
                                        transition={{
                                            duration: 1,
                                            delay: 0.5,
                                        }}
                                        className="h-full bg-[var(--wd-landing-accent)]"
                                    />
                                </div>

                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl font-bold text-[var(--wd-text-primary)]">
                                        <AnimatedPrice target={tier.price} />
                                    </span>
                                    <span className="text-[var(--wd-text-muted)]">
                                        /mo
                                    </span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    {tier.features.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-center gap-3 text-sm text-[var(--wd-text-secondary)]"
                                        >
                                            <CheckIcon className="w-4 h-4 text-[var(--wd-landing-accent)]" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <button
                                    className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all mt-auto ${
                                        isHighlight
                                            ? "wd-landing-btn-primary"
                                            : "wd-landing-btn-secondary"
                                    }`}
                                >
                                    {tier.cta}
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
