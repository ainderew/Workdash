import React, { useState, useEffect } from "react";
import { X, RefreshCw, Trophy, Play, Shuffle } from "lucide-react";

interface SoccerGameControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Player {
  id: string;
  name: string;
  team: "red" | "blue" | "spectator" | null;
}

export function SoccerGameControlModal({
  isOpen,
  onClose,
}: SoccerGameControlModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
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
      team: "red" | "blue" | "spectator" | null;
    }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.playerId ? { ...p, team: data.team } : p,
        ),
      );
    };

    multiplayer.socket.on("soccer:teamAssigned", handleTeamAssigned);

    return () => {
      multiplayer.socket.off("soccer:teamAssigned", handleTeamAssigned);
    };
  }, [isOpen]);

  const assignTeam = (playerId: string, team: "red" | "blue" | "spectator" | null) => {
    const multiplayer = window.__MULTIPLAYER__;
    if (!multiplayer) return;

    multiplayer.socket.emit("soccer:assignTeam", { playerId, team });
  };

  const resetGame = () => {
    const multiplayer = window.__MULTIPLAYER__;
    if (!multiplayer) return;

    multiplayer.socket.emit("soccer:resetGame");
  };

  const startGame = () => {
    const multiplayer = window.__MULTIPLAYER__;
    if (!multiplayer) return;

    // Trigger selection phase and subsequent game start
    multiplayer.socket.emit("soccer:startGame");

    // Close the modal
    onClose();
  };

  const randomizeTeams = () => {
    const multiplayer = window.__MULTIPLAYER__;
    if (!multiplayer) return;

    multiplayer.socket.emit("soccer:randomizeTeams");
  };

  const handleDragStart = (player: Player) => {
    setDraggedPlayer(player);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDrop = (team: "red" | "blue" | "spectator" | null) => {
    if (draggedPlayer) {
      assignTeam(draggedPlayer.id, team);
      setDraggedPlayer(null);
    }
  };

  if (!isOpen) return null;

  const redTeam = players.filter((p) => p.team === "red");
  const blueTeam = players.filter((p) => p.team === "blue");
  // Merge null and spectator into one group
  const spectators = players.filter((p) => !p.team || p.team === "spectator");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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

        {/* Game Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={startGame}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Play size={16} />
            Start Game
          </button>
          <button
            onClick={randomizeTeams}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Shuffle size={16} />
            Random Teams
          </button>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>

        {/* Team Assignment */}
        <div className="grid grid-cols-3 gap-6">
          {/* Red Team */}
          <div
            className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop("red")}
          >
            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              Red Team ({redTeam.length})
            </h3>
            <div className="space-y-2 flex-1 min-h-[200px]">
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
                      onClick={() => assignTeam(player.id, "spectator")}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                      title="Move to spectators"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Blue Team */}
          <div
            className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop("blue")}
          >
            <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              Blue Team ({blueTeam.length})
            </h3>
            <div className="space-y-2 flex-1 min-h-[200px]">
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
                      onClick={() => assignTeam(player.id, "spectator")}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                      title="Move to spectators"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Spectators (Unified) */}
          <div
            className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop("spectator")}
          >
            <h3 className="text-sm font-semibold text-neutral-500 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-3 h-3 bg-neutral-600 rounded-full" />
              Spectators ({spectators.length})
            </h3>
            <div className="space-y-2 flex-1 min-h-[200px]">
              {spectators.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No spectators</p>
              ) : (
                spectators.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={() => handleDragStart(player)}
                    className="bg-neutral-700/50 rounded p-2 text-sm text-white flex items-center justify-between cursor-move hover:bg-neutral-700 transition-colors"
                  >
                    <span className="truncate">{player.name}</span>
                    <div className="flex gap-1">
                        <button
                        onClick={() => assignTeam(player.id, "red")}
                        className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded text-red-400 hover:bg-red-500/40 font-bold"
                        >
                        RED
                        </button>
                        <button
                        onClick={() => assignTeam(player.id, "blue")}
                        className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 hover:bg-blue-500/40 font-bold"
                        >
                        BLUE
                        </button>
                    </div>
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
