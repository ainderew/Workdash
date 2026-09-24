import React from "react";
import Image from "next/image";
import { motion, useTransform, MotionValue } from "framer-motion";

interface VirtualInterfaceProps {
    y1: MotionValue<number>;
    y2: MotionValue<number>;
}

export default function VirtualInterface({ y1, y2 }: VirtualInterfaceProps) {
    const videoBubble1Y = useTransform(y2, (value) => value * 1);
    const videoBubble2Y = useTransform(y2, (value) => value * 0.6);

    return (
        <motion.div
            style={{ y: y1 }}
            className="relative hidden lg:block h-[600px] w-full"
        >
            <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border-4 border-[var(--wd-border-subtle)]">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: "url('/assets/virtual-office-bg.png')",
                    }}
                />

                <div className="absolute inset-0 bg-[var(--wd-surface-base)]/10" />

                {/* Character: You */}
                <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute top-[52%] left-[45%]"
                >
                    <div className="relative">
                        <Image
                            src="/assets/landing-male.png"
                            alt=""
                            width={40}
                            height={40}
                            className="w-10 h-10 drop-shadow-md z-10 relative object-contain"
                        />
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--wd-surface-panel)]/90 px-2 py-0.5 rounded text-[10px] text-[var(--wd-text-primary)] whitespace-nowrap flex items-center gap-1 shadow-lg">
                            <span className="w-1.5 h-1.5 bg-[var(--wd-success)] rounded-full" />
                            You
                        </div>
                    </div>
                </motion.div>

                {/* Character: Manuelene */}
                <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.3,
                    }}
                    className="absolute top-[48%] right-[32%]"
                >
                    <div className="relative">
                        <Image
                            src="/assets/landing-female.png"
                            alt=""
                            width={40}
                            height={40}
                            className="w-10 h-10 drop-shadow-md z-10 relative object-contain"
                        />
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--wd-surface-panel)]/90 px-2 py-0.5 rounded text-[10px] text-[var(--wd-text-primary)] whitespace-nowrap flex items-center gap-1 shadow-lg">
                            <span className="w-1.5 h-1.5 bg-[var(--wd-success)] rounded-full" />
                            Manuelene
                        </div>
                    </div>
                </motion.div>

                {/* Video bubbles */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-2">
                    <motion.div
                        style={{ y: videoBubble1Y }}
                        className="w-28 h-20 bg-[var(--wd-surface-panel-2)] rounded-lg border-2 border-[var(--wd-border-subtle)] overflow-hidden relative shadow-xl"
                    >
                        <video
                            poster="/assets/workdash-video-call-you-poster.9f74c3bb.webp"
                            autoPlay
                            loop
                            muted
                            playsInline
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover"
                        >
                            {/* This mock UI only shows at lg+, so phones skip the download.
                                Encoded at 2x the tile size (224x160), no audio. */}
                            <source
                                src="/assets/workdash-video-call-you.b64741ee.mp4"
                                type="video/mp4"
                                media="(min-width: 1024px)"
                            />
                        </video>
                        <div className="absolute bottom-1 left-1 bg-[var(--wd-surface-panel)]/90 px-1.5 py-0.5 rounded text-[8px] text-[var(--wd-text-primary)] flex items-center gap-1">
                            <span className="w-1 h-1 bg-[var(--wd-success)] rounded-full" />
                            You
                        </div>
                    </motion.div>
                    <motion.div
                        style={{ y: videoBubble2Y }}
                        className="w-28 h-20 bg-[var(--wd-surface-panel-2)] rounded-lg border-2 border-[var(--wd-border-subtle)] overflow-hidden relative shadow-xl"
                    >
                        <video
                            poster="/assets/female-video-call-placeholder.jpg"
                            autoPlay
                            loop
                            muted
                            playsInline
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover"
                        >
                            <source
                                src="/assets/female-video-call.mp4"
                                type="video/mp4"
                                media="(min-width: 1024px)"
                            />
                        </video>
                    </motion.div>
                </div>

                {/* Control bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[var(--wd-surface-panel)]/95 backdrop-blur-sm rounded-lg px-4 py-2 border border-[var(--wd-border-subtle)] shadow-xl">
                    <div className="flex items-center gap-2 pr-3 border-r border-[var(--wd-border-subtle)]">
                        <div className="w-7 h-7 rounded-full bg-[var(--wd-success)] flex items-center justify-center text-[10px] font-bold text-white">
                            A
                        </div>
                        <div className="text-[10px]">
                            <div className="text-[var(--wd-text-primary)] font-medium">
                                Andrew
                            </div>
                            <div className="text-[var(--wd-success)]">Available</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button className="w-8 h-8 rounded-full bg-[var(--wd-surface-panel-2)] hover:bg-[var(--wd-surface-elevated)] flex items-center justify-center text-[var(--wd-text-secondary)] transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
                            </svg>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-[var(--wd-surface-panel-2)] hover:bg-[var(--wd-landing-accent)] flex items-center justify-center text-white transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                            </svg>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-[var(--wd-danger)] hover:bg-[var(--wd-danger)]/80 flex items-center justify-center text-white transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                            </svg>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-[var(--wd-surface-panel-2)] hover:bg-[var(--wd-surface-elevated)] flex items-center justify-center text-[var(--wd-text-secondary)] transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                            </svg>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-[var(--wd-surface-panel-2)] hover:bg-[var(--wd-surface-elevated)] flex items-center justify-center text-[var(--wd-text-secondary)] transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--wd-border-subtle)]">
                        <svg
                            className="w-4 h-4 text-[var(--wd-text-muted)]"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                        <span className="text-[10px] text-[var(--wd-text-primary)]">
                            2 Online
                        </span>
                        <span className="w-1.5 h-1.5 bg-[var(--wd-success)] rounded-full" />
                    </div>
                </div>
            </div>

            {/* Floating user card */}
            <motion.div
                style={{ y: y2 }}
                className="absolute -right-12 top-20 w-48 p-4 bg-[var(--wd-surface-panel)]/90 backdrop-blur border border-[var(--wd-border-subtle)] rounded-lg shadow-xl z-20"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded bg-[var(--wd-success)] flex items-center justify-center text-xs font-bold text-white">
                        JS
                    </div>
                    <div>
                        <div className="text-xs font-bold text-[var(--wd-text-primary)]">
                            Andrew Pinon
                        </div>
                        <div className="text-[10px] text-[var(--wd-success)]">
                            Online &bull; In Meeting
                        </div>
                    </div>
                </div>
                <div className="h-1 w-full bg-[var(--wd-surface-panel-2)] rounded-full overflow-hidden">
                    <div className="h-full w-full bg-[var(--wd-success)] animate-pulse" />
                </div>
            </motion.div>

            {/* Chat bubble */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                className="absolute top-[46%] left-[48%] bg-[var(--wd-surface-panel)] text-[var(--wd-text-primary)] px-3 py-1.5 rounded-lg rounded-bl-none text-xs font-bold shadow-lg z-30"
            >
                Let&apos;s sync up! 💬
            </motion.div>
        </motion.div>
    );
}
