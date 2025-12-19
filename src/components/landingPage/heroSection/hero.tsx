import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
    ArrowRightIcon,
    PlayIcon,
    WifiIcon,
    BatteryIcon,
    CpuIcon,
} from "lucide-react";
import { useRouter } from "next/router";
import VirtualInterface from "./virtualInterface";
export function Hero() {
    const router = useRouter();
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 200], [0, 150]);
    const y2 = useTransform(scrollY, [0, 500], [0, -250]);
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
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 pt-20">
            <div className="absolute inset-0 bg-grid-pattern opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-slate-950 pointer-events-none" />

            <div className="scanlines absolute inset-0 scanlines opacity-30 pointer-events-none z-20" />

            <motion.div
                style={{
                    x: mousePosition.x * 10,
                    y: mousePosition.y * 10,
                }}
                className="absolute top-1/4 right-1/3 w-64 h-64 bg-cyan-500/40 rounded-full blur-[100px]"
            />
            <motion.div
                style={{
                    x: mousePosition.x * 10,
                    y: mousePosition.y * 10,
                }}
                className="absolute top-1/4 right-1/3 w-96 h-96 bg-purple-500/40 rounded-full blur-[100px]"
            />

            <div className="absolute top-24 left-6 md:left-12 flex flex-col gap-2 opacity-50 pointer-events-none">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <WifiIcon className="w-3 h-3" />
                    <span>NET_STATUS: ONLINE</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <CpuIcon className="w-3 h-3" />
                    <span>SYS_LOAD: 12%</span>
                </div>
            </div>

            <div className="absolute top-24 right-6 md:right-12 flex flex-col items-end gap-2 opacity-50 pointer-events-none">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <span>BATTERY</span>
                    <BatteryIcon className="w-3 h-3" />
                </div>
                <div className="text-xs font-mono text-cyan-400">
                    LOC: LOBBY_01
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
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
                        className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/30 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-mono mb-6"
                    >
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                        MISSION: REMOTE_WORK_REVOLUTION
                    </motion.div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                        WORK TOGETHER. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-glow-cyan">
                            PLAY TOGETHER.
                        </span>
                    </h1>

                    <p className="text-lg text-slate-400 mb-8 max-w-xl leading-relaxed">
                        Transform your boring video calls into an immersive 2D
                        MMO. Walk up to colleagues, join guilds, and build your
                        digital HQ in a world that feels alive.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => router.push("/app")}
                            className="group cursor-pointer flex-1 flex justify-center relative px-8 py-4 bg-cyan-500 text-slate-950 font-bold text-sm uppercase tracking-wider clip-path-polygon hover:bg-cyan-400 transition-all overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative flex items-center gap-2">
                                Start Game{" "}
                                <ArrowRightIcon className="w-4 h-4" />
                            </span>
                        </button>

                        <button className="group cursor-pointer flex-1 justify-center px-8 py-4 bg-slate-900/50 border border-slate-700 text-white font-bold text-sm uppercase tracking-wider hover:border-cyan-500/50 hover:text-cyan-400 transition-all flex items-center gap-2">
                            <PlayIcon className="w-4 h-4" />
                            Watch Guides
                        </button>
                    </div>

                    <div className="mt-12 flex items-center gap-8 border-t border-slate-800 pt-8">
                        <div>
                            <div className="text-2xl font-bold text-white font-mono">
                                1
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">
                                Active Players
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white font-mono">
                                1
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">
                                Team Created
                            </div>
                        </div>
                        <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <img
                                    key={i}
                                    src={`/landing-page/users/p${i}.png`}
                                    alt={`User ${i}`}
                                    className={`w-8 h-8 rounded-full border-2 border-slate-950 -ml-3 first:ml-0 z-${10 - i} object-cover`}
                                />
                            ))}
                        </div>
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
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold z-10">
                    Scroll to Start
                </div>
                <div className="w-px h-12 bg-gradient-to-b from-cyan-400 to-transparent" />
            </motion.div>
        </section>
    );
}
