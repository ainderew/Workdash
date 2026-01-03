import React, { useEffect, useState } from "react";
import useUiStore from "@/common/store/uiStore";

interface Score {
    red: number;
    blue: number;
}

function SoccerScoreboard() {
    const [score, setScore] = useState<Score>({ red: 0, blue: 0 });
    const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes default
    const [gameEndMessage, setGameEndMessage] = useState<string | null>(null);
    const [overtimeMessage, setOvertimeMessage] = useState<string | null>(null);
    const currentScene = useUiStore((state) => state.currentScene);

    useEffect(() => {
        console.log("CHECKING");
        const multiplayer = window.__MULTIPLAYER__;

        if (!multiplayer?.socket?.connected) {
            console.warn("Multiplayer socket not connected for scoreboard");
            return;
        }

        const socket = multiplayer.socket;

        // Listen for goal events to update score
        const handleGoalScored = (data: {
            scoringTeam: "red" | "blue";
            score: Score;
        }) => {
            console.log(data);
            setScore(data.score);
            console.log("Scoreboard updated:", data.score);
        };

        // Listen for timer updates
        const handleTimerUpdate = (data: { timeRemaining: number }) => {
            setTimeRemaining(data.timeRemaining);
        };

        // Listen for game start
        const handleGameStarted = (data: { duration: number }) => {
            setTimeRemaining(data.duration);
            setGameEndMessage(null);
            setOvertimeMessage(null);
        };

        // Listen for game end
        const handleGameEnd = (data: { winner: "red" | "blue" | "tie"; score: Score }) => {
            const winnerText = data.winner === "red" ? "RED TEAM WINS!" :
                              data.winner === "blue" ? "BLUE TEAM WINS!" : "TIE GAME!";
            setGameEndMessage(winnerText);

            // Clear message after 5 seconds
            setTimeout(() => setGameEndMessage(null), 5000);
        };

        // Listen for overtime
        const handleOvertime = (data: { message: string; duration: number }) => {
            setOvertimeMessage(data.message);
            setTimeRemaining(data.duration);

            // Clear overtime message after 3 seconds
            setTimeout(() => setOvertimeMessage(null), 3000);
        };

        // Listen for game reset
        const handleGameReset = (data: { score: Score }) => {
            setScore(data.score);
            setTimeRemaining(300);
            setGameEndMessage(null);
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

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Only show when in SoccerMap scene
    if (currentScene !== "SoccerMap") return null;

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
            {/* Main Scoreboard */}
            <div className="bg-black/80 backdrop-blur-sm rounded-lg px-8 py-3 border-2 border-neutral-700 shadow-2xl">
                <div className="flex items-center gap-6 font-mono text-xl">
                    {/* Red Team */}
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-red-300" />
                        <span className="text-red-400 font-bold">RED</span>
                        <span className="text-white font-bold text-2xl w-8 text-center">
                            {score.red}
                        </span>
                    </div>

                    {/* Timer */}
                    <div className="flex flex-col items-center">
                        <span className="text-neutral-400 text-xs mb-1">TIME</span>
                        <span className={`font-bold text-xl ${timeRemaining <= 10 && timeRemaining > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeRemaining)}
                        </span>
                    </div>

                    {/* Blue Team */}
                    <div className="flex items-center gap-3">
                        <span className="text-white font-bold text-2xl w-8 text-center">
                            {score.blue}
                        </span>
                        <span className="text-blue-400 font-bold">BLUE</span>
                        <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-blue-300" />
                    </div>
                </div>
            </div>

            {/* Game End Message */}
            {gameEndMessage && (
                <div className="mt-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg px-8 py-4 border-2 border-yellow-300 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="text-black font-bold text-3xl text-center">
                        {gameEndMessage}
                    </div>
                </div>
            )}

            {/* Overtime Message */}
            {overtimeMessage && (
                <div className="mt-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg px-8 py-4 border-2 border-red-300 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="text-white font-bold text-2xl text-center">
                        {overtimeMessage}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SoccerScoreboard;
