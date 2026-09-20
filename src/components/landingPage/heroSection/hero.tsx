import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import VirtualInterface from "./virtualInterface";
import { Floaties, SPRITES } from "../floaties/floaties";

export function Hero() {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 200], [0, 150]);
    const y2 = useTransform(scrollY, [0, 500], [0, -250]);
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const heroY = useTransform(scrollY, [0, 400], [0, -60]);
    const glowY1 = useTransform(scrollY, [0, 600], [0, -80]);
    const glowY2 = useTransform(scrollY, [0, 600], [0, -120]);

    const [mousePosition, setMousePosition] = useState({
        x: 0,
        y: 0,
    });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20,
            });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--wd-surface-base)] pt-20">
            <Floaties
                fade={heroOpacity}
                items={[
                    { ...SPRITES.plant, top: "16%", left: "1%", drift: -180, display: 70, rotate: -6 },
                    { ...SPRITES.coffee, top: "82%", left: "3%", drift: -95, display: 42, rotate: 5 },
                    { ...SPRITES.star, top: "12%", right: "6%", drift: -260, display: 38, opacity: 0.9 },
                    { ...SPRITES.pizza, top: "88%", right: "3%", drift: -140, display: 44, rotate: -10 },
                ]}
            />

            {/* Ambient accent glow blobs */}
            <motion.div
                style={{
                    x: mousePosition.x * 10,
                    y: glowY1,
                }}
                className="wd-landing-glow top-1/4 right-1/3 w-64 h-64"
            />
            <motion.div
                style={{
                    x: mousePosition.x * -8,
                    y: glowY2,
                }}
                className="wd-landing-glow top-1/3 left-1/4 w-96 h-96 opacity-15"
            />

            <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                    style={{ opacity: heroOpacity, y: heroY }}
                    initial={{
                        opacity: 0,
                        x: -50,
                    }}
                    animate={{
                        opacity: 1,
                        x: 0,
                    }}
                    transition={{
                        duration: 0.8,
                        ease: "easeOut",
                    }}
                    className="text-left"
                >
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        transition={{
                            delay: 0.2,
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--wd-landing-accent-soft)] border border-[var(--wd-landing-accent)]/30 rounded-full text-[var(--wd-landing-accent)] text-xs font-medium mb-6"
                    >
                        <span className="w-2 h-2 bg-[var(--wd-landing-accent)] rounded-full animate-pulse" />
                        Now in Early Access
                    </motion.div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--wd-text-primary)] mb-6 leading-tight tracking-tight">
                        The room&rsquo;s <br />
                        <span className="text-[var(--wd-landing-accent)]">
                            already open.
                        </span>
                    </h1>

                    <p className="text-lg text-[var(--wd-text-muted)] mb-8 max-w-xl leading-relaxed">
                        WorkDash keeps one room running for your friend group
                        &mdash; a voice call nobody has to start, and a small
                        world you can actually walk around in. Open the tab, see
                        who&rsquo;s on, sit down.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/app"
                            className="wd-landing-btn-primary flex-1 justify-center"
                        >
                            Open the room{" "}
                            <ArrowRightIcon className="w-4 h-4" />
                        </Link>

                        <a
                            href="#demo"
                            className="wd-landing-btn-secondary flex-1 justify-center"
                        >
                            <PlayIcon className="w-4 h-4" />
                            Look inside first
                        </a>
                    </div>

                    <div className="mt-12 flex items-center gap-3 border-t border-[var(--wd-border-subtle)] pt-8 text-sm text-[var(--wd-text-muted)]">
                        <span className="w-2 h-2 rounded-full bg-[var(--wd-success)]" />
                        Free while we build it. No card, no tiers, no seats.
                    </div>
                </motion.div>

                {/* Visual/Interactive Side */}
                <VirtualInterface y1={y1} y2={y2} />
            </div>

            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50"
                animate={{
                    y: [0, 10, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                }}
            >
                <div className="text-xs uppercase tracking-widest text-[var(--wd-landing-accent)] font-semibold z-10">
                    Scroll to Start
                </div>
                <div className="w-px h-12 bg-gradient-to-b from-[var(--wd-landing-accent)] to-transparent" />
            </motion.div>
        </section>
    );
}
