import React from "react";
import { motion } from "framer-motion";
import { PlayIcon, Gamepad2Icon } from "lucide-react";
export function DemoSection() {
    return (
        <section className="py-24 bg-slate-900 border-y border-slate-800 relative overflow-hidden">
            <div className="absolute inset-0 scanlines opacity-10 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                <motion.div
                    initial={{
                        opacity: 0,
                        scale: 0.9,
                    }}
                    whileInView={{
                        opacity: 1,
                        scale: 1,
                    }}
                    viewport={{
                        once: true,
                    }}
                    className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl"
                >
                    {/* Fake Browser/Game Header */}
                    <div className="h-10 bg-slate-800 flex items-center px-4 gap-2 border-b border-slate-700">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="flex-1 text-center">
                            <div className="inline-block px-4 py-1 bg-slate-900 rounded text-[10px] font-mono text-slate-400">
                                https://workdash.site/app
                            </div>
                        </div>
                    </div>

                    <div className="relative aspect-video group cursor-pointer">
                        <img
                            src="https://cdn.magicpatterns.com/uploads/pVsitjZ6rPTE3jH2ULXp3T/Screenshot_2025-12-07_at_4.00.03_AM.png"
                            alt="Game Interface"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity duration-500"
                        />

                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                whileHover={{
                                    scale: 1.1,
                                }}
                                className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.5)] z-20"
                            >
                                <PlayIcon className="w-8 h-8 text-slate-950 fill-current ml-1" />
                            </motion.div>
                        </div>

                        <div className="absolute bottom-8 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur rounded-full text-cyan-400 font-mono text-sm border border-cyan-500/30">
                                <Gamepad2Icon className="w-4 h-4" /> Click to
                                Enter Demo Mode
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
