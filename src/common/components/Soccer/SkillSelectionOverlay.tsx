import React, { useEffect, useState } from "react";
import useSoccerStore from "@/common/store/soccerStore";
import usePlayersStore from "@/common/store/playerStore";
import { SkillConfig } from "@/game/scenes/SoccerMap";

function SkillSelectionOverlay() {
    const {
        isSelectionPhaseActive,
        selectionOrder,
        currentPickerId,
        selectionTurnEndTime,
        playerPicks,
        availableSkillIds,
    } = useSoccerStore();

    const [skillConfigs, setSkillConfigs] = useState<SkillConfig[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const localPlayerId = usePlayersStore((state) => state.localPlayerId);
    const playerMap = usePlayersStore((state) => state.playerMap);

    useEffect(() => {
        if (!isSelectionPhaseActive) return;

        const multiplayer = window.__MULTIPLAYER__;
        if (multiplayer?.socket) {
            multiplayer.socket.emit("soccer:requestSkillConfig", (configs: SkillConfig[]) => {
                setSkillConfigs(configs);
            });
        }
    }, [isSelectionPhaseActive]);

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((selectionTurnEndTime - Date.now()) / 1000));
            setTimeLeft(remaining);
        }, 100);
        return () => clearInterval(timer);
    }, [selectionTurnEndTime]);

    if (!isSelectionPhaseActive) return null;

    const isLocalTurn = currentPickerId === localPlayerId;
    const currentPickerName = playerMap[currentPickerId!]?.name || "Unknown Player";
    const localPlayer = localPlayerId ? playerMap[localPlayerId] : null;
    const isSpectator = !localPlayer?.team || localPlayer?.team === "spectator";

    const handlePick = (skillId: string) => {
        if (!isLocalTurn) return;
        const multiplayer = window.__MULTIPLAYER__;
        if (multiplayer?.socket) {
            multiplayer.socket.emit("soccer:pickSkill", { skillId });
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-[#0a0a0a]/95 flex flex-col items-center justify-center font-sans text-white overflow-hidden">
            {/* Header */}
            <div className="w-full bg-gradient-to-b from-[#1a1a1a] to-transparent py-8 flex flex-col items-center border-b border-white/5">
                <h1 className="text-4xl font-black uppercase tracking-[0.2em] text-[#e1d6b5] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    Skill Selection
                </h1>
                <div className="mt-4 flex items-center gap-4">
                    <div className="px-6 py-2 bg-[#2c3035] border border-[#3c3f42] rounded flex flex-col items-center min-w-[200px]">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Currently Picking</span>
                        <span className={`text-lg font-bold uppercase ${isLocalTurn ? 'text-[#00ffcc]' : 'text-white'}`}>
                            {isLocalTurn ? "YOUR TURN" : currentPickerName}
                        </span>
                    </div>
                    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl font-black ${timeLeft <= 5 ? 'border-red-500 text-red-500 animate-pulse' : 'border-[#e1d6b5] text-[#e1d6b5]'}`}>
                        {timeLeft}
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full max-w-7xl px-8 py-12 flex gap-12 overflow-hidden">
                {/* Pick Order List - Only show if there is an order */}
                {selectionOrder.length > 0 && (
                    <div className="w-64 flex flex-col gap-2 overflow-y-auto pr-4 border-r border-white/5">
                        <h2 className="text-[11px] uppercase font-black text-neutral-500 tracking-[0.2em] mb-4">Pick Order</h2>
                        {selectionOrder.map((playerId) => {
                            const player = playerMap[playerId];
                            const isPicking = playerId === currentPickerId;
                            const hasPicked = !!playerPicks[playerId];
                            const pickedSkill = skillConfigs.find(s => s.id === playerPicks[playerId]);

                            return (
                                <div 
                                    key={playerId}
                                    className={`p-3 rounded border transition-all ${
                                        isPicking 
                                            ? 'bg-[#e1d6b5]/10 border-[#e1d6b5] translate-x-2' 
                                            : hasPicked 
                                                ? 'bg-neutral-900/50 border-white/5 opacity-60' 
                                                : 'bg-transparent border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold truncate">{player?.name || "Player"}</span>
                                        {isPicking && <span className="text-[8px] bg-[#e1d6b5] text-black px-1 rounded font-black">PICKING</span>}
                                    </div>
                                    {hasPicked && (
                                        <div className="text-[10px] text-[#00ffcc] font-bold uppercase mt-1">
                                            {pickedSkill?.name}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Skill Grid */}
                <div className={`flex-1 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-24 ${selectionOrder.length === 0 ? 'max-w-4xl mx-auto' : ''}`}>
                    {skillConfigs.map((skill) => {
                        const isAvailable = availableSkillIds.includes(skill.id);
                        const isPicked = !isAvailable;
                        const iconPath = `/assets/skills/${skill.clientVisuals.iconKey || 'time_dilation'}.jpg`;

                        return (
                            <div 
                                key={skill.id}
                                onClick={() => isAvailable && handlePick(skill.id)}
                                className={`relative group flex flex-col rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                    isPicked 
                                        ? 'opacity-30 grayscale border-transparent cursor-not-allowed' 
                                        : isLocalTurn 
                                            ? 'border-white/10 hover:border-[#e1d6b5] hover:scale-105 active:scale-95' 
                                            : 'border-white/10 cursor-default'
                                }`}
                            >
                                {/* Icon Background */}
                                <div className="aspect-square relative overflow-hidden">
                                    <img src={iconPath} className="w-full h-full object-cover" alt={skill.name} />
                                    {!isAvailable && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="text-red-500 font-black uppercase text-xl rotate-[-20deg] border-4 border-red-500 px-4 py-2">Picked</span>
                                        </div>
                                    )}
                                    {isAvailable && isLocalTurn && (
                                        <div className="absolute inset-0 bg-[#e1d6b5]/0 group-hover:bg-[#e1d6b5]/10 transition-all" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 bg-gradient-to-b from-[#2c3035] to-[#1b1e21] flex-1">
                                    <div className="text-[#e1d6b5] font-black uppercase text-sm tracking-widest mb-1">{skill.name}</div>
                                    <div className="text-neutral-400 text-xs leading-relaxed line-clamp-3 italic mb-4">{skill.description}</div>
                                    
                                    <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase">
                                        <span>Cooldown: {skill.cooldownMs/1000}s</span>
                                        <span className="bg-neutral-800 px-2 py-0.5 rounded border border-white/5">{skill.keyBinding}</span>
                                    </div>
                                </div>

                                {/* Ready Glow */}
                                {isAvailable && isLocalTurn && (
                                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(225,214,181,0.2)] group-hover:shadow-[inset_0_0_60px_rgba(225,214,181,0.4)] transition-all" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Tip */}
            <div className="w-full bg-[#1b1e21] border-t border-white/5 py-4 px-12 flex justify-between items-center">
                <div className="text-neutral-500 text-xs flex items-center gap-4 uppercase font-bold tracking-widest">
                    <span>Choose Wisely</span>
                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    <span>One Skill Per Player</span>
                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    <span>First Come, First Served</span>
                </div>
                {isLocalTurn ? (
                    <div className="text-[#00ffcc] animate-pulse font-black uppercase tracking-tighter">
                        It&apos;s your turn to pick!
                    </div>
                ) : isSpectator ? (
                    <div className="text-neutral-500 font-black uppercase tracking-tighter">
                        Spectating Draft
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default SkillSelectionOverlay;
