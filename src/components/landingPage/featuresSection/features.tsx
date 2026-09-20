import React from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { VideoIcon, MicIcon, UsersIcon, SparklesIcon } from "lucide-react";
import { useRef } from "react";

interface Feature {
    id: string;
    type: "walk-talk" | "video-pods" | "reactions" | "presence";
    title: string;
    description: string;
    icon: React.ElementType;
}

const features: Feature[] = [
    {
        id: "f1",
        type: "walk-talk",
        title: "Proximity Chat",
        description:
            "Walk over to whoever is around and start talking. Audio fades in as you get close and fades out when you wander off, the way a room works.",
        icon: MicIcon,
    },
    {
        id: "f2",
        type: "video-pods",
        title: "Instant Video Pods",
        description:
            "Step into a room and your camera comes up on its own. No link to send, nothing to ring, no waiting room to sit in.",
        icon: VideoIcon,
    },
    {
        id: "f3",
        type: "reactions",
        title: "Expressive Emotes",
        description:
            "Send coffee, throw confetti, or dance. The chrome stays calm; the moments are where the noise goes.",
        icon: SparklesIcon,
    },
    {
        id: "f4",
        type: "presence",
        title: "Always Know Who Is On",
        description:
            "One glance tells you who is on the couch, who is queuing, and who is heads-down. When nobody is on, it says that and leaves you alone.",
        icon: UsersIcon,
    },
];

function DemoWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative w-full h-full bg-[var(--wd-surface-panel-2)] flex items-center justify-center overflow-hidden">
            {children}
        </div>
    );
}

function WalkTalkDemo({ isActive }: { isActive: boolean }) {
    return (
        <DemoWrapper>
            <motion.div
                className="absolute"
                animate={
                    isActive
                        ? { x: [-50, -20, -20, -50] }
                        : { x: -50 }
                }
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <Image
                    src="/assets/landing-male.png"
                    alt=""
                    width={48}
                    height={48}
                    className="w-12 h-12 drop-shadow-md z-10 relative object-cover"
                />
                <motion.div
                    className="absolute -top-10 -right-20 bg-[var(--wd-surface-panel)] text-[var(--wd-text-primary)] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                    animate={
                        isActive
                            ? {
                                  opacity: [0, 1, 1, 0],
                                  scale: [0.8, 1, 1, 0.8],
                              }
                            : { opacity: 0 }
                    }
                    transition={{
                        duration: 4,
                        times: [0, 0.4, 0.6, 1],
                        repeat: Infinity,
                    }}
                >
                    Hey, got a sec?
                </motion.div>
            </motion.div>

            <div className="absolute translate-x-10">
                <Image
                    src="/assets/landing-female.png"
                    alt=""
                    width={48}
                    height={48}
                    className="w-12 h-12 drop-shadow-md z-10 relative object-cover"
                />
                <motion.div
                    className="absolute top-15 -left-20 bg-[var(--wd-surface-panel)] text-[var(--wd-text-primary)] px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
                    animate={
                        isActive
                            ? {
                                  opacity: [0, 0, 1, 0],
                                  scale: [0.8, 0.8, 1, 0.8],
                              }
                            : { opacity: 0 }
                    }
                    transition={{
                        duration: 4,
                        times: [0, 0.5, 0.7, 1],
                        repeat: Infinity,
                    }}
                >
                    Sure, what&apos;s up?
                </motion.div>
            </div>

            <motion.div
                className="absolute w-32 h-32 border-2 border-[var(--wd-landing-accent)]/30 rounded-full"
                animate={
                    isActive
                        ? { scale: [0.5, 1.2], opacity: [1, 0] }
                        : { scale: 0.5, opacity: 0 }
                }
                transition={{
                    duration: 2,
                    repeat: Infinity,
                }}
            />
        </DemoWrapper>
    );
}

function VideoPodsDemo({ isActive }: { isActive: boolean }) {
    return (
        <DemoWrapper>
            <div className="w-48 h-32 border-2 border-[var(--wd-border-subtle)] rounded-xl relative mb-4 bg-[var(--wd-surface-panel)]/30">
                <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--wd-text-muted)]">
                    Meeting Room
                </div>

                <motion.div
                    className="absolute bottom-2 left-2 w-8 h-8 rounded shadow-lg"
                    animate={
                        isActive
                            ? { x: [0, 80], y: [0, -40] }
                            : { x: 0, y: 0 }
                    }
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse",
                    }}
                >
                    <Image
                        src="/assets/landing-female.png"
                        alt=""
                        width={48}
                        height={48}
                        className="w-12 h-12 drop-shadow-md z-10 relative object-cover"
                    />
                </motion.div>
            </div>

            <motion.div
                className="absolute top-8 right-8 w-32 h-20 bg-[var(--wd-surface-panel-2)] border border-[var(--wd-landing-accent)] rounded-lg shadow-2xl overflow-hidden z-20"
                initial={{ scale: 0, opacity: 0 }}
                animate={
                    isActive
                        ? {
                              scale: [0, 1, 1, 0],
                              opacity: [0, 1, 1, 0],
                          }
                        : { scale: 0, opacity: 0 }
                }
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: 0.5,
                }}
            >
                <div className="w-full h-full bg-[var(--wd-surface-elevated)] flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-[var(--wd-text-muted)]" />
                </div>
                <div className="absolute bottom-1 right-1 w-2 h-2 bg-[var(--wd-success)] rounded-full" />
            </motion.div>
        </DemoWrapper>
    );
}

function ReactionsDemo({ isActive }: { isActive: boolean }) {
    return (
        <DemoWrapper>
            <div className="relative">
                <Image
                    className="w-16 h-16 rounded-xl flex items-center justify-center drop-shadow-md z-10 relative object-cover"
                    src="/assets/landing-female.png"
                    alt=""
                    width={64}
                    height={64}
                />

                {[1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute top-0 left-1/2 text-2xl"
                        animate={
                            isActive
                                ? {
                                      y: [0, -80 - i * 20],
                                      x: [0, i % 2 === 0 ? 20 : -20],
                                      opacity: [1, 0],
                                      scale: [0.5, 1.5],
                                  }
                                : { opacity: 0 }
                        }
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
        </DemoWrapper>
    );
}

function PresenceDemo({ isActive }: { isActive: boolean }) {
    return (
        <div className="relative w-full h-full bg-[var(--wd-surface-panel-2)] p-6">
            <div className="grid grid-cols-2 gap-4 h-full">
                <div className="border border-[var(--wd-success)]/30 bg-[var(--wd-success)]/5 rounded-lg p-2 relative">
                    <div className="text-[10px] text-[var(--wd-success)] font-medium mb-2">
                        Focus Zone
                    </div>
                    <div className="flex gap-1">
                        <div className="w-6 h-6 bg-[var(--wd-surface-elevated)] rounded opacity-50" />
                        <div className="w-6 h-6 bg-[var(--wd-surface-elevated)] rounded opacity-50" />
                    </div>
                </div>
                <div className="border border-[var(--wd-warning)]/30 bg-[var(--wd-warning)]/5 rounded-lg p-2 relative">
                    <div className="text-[10px] text-[var(--wd-warning)] font-medium mb-2">
                        Lunch Area
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                className="w-6 h-6 bg-[var(--wd-warning)] rounded"
                                animate={
                                    isActive
                                        ? { y: [0, -2, 0] }
                                        : { y: 0 }
                                }
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
}

function FeatureCard({
    feature,
    index,
}: {
    feature: Feature;
    index: number;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, margin: "-100px" });
    const isEven = index % 2 === 0;

    const DemoComponent = {
        "walk-talk": WalkTalkDemo,
        "video-pods": VideoPodsDemo,
        reactions: ReactionsDemo,
        presence: PresenceDemo,
    }[feature.type];

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-12 lg:gap-24`}
        >
            {/* Demo panel */}
            <motion.div
                initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-full lg:w-1/2 aspect-video relative group"
            >
                <div className="relative h-full bg-[var(--wd-surface-panel)] border border-[var(--wd-border-subtle)] rounded-2xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-300">
                    {/* Mini toolbar */}
                    <div className="h-8 bg-[var(--wd-surface-panel-2)] border-b border-[var(--wd-border-subtle)] flex items-center px-4 justify-between">
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[var(--wd-border-subtle)]" />
                            <div className="w-2 h-2 rounded-full bg-[var(--wd-border-subtle)]" />
                            <div className="w-2 h-2 rounded-full bg-[var(--wd-border-subtle)]" />
                        </div>
                        <div className="text-[10px] text-[var(--wd-text-muted)]">
                            {feature.title}
                        </div>
                    </div>

                    <div className="h-[calc(100%-2rem)]">
                        <DemoComponent isActive={isInView} />
                    </div>
                </div>
            </motion.div>

            {/* Text content */}
            <motion.div
                initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={`w-full lg:w-1/2 ${isEven ? "text-left" : "text-left lg:text-right"}`}
            >
                <div
                    className={`inline-flex items-center gap-2 mb-4 text-[var(--wd-landing-accent)]`}
                >
                    <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-[var(--wd-text-primary)] mb-6 leading-tight">
                    {feature.title}
                </h3>
                <p className="text-lg text-[var(--wd-text-muted)] leading-relaxed">
                    {feature.description}
                </p>
            </motion.div>
        </motion.div>
    );
}

export function Features() {
    return (
        <section
            id="features"
            className="py-32 bg-[var(--wd-surface-base)] relative overflow-hidden"
        >
            <div className="max-w-7xl mx-auto px-6 mb-24 text-center relative z-10">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-5xl font-bold text-[var(--wd-text-primary)] mb-6"
                >
                    What it actually{" "}
                    <span className="text-[var(--wd-landing-accent)]">
                        does
                    </span>
                </motion.h2>
                <p className="text-[var(--wd-text-muted)] max-w-2xl mx-auto text-lg">
                    Built for a friend group that keeps a call open at night, not
                    for a company that wants a virtual office.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-6 space-y-32">
                {features.map((feature, index) => (
                    <FeatureCard
                        key={feature.id}
                        feature={feature}
                        index={index}
                    />
                ))}
            </div>
        </section>
    );
}
