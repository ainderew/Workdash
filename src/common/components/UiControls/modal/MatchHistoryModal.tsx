import React, { useEffect, useState } from "react";
import {
    X,
    Loader2,
    Trophy,
    Calendar,
    Target,
    Zap,
    ChevronUp,
    ChevronDown,
} from "lucide-react";
import { getMatchHistory, MatchHistory } from "@/lib/api/soccer-stats";

interface MatchHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MatchHistoryModal({ isOpen, onClose }: MatchHistoryModalProps) {
    const [history, setHistory] = useState<MatchHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getMatchHistory();
            setHistory(data);
        } catch (err) {
            console.error("Failed to fetch match history:", err);
            setError("Failed to load match history.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Match History
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                        <p className="text-neutral-400 text-sm">
                            Loading matches...
                        </p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={fetchHistory}
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                        <Calendar className="w-12 h-12 text-neutral-700 mb-4" />
                        <p className="text-neutral-400">No matches found.</p>
                        <p className="text-neutral-600 text-sm mt-1">
                            Play some games to see your history!
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-3">
                            {history.map((match) => (
                                <div
                                    key={match.id}
                                    className="bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-4 hover:bg-neutral-800/60 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    match.result === "WIN"
                                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                                                }`}
                                            >
                                                {match.result}
                                            </div>
                                            <div className="text-xs text-neutral-500 flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(
                                                    match.matchDate,
                                                ).toLocaleDateString()}{" "}
                                                {new Date(
                                                    match.matchDate,
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-lg font-black text-white">
                                                <span
                                                    className={
                                                        match.result === "WIN"
                                                            ? "text-green-400"
                                                            : "text-neutral-400"
                                                    }
                                                >
                                                    {match.ourScore}
                                                </span>
                                                <span className="mx-1 text-neutral-600">
                                                    -
                                                </span>
                                                <span
                                                    className={
                                                        match.result === "LOSS"
                                                            ? "text-red-400"
                                                            : "text-neutral-400"
                                                    }
                                                >
                                                    {match.opponentScore}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="flex flex-col items-center p-2 rounded bg-neutral-900/40">
                                            <span className="text-[10px] text-neutral-500 uppercase font-bold mb-1">
                                                Goals
                                            </span>
                                            <div className="flex items-center gap-1 text-white font-bold">
                                                <Target
                                                    size={14}
                                                    className="text-red-400"
                                                />
                                                {match.goals}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded bg-neutral-900/40">
                                            <span className="text-[10px] text-neutral-500 uppercase font-bold mb-1">
                                                Assists
                                            </span>
                                            <div className="flex items-center gap-1 text-white font-bold">
                                                <Zap
                                                    size={14}
                                                    className="text-blue-400"
                                                />
                                                {match.assists}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded bg-neutral-900/40">
                                            <span className="text-[10px] text-neutral-500 uppercase font-bold mb-1">
                                                MMR
                                            </span>
                                            <div
                                                className={`flex items-center font-bold ${match.mmrDelta >= 0 ? "text-green-400" : "text-red-400"}`}
                                            >
                                                {match.mmrDelta >= 0 ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                )}
                                                {Math.abs(match.mmrDelta)}
                                            </div>
                                            <span className="text-[9px] text-neutral-600">
                                                {match.newMmr} total
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded bg-neutral-900/40">
                                            <span className="text-[10px] text-neutral-500 uppercase font-bold mb-1">
                                                Rank
                                            </span>
                                            <span className="text-amber-500 font-bold text-xs">
                                                {match.rankAtTime}
                                            </span>
                                            {match.isMVP && (
                                                <div
                                                    className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 shadow-lg"
                                                    title="MVP"
                                                >
                                                    <Trophy
                                                        size={10}
                                                        className="text-black"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {match.isMVP && (
                                        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                                            <Trophy size={12} />
                                            Match MVP
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
