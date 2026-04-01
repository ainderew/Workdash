import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const npcs = [
    {
        id: 1,
        name: "Martin Enghoy",
        role: "Tech Lead @ Theoria Medical",
        logo: "/landing-page/logos/theoria-logo.jpg",
        quote: "This platform leveled up our remote culture instantly. It's like an MMO for work.",
        stats: { lvl: 42, str: 18, int: 99 },
    },
    {
        id: 2,
        name: "Ivan Golosinda",
        role: "Product Owner @ Maya",
        logo: "/landing-page/logos/maya-logo.jpg",
        quote: "Finally, a workspace that feels like a guild hall. The presence features are epic.",
        stats: { lvl: 35, str: 99, int: 15 },
    },
    {
        id: 3,
        name: "Feter Banua",
        role: "Design Director @ Odoo",
        logo: "/landing-page/logos/odoo-logo.webp",
        quote: "The visual fidelity and sprite customization allows us to express our true selves.",
        stats: { lvl: 50, str: 12, int: 88 },
    },
    {
        id: 4,
        name: "Ronchi Miong",
        role: "DevOps @ Unionbank",
        logo: "/landing-page/logos/ub-logo.jpeg",
        quote: "Stealth mode for deep work, party mode for celebrations. Perfect balance.",
        stats: { lvl: 28, str: 45, int: 60 },
    },
    {
        id: 5,
        name: "Brett Galvez",
        role: "CEO @ Gcash",
        logo: "/landing-page/logos/gcash-logo.jpg",
        quote: "We've seen a +50% buff in team engagement since switching to this engine.",
        stats: { lvl: 99, str: 80, int: 95 },
    },
];

export function SocialProof() {
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    return (
        <section className="py-20 bg-[var(--wd-surface-panel-2)] border-y border-[var(--wd-border-subtle)] relative">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex items-center gap-4 mb-12">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--wd-border-subtle)] to-transparent" />
                    <h3 className="text-[var(--wd-landing-accent)] font-semibold text-sm tracking-wide uppercase">
                        Trusted by Top Guilds
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--wd-border-subtle)] to-transparent" />
                </div>

                <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                    {npcs.map((npc) => (
                        <motion.div
                            key={npc.id}
                            className="relative group"
                            onHoverStart={() => setHoveredId(npc.id)}
                            onHoverEnd={() => setHoveredId(null)}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: npc.id * 0.1 }}
                        >
                            <motion.div
                                className="
                                    w-16 h-16 md:w-20 md:h-20 rounded-xl bg-[var(--wd-surface-panel)] border border-[var(--wd-border-subtle)]
                                    flex items-center justify-center cursor-pointer
                                    group-hover:border-[var(--wd-landing-accent)] group-hover:scale-110
                                    transition-all duration-300 shadow-md
                                    relative overflow-hidden
                                "
                            >
                                <Image
                                    src={npc.logo}
                                    alt={npc.name}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            </motion.div>

                            <AnimatePresence>
                                {hoveredId === npc.id && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            y: 10,
                                            scale: 0.9,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            y: 10,
                                            scale: 0.9,
                                        }}
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 md:w-80 z-50 pointer-events-none"
                                    >
                                        <div className="bg-[var(--wd-surface-panel)]/95 backdrop-blur-xl border border-[var(--wd-border-subtle)] rounded-lg p-4 shadow-2xl relative">
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--wd-surface-panel)] border-b border-r border-[var(--wd-border-subtle)] rotate-45" />

                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-bold text-[var(--wd-text-primary)] text-sm">
                                                        {npc.name}
                                                    </h4>
                                                    <p className="text-xs text-[var(--wd-landing-accent)]">
                                                        {npc.role}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end text-[10px] text-[var(--wd-text-muted)]">
                                                    <span>
                                                        LVL {npc.stats.lvl}
                                                    </span>
                                                    <div className="w-16 h-1 bg-[var(--wd-surface-panel-2)] rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-[var(--wd-landing-accent)]"
                                                            style={{
                                                                width: `${(npc.stats.lvl / 99) * 100}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative bg-[var(--wd-surface-panel-2)]/50 p-3 rounded border border-[var(--wd-border-subtle)]/50">
                                                <p className="text-xs text-[var(--wd-text-secondary)] italic leading-relaxed">
                                                    &quot;{npc.quote}&quot;
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <div className="flex items-center gap-2 text-[10px] text-[var(--wd-text-muted)]">
                                                    <span className="text-[var(--wd-danger)]">
                                                        STR
                                                    </span>
                                                    <div className="flex-1 h-1 bg-[var(--wd-surface-panel-2)] rounded-full">
                                                        <div
                                                            className="h-full bg-[var(--wd-danger)]"
                                                            style={{
                                                                width: `${npc.stats.str}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-[var(--wd-text-muted)]">
                                                    <span className="text-[var(--wd-info)]">
                                                        INT
                                                    </span>
                                                    <div className="flex-1 h-1 bg-[var(--wd-surface-panel-2)] rounded-full">
                                                        <div
                                                            className="h-full bg-[var(--wd-info)]"
                                                            style={{
                                                                width: `${npc.stats.int}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
