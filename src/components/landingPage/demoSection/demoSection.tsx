import React from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { Gamepad2Icon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export function DemoSection() {
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "center center"],
    });
    const rotateX = useTransform(scrollYProgress, [0, 1], [8, 0]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [0.6, 1]);

    return (
        <section
            id="demo"
            ref={sectionRef}
            className="py-24 bg-[var(--wd-surface-panel-2)] border-y border-[var(--wd-border-subtle)] relative overflow-hidden"
        >
            <div className="max-w-7xl mx-auto px-6 text-center relative z-10" style={{ perspective: "1200px" }}>
                <motion.div
                    style={{ rotateX, opacity }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative rounded-2xl overflow-hidden border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)] shadow-2xl"
                >
                    {/* Browser chrome */}
                    <div className="h-10 bg-[var(--wd-surface-panel-2)] flex items-center px-4 gap-2 border-b border-[var(--wd-border-subtle)]">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[var(--wd-danger)]" />
                            <div className="w-3 h-3 rounded-full bg-[var(--wd-warning)]" />
                            <div className="w-3 h-3 rounded-full bg-[var(--wd-success)]" />
                        </div>
                        <div className="flex-1 text-center">
                            <div className="inline-block px-4 py-1 bg-[var(--wd-surface-base)] rounded text-[10px] text-[var(--wd-text-muted)]">
                                https:
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/app"
                        className="relative aspect-[2000/1337] group block"
                    >
                        <Image
                            src="/assets/lounge.webp"
                            alt="The Workdash world: a top-down pixel lounge with bookshelves, couches and a player by the coffee table, and a control bar showing microphone, camera and who is online."
                            fill
                            className="object-cover opacity-80 group-hover:opacity-40 transition-opacity duration-500"
                        />

                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="w-20 h-20 bg-[var(--wd-landing-accent)] rounded-full flex items-center justify-center shadow-lg z-20"
                            >
                                <Gamepad2Icon className="w-8 h-8 text-[var(--wd-surface-base)]" />
                            </motion.div>
                        </div>

                        <div className="absolute bottom-8 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--wd-surface-base)]/50 backdrop-blur rounded-full text-[var(--wd-landing-accent)] text-sm border border-[var(--wd-landing-accent)]/30">
                                <Gamepad2Icon className="w-4 h-4" /> Open the room
                            </span>
                        </div>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
