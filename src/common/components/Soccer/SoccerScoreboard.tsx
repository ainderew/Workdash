import React, { useEffect, useState } from "react";
import useUiStore from "@/common/store/uiStore";
import { CharacterPreview } from "../CharacterCreation/CharacterPreview";
import { Goal, Handshake, Shield, Star, Crown } from "lucide-react";
import { CharacterCustomization } from "@/game/character/_types";
import { motion, AnimatePresence } from "framer-motion";

interface Score {
    red: number;
    blue: number;
}

interface PlayerMatchStats {
    goals: number;
    assists: number;
    interceptions: number;
}

interface MVP {
    id: string;
    name: string;
    stats: PlayerMatchStats;
    character: CharacterCustomization;
}

export default function SoccerScoreboard() {
    const [score, setScore] = useState<Score>({ red: 0, blue: 0 });
    const [timeRemaining, setTimeRemaining] = useState<number>(300);
    const [gameEndMessage, setGameEndMessage] = useState<string | null>(null);
    const [mvp, setMvp] = useState<MVP | null>(null);
    const [overtimeMessage, setOvertimeMessage] = useState<string | null>(null);
    const currentScene = useUiStore((state) => state.currentScene);

    useEffect(() => {
        const multiplayer = window.__MULTIPLAYER__;

        if (!multiplayer?.socket?.connected) {
            return;
        }

        const socket = multiplayer.socket;

        const handleGoalScored = (data: {
            scoringTeam: "red" | "blue";
            score: Score;
        }) => {
            setScore(data.score);
        };

        const handleTimerUpdate = (data: { timeRemaining: number }) => {
            setTimeRemaining(data.timeRemaining);
        };

        const handleGameStarted = (data: { duration: number }) => {
            setTimeRemaining(data.duration);
            setGameEndMessage(null);
            setMvp(null);
            setOvertimeMessage(null);
        };

        const handleGameEnd = (data: {
            winner: "red" | "blue" | "tie";
            score: Score;
            mvp?: MVP;
        }) => {
            const winnerText =
                data.winner === "red"
                    ? "RED TEAM WINS!"
                    : data.winner === "blue"
                      ? "BLUE TEAM WINS!"
                      : "TIE GAME!";
            setGameEndMessage(winnerText);

            if (data.mvp) {
                setTimeout(() => {
                    setMvp(data.mvp!);
                }, 1500);
            }

            setTimeout(() => {
                setGameEndMessage(null);
                setMvp(null);
            }, 12000);
        };

        const handleOvertime = (data: {
            message: string;
            duration: number;
        }) => {
            setOvertimeMessage(data.message);
            setTimeRemaining(data.duration);
            setGameEndMessage(null);
            setMvp(null);

            setTimeout(() => setOvertimeMessage(null), 3000);
        };

        const handleGameReset = (data: { score: Score }) => {
            setScore(data.score);
            setTimeRemaining(300);
            setGameEndMessage(null);
            setMvp(null);
            setOvertimeMessage(null);
        };

        socket.on("goal:scored", handleGoalScored);
        socket.on("soccer:timerUpdate", handleTimerUpdate);
        socket.on("soccer:gameStarted", handleGameStarted);
        socket.on("soccer:gameEnd", handleGameEnd);
        socket.on("soccer:overtime", handleOvertime);
        socket.on("soccer:gameReset", handleGameReset);

        return () => {
            socket.off("goal:scored", handleGoalScored);
            socket.off("soccer:timerUpdate", handleTimerUpdate);
            socket.off("soccer:gameStarted", handleGameStarted);
            socket.off("soccer:gameEnd", handleGameEnd);
            socket.off("soccer:overtime", handleOvertime);
            socket.off("soccer:gameReset", handleGameReset);
        };
    }, [currentScene]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (currentScene !== "SoccerMap") return null;

    return (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex flex-col items-center">
            <div
                className="mt-4 bg-black/80 backdrop-blur-sm rounded-lg px-8 py-3 border-2 border-neutral-700 shadow-2xl transition-opacity duration-500"
                style={{ opacity: mvp ? 0 : 1 }}
            >
                <div className="flex items-center gap-6 font-mono text-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-red-300" />
                        <span className="text-red-400 font-bold">RED</span>
                        <span className="text-white font-bold text-2xl w-8 text-center">
                            {score.red}
                        </span>
                    </div>

                    <div className="flex flex-col items-center">
                        <span className="text-neutral-400 text-xs mb-1">
                            TIME
                        </span>
                        <span
                            className={`font-bold text-xl ${timeRemaining <= 10 && timeRemaining > 0 ? "text-red-400 animate-pulse" : "text-white"}`}
                        >
                            {formatTime(timeRemaining)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-white font-bold text-2xl w-8 text-center">
                            {score.blue}
                        </span>
                        <span className="text-blue-400 font-bold">BLUE</span>
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-blue-300" />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {gameEndMessage && !mvp && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="mt-8 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 rounded-lg px-12 py-6 border-y-4 border-yellow-300 shadow-[0_0_40px_rgba(245,158,11,0.5)]"
                    >
                        <div className="text-black font-black text-5xl italic tracking-tighter text-center uppercase drop-shadow-lg">
                            {gameEndMessage}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {overtimeMessage && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="mt-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg px-8 py-4 border-2 border-red-300 shadow-2xl"
                    >
                        <div className="text-white font-bold text-3xl text-center uppercase tracking-widest italic">
                            {overtimeMessage}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {mvp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md"
                    >
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,transparent_70%)]" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 0.05, scale: 1.2 }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40rem] font-black text-amber-500 select-none"
                            >
                                MVP
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ scale: 0.9, y: 50, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            transition={{
                                type: "spring",
                                damping: 15,
                                stiffness: 100,
                            }}
                            className="relative z-10 flex flex-col items-center max-w-5xl w-full px-4"
                        >
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col items-center mb-12"
                            >
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="h-[2px] w-24 bg-gradient-to-l from-amber-500 to-transparent" />
                                    <Crown className="text-amber-500 w-10 h-10 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                                    <div className="h-[2px] w-24 bg-gradient-to-r from-amber-500 to-transparent" />
                                </div>
                                <h1 className="text-amber-500 font-black text-6xl tracking-[0.2em] uppercase italic drop-shadow-2xl">
                                    Hero of the Match
                                </h1>
                            </motion.div>

                            <div className="flex flex-col md:flex-row gap-16 items-center w-full justify-center">
                                <motion.div
                                    initial={{ x: -100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.5, type: "spring" }}
                                    className="relative group"
                                >
                                    <div className="absolute inset-0 bg-amber-500/30 blur-[80px] rounded-full animate-pulse" />
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                        className="relative w-64 h-64 md:w-80 md:h-80 scale-150 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
                                    >
                                        <CharacterPreview
                                            customization={mvp.character}
                                            animationRow={1}
                                            frameCol={18}
                                        />
                                    </motion.div>

                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center w-full">
                                        <div className="text-white font-black text-5xl tracking-tighter uppercase drop-shadow-lg">
                                            {mvp.name}
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.7, type: "spring" }}
                                    className="flex flex-col gap-4 w-full md:w-96"
                                >
                                    <StatRow
                                        icon={
                                            <Goal className="w-8 h-8 text-green-400" />
                                        }
                                        label="Goals Scored"
                                        value={mvp.stats.goals}
                                        color="text-green-400"
                                        delay={0.9}
                                    />
                                    <StatRow
                                        icon={
                                            <Handshake className="w-8 h-8 text-blue-400" />
                                        }
                                        label="Assists Provided"
                                        value={mvp.stats.assists}
                                        color="text-blue-400"
                                        delay={1.1}
                                    />
                                    <StatRow
                                        icon={
                                            <Shield className="w-8 h-8 text-purple-400" />
                                        }
                                        label="Key Interceptions"
                                        value={mvp.stats.interceptions}
                                        color="text-purple-400"
                                        delay={1.3}
                                    />

                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{
                                            delay: 1.5,
                                            type: "spring",
                                        }}
                                        className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Star className="text-amber-500 fill-amber-500 w-5 h-5" />
                                            <span className="text-amber-500/80 font-bold uppercase tracking-wider text-xs">
                                                Performance Rating
                                            </span>
                                        </div>
                                        <span className="text-amber-500 font-black text-2xl">
                                            {Math.round(
                                                (mvp.stats.goals * 10 +
                                                    mvp.stats.assists * 5 +
                                                    mvp.stats.interceptions *
                                                        2) /
                                                    2,
                                            )}
                                        </span>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatRow({
    icon,
    label,
    value,
    color,
    delay,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="group flex items-center gap-6 p-5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-xl"
        >
            <div className="bg-black/40 p-3 rounded-lg border border-white/5 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <div className="flex flex-col flex-1">
                <span className="text-neutral-400 text-xs font-black uppercase tracking-widest">
                    {label}
                </span>
                <span
                    className={`text-3xl font-black ${color} tracking-tighter`}
                >
                    {value}
                </span>
            </div>
        </motion.div>
    );
}
