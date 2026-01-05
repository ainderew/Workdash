import React, { useEffect, useState, useRef } from "react";
import useUiStore from "@/common/store/uiStore";
import { CharacterPreview } from "../CharacterCreation/CharacterPreview";
import {
    Goal,
    Handshake,
    Shield,
    Star,
    Crown,
    ArrowUpCircle,
    ArrowDownCircle,
    Sparkles,
    ChevronRight,
} from "lucide-react";
import { CharacterCustomization } from "@/game/character/_types";
import { motion, AnimatePresence, animate } from "framer-motion";

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

interface MmrUpdate {
    playerId: string;
    name: string;
    delta: number;
    newMmr: number;
    rank: string;
    streak: number;
    isMVP: boolean;
    featCount: number;
}

interface RankUpData {
    name: string;
    oldRank: string;
    newRank: string;
    badgePath: string;
}

function getRankBadgePath(mmr: number) {
    if (mmr <= 500) return "/assets/mmr-badges/prospect.png";
    if (mmr <= 900) return "/assets/mmr-badges/challenger.png";
    if (mmr <= 1300) return "/assets/mmr-badges/breaker.png";
    if (mmr <= 1600) return "/assets/mmr-badges/ace.png";
    if (mmr <= 1900) return "/assets/mmr-badges/divine.png";
    return "/assets/mmr-badges/emperor.png";
}

function getRankName(mmr: number) {
    if (mmr <= 500) return "Prospect";
    if (mmr <= 900) return "Challenger";
    if (mmr <= 1300) return "Breaker";
    if (mmr <= 1600) return "Ace";
    if (mmr <= 1900) return "Divine";
    return "Emperor";
}

function AnimatedNumber({
    value,
    delay = 0,
}: {
    value: number;
    delay?: number;
}) {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValue = useRef(0);

    useEffect(() => {
        const timeout = setTimeout(
            () => {
                const controls = animate(prevValue.current, value, {
                    duration: 2,
                    ease: "easeOut",
                    onUpdate: (latest) => setDisplayValue(Math.floor(latest)),
                });
                return () => controls.stop();
            },
            delay * 1000 + 500,
        );

        return () => clearTimeout(timeout);
    }, [value, delay]);

    return <span>{displayValue}</span>;
}

export default function SoccerScoreboard() {
    const [score, setScore] = useState<Score>({ red: 0, blue: 0 });
    const [timeRemaining, setTimeRemaining] = useState<number>(300);
    const [gameEndMessage, setGameEndMessage] = useState<string | null>(null);
    const [mvp, setMvp] = useState<MVP | null>(null);
    const [mmrUpdates, setMmrUpdates] = useState<MmrUpdate[]>([]);
    const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
    const [showMmrScreen, setShowMmrScreen] = useState(false);
    const [rankUpData, setRankUpData] = useState<RankUpData | null>(null);
    const [overtimeMessage, setOvertimeMessage] = useState<string | null>(null);
    const currentScene = useUiStore((state) => state.currentScene);

    useEffect(() => {
        const multiplayer = window.__MULTIPLAYER__;

        if (!multiplayer?.socket?.connected) {
            return;
        }

        const socket = multiplayer.socket;
        setLocalPlayerId(socket.id);

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
            mmrUpdates?: MmrUpdate[];
        }) => {
            const winnerText =
                data.winner === "red"
                    ? "RED TEAM WINS!"
                    : data.winner === "blue"
                      ? "BLUE TEAM WINS!"
                      : "TIE GAME!";
            setGameEndMessage(winnerText);

            let localRankedUp = false;

            if (data.mmrUpdates) {
                setMmrUpdates(data.mmrUpdates);

                // Detect local player rank up
                const localPlayerUpdate = data.mmrUpdates.find(
                    (u) => u.playerId === socket.id,
                );
                if (localPlayerUpdate) {
                    const oldRank = getRankName(
                        localPlayerUpdate.newMmr - localPlayerUpdate.delta,
                    );
                    const newRank = getRankName(localPlayerUpdate.newMmr);
                    if (oldRank !== newRank && localPlayerUpdate.delta > 0) {
                        localRankedUp = true;
                        setRankUpData({
                            name: localPlayerUpdate.name,
                            oldRank,
                            newRank,
                            badgePath: getRankBadgePath(
                                localPlayerUpdate.newMmr,
                            ),
                        });
                    }
                }
            }

            // Sequence: Winner Banner -> MVP -> (Rank Up) -> MMR Progression
            if (data.mvp) {
                setTimeout(() => {
                    setMvp(data.mvp!);
                }, 1500);

                if (localRankedUp) {
                    setTimeout(() => {
                        setMvp(null);
                    }, 8500);

                    setTimeout(() => {
                        setRankUpData(null);
                        setShowMmrScreen(true);
                    }, 14500);
                } else {
                    setTimeout(() => {
                        setMvp(null);
                        setShowMmrScreen(true);
                    }, 8500);
                }
            } else if (localRankedUp) {
                // If no MVP but rank up (rare in this logic but safe)
                setTimeout(() => {
                    // Start rank up
                }, 1500);

                setTimeout(() => {
                    setRankUpData(null);
                    setShowMmrScreen(true);
                }, 7500);
            } else {
                // No MVP, no rank up
                setTimeout(() => {
                    setShowMmrScreen(true);
                }, 1500);
            }

            setTimeout(() => {
                setGameEndMessage(null);
                setMvp(null);
                setShowMmrScreen(false);
                setRankUpData(null);
                setMmrUpdates([]);
            }, 30000);
        };

        const handleOvertime = (data: {
            message: string;
            duration: number;
        }) => {
            setOvertimeMessage(data.message);
            setTimeRemaining(data.duration);
            setGameEndMessage(null);
            setMvp(null);
            setShowMmrScreen(false);

            setTimeout(() => setOvertimeMessage(null), 3000);
        };

        const handleGameReset = (data: { score: Score }) => {
            setScore(data.score);
            setTimeRemaining(300);
            setGameEndMessage(null);
            setMvp(null);
            setShowMmrScreen(false);
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

                                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full">
                                        <motion.img
                                            initial={{ scale: 0, rotate: -20 }}
                                            animate={{ scale: 1.2, rotate: 0 }}
                                            transition={{
                                                delay: 1,
                                                type: "spring",
                                            }}
                                            src={getRankBadgePath(
                                                mmrUpdates.find(
                                                    (u) =>
                                                        u.playerId === mvp.id,
                                                )?.newMmr || 500,
                                            )}
                                            className="w-48 h-auto drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] object-contain"
                                            alt="Rank Badge"
                                        />
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

            {/* Rank Up Celebration Screen */}
            <AnimatePresence>
                {rankUpData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-2xl z-[100]"
                    >
                        {/* Background Particles/Glow */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{
                                        x: "50%",
                                        y: "50%",
                                        scale: 0,
                                        opacity: 1,
                                    }}
                                    animate={{
                                        x: `${Math.random() * 100}%`,
                                        y: `${Math.random() * 100}%`,
                                        scale: Math.random() * 2,
                                        opacity: 0,
                                    }}
                                    transition={{
                                        duration: 2 + Math.random() * 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 2,
                                    }}
                                    className="absolute w-2 h-2 bg-amber-400 rounded-full blur-sm"
                                />
                            ))}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2)_0%,transparent_70%)]" />
                        </div>

                        <motion.div
                            initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{
                                type: "spring",
                                damping: 12,
                                stiffness: 100,
                            }}
                            className="relative z-10 flex flex-col items-center text-center"
                        >
                            <motion.div
                                animate={{ y: [0, -20, 0] }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                <Sparkles className="text-amber-400 w-20 h-20 mb-4 animate-pulse" />
                            </motion.div>

                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-white font-black text-7xl uppercase tracking-tighter italic mb-2 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]"
                            >
                                Rank Up!
                            </motion.h2>

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-amber-500 font-bold text-2xl uppercase tracking-widest mb-12"
                            >
                                New Tier Unlocked
                            </motion.p>

                            <div className="flex items-center gap-12 mb-12">
                                <motion.div
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <div className="text-neutral-500 font-black text-xl uppercase italic">
                                        Previous
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 grayscale opacity-50">
                                        <div className="text-white font-black text-2xl">
                                            {rankUpData.oldRank}
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 1.2, type: "spring" }}
                                >
                                    <ChevronRight className="text-amber-500 w-16 h-16" />
                                </motion.div>

                                <motion.div
                                    initial={{ x: 50, scale: 1.5, opacity: 0 }}
                                    animate={{ x: 0, scale: 1, opacity: 1 }}
                                    transition={{ delay: 1.5, type: "spring" }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <div className="text-amber-500 font-black text-3xl uppercase italic drop-shadow-glow">
                                        New Rank
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-amber-400 blur-3xl rounded-full opacity-30 group-hover:opacity-50 transition-opacity" />

                                        {/* Shining Reveal Effect */}
                                        <motion.div
                                            initial={{ x: "-100%", skewX: -45 }}
                                            animate={{ x: "200%" }}
                                            transition={{
                                                delay: 2,
                                                duration: 1.5,
                                                repeat: Infinity,
                                                repeatDelay: 2,
                                                ease: "easeInOut",
                                            }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent z-20 pointer-events-none"
                                        />

                                        <motion.img
                                            src={rankUpData.badgePath}
                                            className="w-64 h-auto object-contain relative z-10 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]"
                                            animate={{
                                                scale: [1, 1.1, 1],
                                                rotate: [0, 2, -2, 0],
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                            }}
                                        />
                                        <div className="mt-4 text-white font-black text-5xl uppercase tracking-tighter drop-shadow-lg">
                                            {rankUpData.newRank}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 2.5 }}
                                className="bg-amber-500 text-black font-black px-12 py-4 rounded-full text-2xl uppercase tracking-tighter shadow-[0_0_30px_rgba(245,158,11,0.5)]"
                            >
                                Congratulations {rankUpData.name}!
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MMR Progression Screen */}
            <AnimatePresence>
                {showMmrScreen && mmrUpdates.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-10 w-full max-w-6xl p-8"
                        >
                            <div className="text-center mb-12">
                                <h2 className="text-white font-black text-5xl uppercase tracking-widest italic mb-2">
                                    Match Rating Update
                                </h2>
                                <div className="h-1 w-48 bg-amber-500 mx-auto" />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {mmrUpdates
                                    .filter((u) => u.playerId === localPlayerId)
                                    .map((update, idx) => (
                                        <MmrRow
                                            key={update.playerId}
                                            update={update}
                                            delay={idx * 0.2}
                                        />
                                    ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MmrRow({ update, delay }: { update: MmrUpdate; delay: number }) {
    const isGain = update.delta >= 0;
    const oldMmr = update.newMmr - update.delta;
    const isRankUp =
        getRankName(update.newMmr) !== getRankName(oldMmr) && isGain;

    return (
        <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay, type: "spring", stiffness: 100 }}
            className={`bg-white/5 border ${isRankUp ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "border-white/10"} rounded-xl p-6 flex items-center gap-8 shadow-2xl relative overflow-hidden`}
        >
            {/* Background Delta Watermark - Popping in */}
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.05 }}
                transition={{ delay: delay + 1, duration: 0.8 }}
                className={`absolute right-4 top-1/2 -translate-y-1/2 text-9xl font-black select-none ${isGain ? "text-green-500" : "text-red-500"}`}
            >
                {isGain ? `+${update.delta}` : update.delta}
            </motion.div>

            {/* Player Info */}
            <div className="w-80 flex items-center gap-4 relative z-10">
                <div className="relative flex-shrink-0">
                    <motion.img
                        initial={{ scale: 0.8, rotate: -10 }}
                        animate={{
                            scale: isRankUp ? [1, 1.2, 1] : 1,
                            rotate: 0,
                        }}
                        transition={{
                            delay: delay + 2,
                            duration: 0.5,
                            repeat: isRankUp ? 2 : 0,
                        }}
                        src={getRankBadgePath(update.newMmr)}
                        className="h-auto w-56 drop-shadow-md object-cover"
                        alt={update.rank}
                    />
                    {isRankUp && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{
                                delay: delay + 2,
                                duration: 1,
                                repeat: Infinity,
                            }}
                            className="absolute inset-0 bg-amber-400 blur-xl rounded-full -z-10"
                        />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-1">
                        Player
                    </div>
                    <div className="text-white font-black text-2xl truncate">
                        {update.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span
                            className={`px-2 py-0.5 ${isRankUp ? "bg-amber-500 text-black" : "bg-amber-500/20 text-amber-500"} text-[10px] font-black rounded border border-amber-500/30 uppercase tracking-tighter`}
                        >
                            {update.rank} {isRankUp && "↑ UPGRADED"}
                        </span>
                        {update.streak >= 3 && (
                            <span className="flex items-center gap-1 text-orange-500 text-[10px] font-black animate-pulse">
                                <Star className="w-3 h-3 fill-orange-500" />x
                                {update.streak}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* MMR Progression Bar */}
            <div className="flex-1 flex flex-col gap-2 relative z-10">
                <div className="flex justify-between items-end">
                    <span className="text-neutral-500 text-[10px] font-bold uppercase">
                        Rating Progression
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-neutral-400 text-sm font-bold">
                            {oldMmr}
                        </span>
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                color: isGain
                                    ? ["#a3a3a3", "#22c55e", "#ffffff"]
                                    : ["#a3a3a3", "#ef4444", "#ffffff"],
                            }}
                            transition={{ delay: delay + 1, duration: 1 }}
                        >
                            <Star className="w-3 h-3" />
                        </motion.div>
                        <span className="text-white font-black text-3xl tracking-tighter w-20 text-right">
                            <AnimatedNumber
                                value={update.newMmr}
                                delay={delay}
                            />
                        </span>
                    </div>
                </div>
                <div className="h-4 bg-black/40 rounded-full border border-white/10 p-1 overflow-hidden relative">
                    <motion.div
                        initial={{
                            width: `${Math.max(5, (oldMmr % 400) / 4)}%`,
                        }}
                        animate={{
                            width: `${Math.max(5, (update.newMmr % 400) / 4)}%`,
                        }}
                        transition={{
                            delay: delay + 0.5,
                            duration: 2,
                            ease: "circOut",
                        }}
                        className={`h-full rounded-full shadow-[0_0_20px_rgba(245,158,11,0.3)] relative ${isGain ? "bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600" : "bg-gradient-to-r from-red-800 to-red-600"}`}
                    >
                        {/* Shimmer effect */}
                        <motion.div
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        />
                    </motion.div>
                </div>
            </div>

            {/* MMR Delta Breakdown */}
            <div className="flex items-center gap-6 w-72 justify-end relative z-10">
                <div className="flex flex-col items-end">
                    <span className="text-neutral-500 text-[10px] font-bold uppercase">
                        Change
                    </span>
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: delay + 1.2 }}
                        className={`flex items-center gap-2 text-5xl font-black italic tracking-tighter ${isGain ? "text-green-400" : "text-red-400"}`}
                    >
                        {isGain ? (
                            <ArrowUpCircle className="w-8 h-8" />
                        ) : (
                            <ArrowDownCircle className="w-8 h-8" />
                        )}
                        {isGain ? `+${update.delta}` : update.delta}
                    </motion.div>
                </div>

                {/* Detailed Breakdown */}
                <div className="flex flex-col gap-1 text-[10px] font-bold border-l border-white/10 pl-6 py-1 min-w-[100px]">
                    <div className="flex justify-between gap-4">
                        <span className="text-neutral-500 uppercase italic">
                            Base
                        </span>
                        <span className="text-white">
                            {update.delta >= 0 ? "+25" : "-25"}
                        </span>
                    </div>
                    {update.streak >= 3 && update.delta > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: delay + 1.5 }}
                            className="flex justify-between gap-4 text-orange-400"
                        >
                            <span className="uppercase italic">Streak</span>
                            <span>+{update.streak >= 5 ? "10" : "5"}</span>
                        </motion.div>
                    )}
                    {update.isMVP && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: delay + 1.7 }}
                            className="flex justify-between gap-4 text-amber-400"
                        >
                            <span className="uppercase italic">MVP</span>
                            <span>+5</span>
                        </motion.div>
                    )}
                    {update.featCount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: delay + 1.9 }}
                            className="flex justify-between gap-4 text-blue-400"
                        >
                            <span className="uppercase italic">Feats</span>
                            <span>+{update.featCount * 2}</span>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
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
