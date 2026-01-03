import React, { useState, useEffect } from "react";
import { X, RefreshCw, Trophy } from "lucide-react";

interface SoccerGameControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Player {
  id: string;
  name: string;
  team: "red" | "blue" | null;
}

export function SoccerGameControlModal({
  isOpen,
  onClose,
}: SoccerGameControlModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [score, setScore] = useState({ red: 0, blue: 0 });
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const multiplayer = window.__MULTIPLAYER__;
    if (!multiplayer) return;

    // Fetch current players
    multiplayer.socket.emit("soccer:getPlayers", (playerList: Player[]) => {
      setPlayers(playerList);
    });

    // Listen for team assignments
    const handleTeamAssigned = (data: {
      playerId: string;
      team: "red" | "blue" | null;
    }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.playerId ? { ...p, team: data.team } : p,
        ),
      );
    };

    // Listen for game resets
    const handleGameReset = (data: { score: { red: number; blue: number } }) => {
      setScore(data.score);
    };

    // Listen for goals
    const handleGoalScored = (data: {
      scoringTeam: "red" | "blue";
      score: { red: number; blue: number };
    }) => {
      setScore(data.score);
    };

    multiplayer.socket.on("soccer:teamAssigned", handleTeamAssigned);
    multiplayer.socket.on("soccer:gameReset", handleGameReset);
    multiplayer.socket.on("goal:scored", handleGoalScored);

    return () => {
      multiplayer.socket.off("soccer:teamAssigned", handleTeamAssigned);
      multiplayer.socket.off("soccer:gameReset", handleGameReset);
      multiplayer.socket.off("goal:scored", handleGoalScored);
    };
  }, [isOpen]);

  const assignTeam = (playerId: string, team: "red" | "blue" | null) => {
    const multiplayer = window.__MULTIPLAYER__;
    if (!multiplayer) return;

    multiplayer.socket.emit("soccer:assignTeam", { playerId, team });
  };

  const resetGame = () => {
    const multiplayer = window.__MULTIPLAYER__;
    if (!multiplayer) return;

    multiplayer.socket.emit("soccer:resetGame");
  };

  const handleDragStart = (player: Player) => {
    setDraggedPlayer(player);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDrop = (team: "red" | "blue" | null) => {
    if (draggedPlayer) {
      assignTeam(draggedPlayer.id, team);
      setDraggedPlayer(null);
    }
  };

  if (!isOpen) return null;

  const redTeam = players.filter((p) => p.team === "red");
  const blueTeam = players.filter((p) => p.team === "blue");
  const unassigned = players.filter((p) => !p.team);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Soccer Game Control
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
            <div className="text-xs text-neutral-400 mb-1">Red Team</div>
            <div className="text-4xl font-bold text-red-400">{score.red}</div>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
            <div className="text-xs text-neutral-400 mb-1">Blue Team</div>
            <div className="text-4xl font-bold text-blue-400">{score.blue}</div>
          </div>
        </div>

        {/* Team Assignment */}
        <div className="grid grid-cols-3 gap-4">
          {/* Red Team */}
          <div
            className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop("red")}
          >
            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              Red Team ({redTeam.length})
            </h3>
            <div className="space-y-2 min-h-[100px]">
              {redTeam.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No players</p>
              ) : (
                redTeam.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={() => handleDragStart(player)}
                    className="bg-neutral-700/50 rounded p-2 text-sm text-white flex items-center justify-between cursor-move hover:bg-neutral-700 transition-colors"
                  >
                    <span className="truncate">{player.name}</span>
                    <button
                      onClick={() => assignTeam(player.id, null)}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                      title="Remove from team"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Unassigned */}
          <div
            className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(null)}
          >
            <h3 className="text-sm font-semibold text-neutral-400 mb-3">
              Unassigned ({unassigned.length})
            </h3>
            <div className="space-y-2 min-h-[100px]">
              {unassigned.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">All assigned</p>
              ) : (
                unassigned.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={() => handleDragStart(player)}
                    className="bg-neutral-700/50 rounded p-2 text-sm cursor-move hover:bg-neutral-700 transition-colors"
                  >
                    <div className="text-white mb-2 truncate">{player.name}</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => assignTeam(player.id, "red")}
                        className="flex-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded transition-colors"
                      >
                        Red
                      </button>
                      <button
                        onClick={() => assignTeam(player.id, "blue")}
                        className="flex-1 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs rounded transition-colors"
                      >
                        Blue
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Blue Team */}
          <div
            className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop("blue")}
          >
            <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              Blue Team ({blueTeam.length})
            </h3>
            <div className="space-y-2 min-h-[100px]">
              {blueTeam.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No players</p>
              ) : (
                blueTeam.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={() => handleDragStart(player)}
                    className="bg-neutral-700/50 rounded p-2 text-sm text-white flex items-center justify-between cursor-move hover:bg-neutral-700 transition-colors"
                  >
                    <span className="truncate">{player.name}</span>
                    <button
                      onClick={() => assignTeam(player.id, null)}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                      title="Remove from team"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
