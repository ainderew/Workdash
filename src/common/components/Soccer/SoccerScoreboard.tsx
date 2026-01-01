import React, { useEffect, useState } from "react";
import useUiStore from "@/common/store/uiStore";

interface Score {
    red: number;
    blue: number;
}

function SoccerScoreboard() {
    const [score, setScore] = useState<Score>({ red: 0, blue: 0 });
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

        socket.on("goal:scored", handleGoalScored);

        return () => {
            socket.off("goal:scored", handleGoalScored);
        };
    }, [currentScene]);

    // Only show when in SoccerMap scene
    if (currentScene !== "SoccerMap") return null;

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
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

                    {/* Separator */}
                    <div className="text-neutral-500 font-bold text-2xl">-</div>

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
        </div>
    );
}

export default SoccerScoreboard;
