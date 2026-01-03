import React, { useEffect, useState } from "react";
import useUiStore from "@/common/store/uiStore";

interface SkillConfig {
    id: string;
    name: string;
    description: string;
    keyBinding: string;
    cooldownMs: number;
    durationMs: number;
    clientVisuals: {
        enableGrayscale: boolean;
        enableSpeedTrail: boolean;
        trailColor?: number;
        trailInterval?: number;
        trailFadeDuration?: number;
        iconKey: string;
    };
}

interface SkillCooldown {
    lastUsed: number;
    cooldownMs: number;
}

function SkillsHud() {
    const [skills, setSkills] = useState<SkillConfig[]>([]);
    const [cooldowns, setCooldowns] = useState<Map<string, SkillCooldown>>(
        new Map(),
    );
    const [currentTime, setCurrentTime] = useState(Date.now());
    const currentScene = useUiStore((state) => state.currentScene);

    useEffect(() => {
        // Only request skills when in SoccerMap scene
        if (currentScene !== "SoccerMap") {
            return;
        }

        const multiplayer = window.__MULTIPLAYER__;

        if (!multiplayer?.socket?.connected) {
            console.warn("Skills HUD: Multiplayer socket not connected");
            return;
        }

        const socket = multiplayer.socket;
        const localPlayerId = socket.id;

        console.log("Skills HUD: Requesting skill configs...");

        // Request skill configs
        socket.emit("soccer:requestSkillConfig", (configs: SkillConfig[]) => {
            console.log("Skills HUD: Received skill configs:", configs);
            setSkills(configs);
        });

        // Helper to trigger cooldown update
        const triggerCooldown = (targetSkillId: string) => {
            setSkills((currentSkills) => {
                const skill = currentSkills.find((s) => s.id === targetSkillId);
                if (skill) {
                    setCooldowns((prev) => {
                        const newCooldowns = new Map(prev);
                        newCooldowns.set(targetSkillId, {
                            lastUsed: Date.now(),
                            cooldownMs: skill.cooldownMs,
                        });
                        return newCooldowns;
                    });
                }
                return currentSkills;
            });
        };

        // Listen for standard skill activation
        const handleSkillActivated = (data: {
            activatorId: string;
            skillId: string;
            affectedPlayers: string[];
            duration: number;
            visualConfig: any;
        }) => {
            if (data.activatorId === localPlayerId) {
                triggerCooldown(data.skillId);
            }
        };

        // Listen for blink specific activation
        // The blink event structure differs and doesn't always carry skillId
        const handleBlinkActivated = (data: {
            activatorId: string;
            fromX: number;
            fromY: number;
            toX: number;
            toY: number;
            visualConfig: any;
        }) => {
            if (data.activatorId === localPlayerId) {
                // We know this event corresponds to the "blink" skill ID
                triggerCooldown("blink");
            }
        };

        socket.on("soccer:skillActivated", handleSkillActivated);
        socket.on("soccer:blinkActivated", handleBlinkActivated);

        return () => {
            socket.off("soccer:skillActivated", handleSkillActivated);
            socket.off("soccer:blinkActivated", handleBlinkActivated);
        };
    }, [currentScene]);

    // Update current time for cooldown display
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 100); // Update 10 times per second for smooth countdown

        return () => clearInterval(interval);
    }, []);

    // Only show when in SoccerMap scene
    if (currentScene !== "SoccerMap") {
        return null;
    }
    if (skills.length === 0) {
        return null;
    }

    return (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50">
            <div className="flex gap-2 pointer-events-auto">
                {skills.map((skill) => {
                    const cooldown = cooldowns.get(skill.id);
                    const isOnCooldown = cooldown
                        ? currentTime - cooldown.lastUsed < cooldown.cooldownMs
                        : false;
                    const remainingTime = cooldown
                        ? Math.max(
                              0,
                              Math.ceil(
                                  (cooldown.cooldownMs -
                                      (currentTime - cooldown.lastUsed)) /
                                      1000,
                              ),
                          )
                        : 0;
                    const cooldownPercent = cooldown
                        ? Math.min(
                              100,
                              ((currentTime - cooldown.lastUsed) /
                                  cooldown.cooldownMs) *
                                  100,
                          )
                        : 100;

                    return (
                        <SkillIcon
                            key={skill.id}
                            skill={skill}
                            isOnCooldown={isOnCooldown}
                            remainingTime={remainingTime}
                            cooldownPercent={cooldownPercent}
                        />
                    );
                })}
            </div>
        </div>
    );
}

interface SkillIconProps {
    skill: SkillConfig;
    isOnCooldown: boolean;
    remainingTime: number;
    cooldownPercent: number;
}

function SkillIcon({
    skill,
    isOnCooldown,
    remainingTime,
    cooldownPercent,
}: SkillIconProps) {
    // Get skill color based on type (from visual config)
    const getSkillColor = () => {
        if (skill.clientVisuals.trailColor !== undefined) {
            const color = skill.clientVisuals.trailColor;
            // Convert hex to RGB
            const r = (color >> 16) & 0xff;
            const g = (color >> 8) & 0xff;
            const b = color & 0xff;
            return `rgb(${r}, ${g}, ${b})`;
        }
        return "rgb(0, 255, 255)"; // Default cyan
    };

    const skillColor = getSkillColor();

    // Get skill icon path
    const getSkillIconPath = () => {
        const iconKey = skill.clientVisuals.iconKey || "time_dilation";
        return `/assets/skills/${iconKey}.jpg`;
    };


    return (
        <div className="relative group">
            {/* Skill container */}
            <div
                className={`relative w-16 h-16 rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                    isOnCooldown
                        ? "border-neutral-700 bg-neutral-900"
                        : "border-neutral-500 bg-neutral-800 hover:border-neutral-400"
                }`}
                style={{
                    boxShadow: isOnCooldown
                        ? "none"
                        : `0 0 10px ${skillColor}33, inset 0 0 10px ${skillColor}22`,
                }}
            >
                {/* Skill icon image */}
                <img
                    src={getSkillIconPath()}
                    alt={skill.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                        isOnCooldown ? "opacity-30" : "opacity-100"
                    }`}
                />

                {/* Clock-hand sweep overlay - reveals skill as cooldown progresses */}
                {isOnCooldown && (
                    <div
                        className="absolute inset-0 transition-all duration-100"
                        style={{
                            background: `conic-gradient(
                                from 0deg,
                                transparent 0deg,
                                transparent ${cooldownPercent * 3.6}deg,
                                rgba(0, 0, 0, 0.3) ${cooldownPercent * 3.6}deg,
                                rgba(0, 0, 0, 0.3) 360deg
                            )`,
                        }}
                    />
                )}

                {/* Cooldown timer */}
                {isOnCooldown && remainingTime > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {remainingTime}
                        </span>
                    </div>
                )}

                {/* Key binding indicator */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neutral-900 border-2 border-neutral-600 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-neutral-300">
                        {skill.keyBinding}
                    </span>
                </div>

                {/* Ready glow effect */}
                {!isOnCooldown && (
                    <div
                        className="absolute inset-0 rounded-lg animate-pulse"
                        style={{
                            boxShadow: `0 0 15px ${skillColor}66, inset 0 0 15px ${skillColor}33`,
                        }}
                    />
                )}
            </div>

            {/* Tooltip on hover - Dota 2 Style */}
            <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-y-2 group-hover:translate-y-0 z-[100]">
                <div className="bg-[#1b1e21] border-2 border-[#3c3f42] rounded-md overflow-hidden min-w-[280px] shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#2c3035] to-[#1b1e21] px-4 py-2 border-b border-[#3c3f42] flex justify-between items-center">
                        <span className="text-[#e1d6b5] font-bold text-lg uppercase tracking-wider drop-shadow-md">
                            {skill.name}
                        </span>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-neutral-600 border border-neutral-400"></div>
                            <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-tight">Active</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 bg-gradient-to-b from-[#1b1e21] to-[#131517]">
                        <div className="text-[#9da3a8] text-sm leading-relaxed mb-4 italic font-medium">
                            {skill.description}
                        </div>

                        {/* Attributes */}
                        <div className="space-y-3 border-t border-[#3c3f42] pt-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#7a7e81]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-[#7a7e81] text-[11px] font-bold uppercase tracking-wider">Cooldown:</span>
                                </div>
                                <span className="text-white font-mono font-bold text-sm">
                                    {skill.cooldownMs / 1000}s
                                </span>
                            </div>
                            
                            {skill.durationMs > 0 && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#7a7e81]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="text-[#7a7e81] text-[11px] font-bold uppercase tracking-wider">Duration:</span>
                                    </div>
                                    <span className="text-white font-mono font-bold text-sm">
                                        {skill.durationMs / 1000}s
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#7a7e81]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    <span className="text-[#7a7e81] text-[11px] font-bold uppercase tracking-wider">Hotkey:</span>
                                </div>
                                <span className="text-[#e1d6b5] font-mono font-bold text-xs bg-[#2c3035] px-2 py-0.5 rounded border border-[#3c3f42] shadow-inner">
                                    {skill.keyBinding}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-0.5">
                    <div className="border-[10px] border-transparent border-t-[#3c3f42]" />
                </div>
            </div>
        </div>
    );
}

export default SkillsHud;
