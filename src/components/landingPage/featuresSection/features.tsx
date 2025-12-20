import React from "react";
import { motion } from "framer-motion";
import { VideoIcon, MicIcon, UsersIcon, SparklesIcon } from "lucide-react";
type FeatureType = "walk-talk" | "video-pods" | "reactions" | "presence";
interface Feature {
    id: string;
    type: FeatureType;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
}
const features: Feature[] = [
    {
        id: "f1",
        type: "walk-talk",
        title: "Proximity Chat",
        description:
            "Just walk up to a colleague to start talking. Audio fades in naturally as you approach, just like in real life.",
        icon: MicIcon,
        color: "text-cyan-600 dark:text-cyan-400",
    },
    {
        id: "f2",
        type: "video-pods",
        title: "Instant Video Pods",
        description:
            "Step into a meeting room and your video feed instantly pops up. No links, no waiting rooms, just presence.",
        icon: VideoIcon,
        color: "text-purple-600 dark:text-purple-400",
    },
    {
        id: "f3",
        type: "reactions",
        title: "Expressive Emotes",
        description:
            "Send coffee, throw confetti, or dance. Rich interactions that bring joy back to remote work.",
        icon: SparklesIcon,
        color: "text-pink-600 dark:text-pink-400",
    },
    {
        id: "f4",
        type: "presence",
        title: "Live Presence Zones",
        description:
            "See where everyone is at a glance. Focus zones, social lounges, and collaboration tables.",
        icon: UsersIcon,
        color: "text-yellow-600 dark:text-yellow-400",
    },
];
// Micro-interaction Components
const WalkTalkDemo = () => (
    <div className="relative w-full h-full bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        {/* Avatar 1 (User) */}
        <motion.div
            className="absolute"
            animate={{
                x: [-50, -20, -20, -50],
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            <img
                src="/assets/landing-male.png"
                alt=""
                className="w-12 h-12 drop-shadow-[0_0_15px_rgba(0,243,255,0.5)] z-10 relative object-cover"
            />
            {/* <div className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-950 font-bold bg-[url('/assets/landing-female.png')] bg-cover bg-center" /> */}
            <motion.div
                className="absolute -top-10 -right-20 bg-white dark:bg-white text-slate-900 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                animate={{
                    opacity: [0, 1, 1, 0],
                    scale: [0.8, 1, 1, 0.8],
                }}
                transition={{
                    duration: 4,
                    times: [0, 0.4, 0.6, 1],
                    repeat: Infinity,
                }}
            >
                Hey, got a sec?
            </motion.div>
        </motion.div>

        {/* Avatar 2 (Target) */}
        <div className="absolute translate-x-10">
            {/* <div className="w-12 h-12 bg-purple-500 rounded-lg shadow-[0_0_15px_rgba(188,19,254,0.5)]" /> */}
            <img
                src="/assets/landing-female.png"
                alt=""
                className="w-12 h-12 drop-shadow-[0_0_15px_rgba(188,19,254,0.5)] z-10 relative object-cover"
            />
            <motion.div
                className="absolute top-15 -left-20 bg-white dark:bg-white text-slate-900 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                animate={{
                    opacity: [0, 0, 1, 0],
                    scale: [0.8, 0.8, 1, 0.8],
                }}
                transition={{
                    duration: 4,
                    times: [0, 0.5, 0.7, 1],
                    repeat: Infinity,
                }}
            >
                Sure, what&apos;s up?
            </motion.div>
        </div>

        {/* Audio Waves */}
        <motion.div
            className="absolute w-32 h-32 border-2 border-cyan-500/30 rounded-full"
            animate={{
                scale: [0.5, 1.2],
                opacity: [1, 0],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
            }}
        />
    </div>
);
const VideoPodsDemo = () => (
    <div className="relative w-full h-full bg-slate-100/50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        {/* Meeting Room Floor */}
        <div className="w-48 h-32 border-2 border-slate-400 dark:border-slate-600 rounded-xl relative mb-4 bg-slate-200/50 dark:bg-slate-800/30">
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
                MEETING_ROOM_01
            </div>
            {/* Avatar enters */}

            <motion.div
                className="absolute bottom-2 left-2 w-8 h-8 rounded shadow-lg"
                animate={{
                    x: [0, 80],
                    y: [0, -40],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                }}
            >
                <img
                    src="/assets/landing-female.png"
                    alt=""
                    className="w-12 h-12 drop-shadow-[0_0_15px_rgba(188,19,254,0.5)] z-10 relative object-cover"
                />
            </motion.div>
        </div>

        {/* Video Popup */}
        <motion.div
            className="absolute top-8 right-8 w-32 h-20 bg-slate-100 dark:bg-slate-800 border border-purple-500 rounded-lg shadow-2xl overflow-hidden z-20"
            initial={{
                scale: 0,
                opacity: 0,
            }}
            animate={{
                scale: [0, 1, 1, 0],
                opacity: [0, 1, 1, 0],
            }}
            transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.5,
            }}
        >
            <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <VideoIcon className="w-8 h-8 text-slate-500" />
            </div>
            <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
        </motion.div>
    </div>
);
const ReactionsDemo = () => (
    <div className="relative w-full h-full bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="relative">
            <img
                className="w-16 h-16 rounded-xl flex items-center justify-center drop-shadow-[0_0_15px_rgba(188,19,254,0.5)] z-10 relative object-cover"
                src="/assets/landing-female.png"
                alt=""
            />

            {/* Emojis floating up */}
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    className="absolute top-0 left-1/2 text-2xl"
                    animate={{
                        y: [0, -80 - i * 20],
                        x: [0, i % 2 === 0 ? 20 : -20],
                        opacity: [1, 0],
                        scale: [0.5, 1.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                        ease: "easeOut",
                    }}
                >
                    {i === 1 ? "🎉" : i === 2 ? "☕️" : "🔥"}
                </motion.div>
            ))}
        </div>
    </div>
);
const PresenceDemo = () => (
    <div className="relative w-full h-full bg-slate-100/50 dark:bg-slate-900/50 p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="grid grid-cols-2 gap-4 h-full">
            <div className="border border-green-600/30 dark:border-green-500/30 bg-green-600/5 dark:bg-green-500/5 rounded-lg p-2 relative">
                <div className="text-[10px] text-green-600 dark:text-green-400 font-mono mb-2">
                    FOCUS_ZONE
                </div>
                <div className="flex gap-1">
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded opacity-50" />
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded opacity-50" />
                </div>
            </div>
            <div className="border border-yellow-600/30 dark:border-yellow-500/30 bg-yellow-600/5 dark:bg-yellow-500/5 rounded-lg p-2 relative">
                <div className="text-[10px] text-yellow-600 dark:text-yellow-400 font-mono mb-2">
                    LUNCH_AREA
                </div>
                <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            className="w-6 h-6 bg-yellow-500 rounded"
                            animate={{
                                y: [0, -2, 0],
                            }}
                            transition={{
                                duration: 0.5,
                                delay: i * 0.1,
                                repeat: Infinity,
                                repeatDelay: 2,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
);
export function Features() {
    return (
        <section
            id="features"
            className="py-32 bg-slate-50 dark:bg-slate-950 relative overflow-hidden"
        >
            {/* Section Header */}
            <div className="max-w-7xl mx-auto px-6 mb-24 text-center relative z-10">
                <motion.h2
                    initial={{
                        opacity: 0,
                        y: 20,
                    }}
                    whileInView={{
                        opacity: 1,
                        y: 0,
                    }}
                    viewport={{
                        once: true,
                    }}
                    className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6"
                >
                    GAMEPLAY{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                        FEATURES
                    </span>
                </motion.h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
                    Work doesn&apos;t have to be boring. We&apos;ve gamified the
                    office experience to bring back serendipity and culture.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-6 space-y-32">
                {features.map((feature, index) => {
                    const isEven = index % 2 === 0;
                    const DemoComponent = {
                        "walk-talk": WalkTalkDemo,
                        "video-pods": VideoPodsDemo,
                        reactions: ReactionsDemo,
                        presence: PresenceDemo,
                    }[feature.type];
                    return (
                        <motion.div
                            key={feature.id}
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
                                margin: "-100px",
                            }}
                            transition={{
                                duration: 0.8,
                            }}
                            className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-12 lg:gap-24`}
                        >
                            {/* Interactive Module */}
                            <div className="w-full lg:w-1/2 aspect-video relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50" />
                                <div className="relative h-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xl group-hover:border-cyan-500/50 transition-colors duration-300">
                                    {/* HUD Header */}
                                    <div className="h-8 bg-slate-200/50 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700 flex items-center px-4 justify-between">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500 uppercase">
                                            Module_{feature.id}
                                        </div>
                                    </div>

                                    {/* Demo Content */}
                                    <div className="h-[calc(100%-2rem)]">
                                        <DemoComponent />
                                    </div>
                                </div>
                            </div>

                            {/* Text Content */}
                            <div
                                className={`w-full lg:w-1/2 ${isEven ? "text-left" : "text-left lg:text-right"}`}
                            >
                                <div
                                    className={`inline-flex items-center gap-2 mb-4 ${feature.color}`}
                                >
                                    <feature.icon className="w-6 h-6" />
                                    <span className="font-mono text-sm font-bold uppercase tracking-wider">
                                        System Active
                                    </span>
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {feature.description}
                                </p>

                                <button
                                    className={`mt-8 text-sm font-bold uppercase tracking-widest ${feature.color} hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 ${isEven ? "" : "lg:ml-auto"}`}
                                >
                                    Learn More{" "}
                                    <span className="text-lg">→</span>
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
