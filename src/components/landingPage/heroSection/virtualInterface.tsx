import React from "react";
import { motion, useTransform, MotionValue } from "framer-motion";

interface VirtualInterfaceProps {
    y1: MotionValue<number>;
    y2: MotionValue<number>;
}

// Virtual office component using actual app screenshot as background
export default function VirtualInterface({ y1, y2 }: VirtualInterfaceProps) {
    // Create variable speeds for video bubbles - same direction, different speeds
    const videoBubble1Y = useTransform(y2, (value) => value * 1);
    const videoBubble2Y = useTransform(y2, (value) => value * 0.6);

    return (
        <motion.div
            style={{ y: y1 }}
            className="relative hidden lg:block h-[600px] w-full"
        >
            {/* Main Container */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-300 dark:border-slate-700">
                {/* Background Image - The actual app screenshot */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: "url('/assets/virtual-office-bg.png')",
                    }}
                />

                {/* Overlay for slight darkening/contrast if needed */}
                <div className="absolute inset-0 bg-white/10 dark:bg-black/10" />

                {/* Character 1 - You (positioned in the meeting room area) */}
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
                        <img
                            src="/assets/landing-male.png"
                            alt=""
                            className="w-10 h-10 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)] z-10 relative object-contain"
                        />
                        {/* Name tag */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded text-[10px] text-slate-900 dark:text-white whitespace-nowrap flex items-center gap-1 shadow-lg">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                            You
                        </div>
                    </div>
                </motion.div>

                {/* Character 2 - Marj (positioned near the couches) */}
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
                        <img
                            src="/assets/landing-female.png"
                            alt=""
                            className="w-10 h-10 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)] z-10 relative object-contain"
                        />
                        {/* Name tag */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded text-[10px] text-slate-900 dark:text-white whitespace-nowrap flex items-center gap-1 shadow-lg">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                            Marj
                        </div>
                    </div>
                </motion.div>

                {/* Video call bubbles */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2">
                    <motion.div
                        style={{ y: videoBubble1Y }}
                        className="w-28 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-600 overflow-hidden relative shadow-xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 dark:from-slate-700 to-slate-300 dark:to-slate-900" />
                        {/* Placeholder for video - could use actual image */}
                        <div className="absolute inset-2 bg-slate-400/50 dark:bg-slate-600/50 rounded" />
                        <div className="absolute bottom-1 left-1 bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded text-[8px] text-slate-900 dark:text-white flex items-center gap-1">
                            <span className="w-1 h-1 bg-green-400 rounded-full" />
                            You
                        </div>
                    </motion.div>
                    <motion.div
                        style={{ y: videoBubble2Y }}
                        className="w-28 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-600 overflow-hidden relative shadow-xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 dark:from-slate-700 to-slate-300 dark:to-slate-900" />
                        <div className="absolute inset-2 bg-slate-400/50 dark:bg-slate-600/50 rounded" />
                    </motion.div>
                </div>

                {/* Bottom Control Bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-full px-4 py-2 border border-slate-300 dark:border-slate-600 shadow-xl">
                    {/* User avatar */}
                    <div className="flex items-center gap-2 pr-3 border-r border-slate-300 dark:border-slate-600">
                        <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-[10px] font-bold text-white">
                            A
                        </div>
                        <div className="text-[10px]">
                            <div className="text-slate-900 dark:text-white font-medium">Andrew</div>
                            <div className="text-green-400">Available</div>
                        </div>
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center gap-1.5">
                        <button className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
                            </svg>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                            </svg>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                            </svg>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                            </svg>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-yellow-400 transition-colors">
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                            </svg>
                        </button>
                    </div>

                    {/* Online status */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-slate-300 dark:border-slate-600">
                        <svg
                            className="w-4 h-4 text-slate-600 dark:text-slate-400"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                        <span className="text-[10px] text-slate-900 dark:text-white">2 Online</span>
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Floating Status Card */}
            <motion.div
                style={{ y: y2 }}
                className="absolute -right-12 top-20 w-48 p-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl z-20"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-xs font-bold text-slate-900">
                        JS
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                            Andrew Pinon
                        </div>
                        <div className="text-[10px] text-green-400">
                            Online • In Meeting
                        </div>
                    </div>
                </div>
                <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-green-500 animate-pulse" />
                </div>
            </motion.div>

            {/* Chat bubble animation */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                className="absolute top-[46%] left-[48%] bg-white text-slate-900 px-3 py-1.5 rounded-lg rounded-bl-none text-xs font-bold shadow-lg z-30"
            >
                Let&apos;s sync up! 💬
            </motion.div>
        </motion.div>
    );
}
