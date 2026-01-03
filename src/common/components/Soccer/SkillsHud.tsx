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

        console.log("Skills HUD: Requesting skill configs...");

        // Request skill configs
        socket.emit("soccer:requestSkillConfig", (configs: SkillConfig[]) => {
            console.log("Skills HUD: Received skill configs:", configs);
            setSkills(configs);
        });

        // Listen for skill activation to track cooldowns
        const handleSkillActivated = (data: {
            activatorId: string;
            skillId: string;
            affectedPlayers: string[];
            duration: number;
            visualConfig: any;
        }) => {
            // Check if this is the local player
            const localPlayerId = multiplayer.socket.id;
            if (data.activatorId === localPlayerId) {
                setSkills((currentSkills) => {
                    const skill = currentSkills.find(
                        (s) => s.id === data.skillId,
                    );
                    if (skill) {
                        setCooldowns((prev) => {
                            const newCooldowns = new Map(prev);
                            newCooldowns.set(data.skillId, {
                                lastUsed: Date.now(),
                                cooldownMs: skill.cooldownMs,
                            });
                            return newCooldowns;
                        });
                    }
                    return currentSkills;
                });
            }
        };

        socket.on("soccer:skillActivated", handleSkillActivated);

        return () => {
            socket.off("soccer:skillActivated", handleSkillActivated);
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
        console.log("Skills HUD: Not in SoccerMap scene:", currentScene);
        return null;
    }
    if (skills.length === 0) {
        console.log("Skills HUD: No skills loaded yet");
        return null;
    }

    console.log("Skills HUD: Rendering with", skills.length, "skills");

    return (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex gap-2">
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
        if (skill.id === "slowdown") {
            return "/assets/skills/time_dilation.jpg";
        }
        // Add more skill icons here as needed
        return "/assets/skills/time_dilation.jpg";
    };

    // Calculate rotation angle for clock animation (0 to 360 degrees)
    const clockRotation = (cooldownPercent / 100) * 360;

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

            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 min-w-[200px] shadow-xl">
                    <div className="text-white font-bold text-sm mb-1">
                        {skill.name}
                    </div>
                    <div className="text-neutral-400 text-xs mb-2">
                        {skill.description}
                    </div>
                    <div className="text-neutral-500 text-xs border-t border-neutral-700 pt-1">
                        Cooldown: {skill.cooldownMs / 1000}s
                    </div>
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                    <div className="border-4 border-transparent border-t-neutral-700" />
                </div>
            </div>
        </div>
    );
}

export default SkillsHud;
