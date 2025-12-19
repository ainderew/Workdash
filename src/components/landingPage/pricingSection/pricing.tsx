import React from "react";
import { motion } from "framer-motion";
import { CheckIcon, SwordIcon, ShieldIcon } from "lucide-react";
const tiers = [
    {
        name: "Small Party",
        level: 1,
        price: "0",
        icon: SwordIcon,
        color: "cyan",
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
        price: "5",
        icon: ShieldIcon,
        color: "purple",
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
export function Pricing() {
    return (
        <section
            id="pricing"
            className="py-32 bg-slate-950 relative overflow-hidden"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        CHOOSE YOUR{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                            DIFFICULTY
                        </span>
                    </h2>
                    <p className="text-slate-400">
                        Scale your server capacity as your guild grows.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
                    {tiers.map((tier, index) => {
                        const isHighlight = tier.highlight;
                        const colorClass =
                            tier.color === "cyan"
                                ? "text-cyan-400 border-cyan-500/30"
                                : tier.color === "purple"
                                  ? "text-purple-400 border-purple-500/30"
                                  : "text-yellow-400 border-yellow-500/30";
                        const bgClass =
                            tier.color === "cyan"
                                ? "bg-cyan-500"
                                : tier.color === "purple"
                                  ? "bg-purple-500"
                                  : "bg-yellow-500";
                        return (
                            <motion.div
                                key={tier.name}
                                initial={{
                                    opacity: 0,
                                    y: 50,
                                }}
                                whileInView={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                viewport={{
                                    once: true,
                                }}
                                transition={{
                                    delay: index * 0.1,
                                }}
                                className={`
                  relative group min-h-full flex flex-col rounded-2xl p-8 border-2 transition-all duration-300
                  ${isHighlight ? "bg-slate-900/80 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.15)]  z-10" : "bg-slate-900/50 border-slate-800 hover:border-slate-600"}
                `}
                            >
                                {isHighlight && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                        Best Value
                                    </div>
                                )}

                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div
                                            className={`text-sm font-mono font-bold uppercase mb-1 ${tier.color === "cyan" ? "text-cyan-400" : tier.color === "purple" ? "text-purple-400" : "text-yellow-400"}`}
                                        >
                                            LVL {tier.level}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">
                                            {tier.name}
                                        </h3>
                                    </div>
                                    <div
                                        className={`p-3 rounded-xl bg-slate-800 ${colorClass} border`}
                                    >
                                        <tier.icon className="w-6 h-6" />
                                    </div>
                                </div>

                                {/* XP Bar */}
                                <div className="w-full h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
                                    <motion.div
                                        initial={{
                                            width: 0,
                                        }}
                                        whileInView={{
                                            width: `${tier.xp}%`,
                                        }}
                                        transition={{
                                            duration: 1,
                                            delay: 0.5,
                                        }}
                                        className={`h-full ${bgClass}`}
                                    />
                                </div>

                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl font-bold text-white">
                                        {tier.price === "Custom"
                                            ? "Custom"
                                            : `$${tier.price}`}
                                    </span>
                                    {tier.price !== "Custom" && (
                                        <span className="text-slate-500">
                                            /mo
                                        </span>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    {tier.features.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-center gap-3 text-sm text-slate-300"
                                        >
                                            <CheckIcon
                                                className={`w-4 h-4 ${tier.color === "cyan" ? "text-cyan-400" : tier.color === "purple" ? "text-purple-400" : "text-yellow-400"}`}
                                            />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <button
                                    className={`
                  w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all mt-auto
                  ${isHighlight ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25" : "bg-slate-800 text-white hover:bg-slate-700"}
                `}
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
