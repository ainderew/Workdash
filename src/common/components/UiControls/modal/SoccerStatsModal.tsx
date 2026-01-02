import React, { useState } from "react";
import { X, Loader2, Zap, Target, Footprints, Plus, Minus } from "lucide-react";
import { createSoccerStats } from "@/lib/api/soccer-stats";

interface SoccerStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TOTAL_POINTS = 15;

export function SoccerStatsModal({ isOpen, onClose }: SoccerStatsModalProps) {
    const [speed, setSpeed] = useState(0);
    const [kickPower, setKickPower] = useState(0);
    const [dribbling, setDribbling] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalUsed = speed + kickPower + dribbling;
    const pointsRemaining = TOTAL_POINTS - totalUsed;
    const isValid = totalUsed === TOTAL_POINTS;

    const incrementStat = (stat: "speed" | "kickPower" | "dribbling") => {
        if (pointsRemaining <= 0) return;

        if (stat === "speed") {
            setSpeed((prev) => Math.min(15, prev + 1));
        } else if (stat === "kickPower") {
            setKickPower((prev) => Math.min(15, prev + 1));
        } else if (stat === "dribbling") {
            setDribbling((prev) => Math.min(15, prev + 1));
        }
    };

    const decrementStat = (stat: "speed" | "kickPower" | "dribbling") => {
        if (stat === "speed") {
            setSpeed((prev) => Math.max(0, prev - 1));
        } else if (stat === "kickPower") {
            setKickPower((prev) => Math.max(0, prev - 1));
        } else if (stat === "dribbling") {
            setDribbling((prev) => Math.max(0, prev - 1));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValid) {
            setError(
                `You must use exactly ${TOTAL_POINTS} points. ${pointsRemaining} points remaining.`,
            );
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await createSoccerStats({ speed, kickPower, dribbling });

            // Reload page to re-join with stats
            window.location.reload();
        } catch (err) {
            console.error("Failed to create soccer stats:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save stats. Please try again.",
            );
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const getMultiplier = (points: number) => {
        return (1.0 + points * 0.1).toFixed(1);
    };

    const getFriction = (points: number) => {
        return (0.95 - points * 0.02).toFixed(2);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Footprints className="w-5 h-5 text-amber-500" />
                        Soccer Stats
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                        disabled={isSaving}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-neutral-400 mb-2">
                        Distribute{" "}
                        <span className="font-bold text-amber-500">
                            {TOTAL_POINTS} points
                        </span>{" "}
                        across your stats.
                    </p>
                    {/* <p className="text-xs text-neutral-500"> */}
                    {/*   These stats are <span className="font-semibold text-amber-500">permanent</span> and cannot be changed later. */}
                    {/* </p> */}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 mb-6">
                        {/* Speed */}
                        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-blue-400" />
                                    <label className="text-sm font-semibold text-white">
                                        Speed
                                    </label>
                                </div>
                                <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded">
                                    {getMultiplier(speed)}x
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => decrementStat("speed")}
                                    disabled={isSaving || speed === 0}
                                    className="w-10 h-10 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-700"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="text-3xl font-bold text-blue-400 min-w-[3rem] text-center">
                                    {speed}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => incrementStat("speed")}
                                    disabled={
                                        isSaving ||
                                        pointsRemaining === 0 ||
                                        speed === 15
                                    }
                                    className="w-10 h-10 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-700"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <p className="text-xs text-neutral-500 mt-2">
                                Movement speed and max speed multiplier
                            </p>
                        </div>

                        {/* Kick Power */}
                        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-red-400" />
                                    <label className="text-sm font-semibold text-white">
                                        Kick Power
                                    </label>
                                </div>
                                <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded">
                                    {getMultiplier(kickPower)}x
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => decrementStat("kickPower")}
                                    disabled={isSaving || kickPower === 0}
                                    className="w-10 h-10 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-700"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="text-3xl font-bold text-red-400 min-w-[3rem] text-center">
                                    {kickPower}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => incrementStat("kickPower")}
                                    disabled={
                                        isSaving ||
                                        pointsRemaining === 0 ||
                                        kickPower === 15
                                    }
                                    className="w-10 h-10 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-700"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <p className="text-xs text-neutral-500 mt-2">
                                Ball kick force multiplier
                            </p>
                        </div>

                        {/* Dribbling */}
                        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Footprints className="w-5 h-5 text-green-400" />
                                    <label className="text-sm font-semibold text-white">
                                        Dribbling
                                    </label>
                                </div>
                                <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded">
                                    {getFriction(dribbling)} friction
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => decrementStat("dribbling")}
                                    disabled={isSaving || dribbling === 0}
                                    className="w-10 h-10 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-700"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="text-3xl font-bold text-green-400 min-w-[3rem] text-center">
                                    {dribbling}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => incrementStat("dribbling")}
                                    disabled={
                                        isSaving ||
                                        pointsRemaining === 0 ||
                                        dribbling === 15
                                    }
                                    className="w-10 h-10 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-neutral-700"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <p className="text-xs text-neutral-500 mt-2">
                                Stopping power (lower friction = faster stops)
                            </p>
                        </div>
                    </div>

                    {/* Points Budget */}
                    <div
                        className={`p-4 rounded-lg border mb-6 ${
                            isValid
                                ? "bg-green-500/10 border-green-500/30"
                                : pointsRemaining > 0
                                  ? "bg-amber-500/10 border-amber-500/30"
                                  : "bg-red-500/10 border-red-500/30"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">
                                Points Remaining
                            </span>
                            <span
                                className={`text-2xl font-bold ${
                                    isValid
                                        ? "text-green-400"
                                        : pointsRemaining > 0
                                          ? "text-amber-400"
                                          : "text-red-400"
                                }`}
                            >
                                {pointsRemaining}
                            </span>
                        </div>
                        {!isValid && (
                            <p className="text-xs text-neutral-400 mt-2">
                                {pointsRemaining > 0
                                    ? `Distribute ${pointsRemaining} more point${pointsRemaining === 1 ? "" : "s"}`
                                    : `Remove ${Math.abs(pointsRemaining)} point${Math.abs(pointsRemaining) === 1 ? "" : "s"}`}
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded border border-red-400/20 mb-6">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !isValid}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-black bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Lock In Stats"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
