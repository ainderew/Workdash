import React, { useEffect, useState } from "react";
import { X, User, Palette, Music } from "lucide-react";
import { EventBus } from "@/game/EventBus";
import { AudioSettingsService } from "@/game/audio/AudioSettingsService";

interface SettingsSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectName: () => void;
    onSelectCharacter: () => void;
}

export function SettingsSelectionModal({
    isOpen,
    onClose,
    onSelectName,
    onSelectCharacter,
}: SettingsSelectionModalProps) {
    const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
    const [volume, setVolume] = useState(0.3);
    const settingsService = AudioSettingsService.getInstance();

    useEffect(() => {
        if (isOpen) {
            // Load current settings when modal opens
            settingsService.getSettings().then((settings) => {
                setBackgroundMusicEnabled(settings.backgroundMusicEnabled ?? false);
                setVolume(settings.volume);
            });
        }
    }, [isOpen]);

    const handleMusicToggle = async () => {
        const newValue = !backgroundMusicEnabled;
        setBackgroundMusicEnabled(newValue);

        // Save setting
        await settingsService.setBackgroundMusicEnabled(newValue);

        // Emit event to toggle music
        EventBus.emit("background-music-toggle", newValue);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);

        // Emit event to change volume in real-time
        EventBus.emit("background-music-volume", newVolume);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-neutral-400 mb-6">
                    Choose what you&apos;d like to customize
                </p>

                <div className="space-y-3">
                    {/* Edit Name Option */}
                    <button
                        onClick={onSelectName}
                        className="w-full p-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-amber-500/50 rounded-lg transition-all group flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                            <User className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-white font-medium">
                                Edit Display Name
                            </h3>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Change how others see you
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={onSelectCharacter}
                        className="w-full p-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-blue-500/50 rounded-lg transition-all group flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                            <Palette className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-white font-medium">
                                Customize Character
                            </h3>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Personalize your avatar appearance
                            </p>
                        </div>
                    </button>

                    {/* Background Music Settings - Combined */}
                    <div className="w-full p-4 bg-neutral-800 border border-neutral-700 hover:border-purple-500/50 rounded-lg transition-all">
                        {/* Toggle */}
                        <button
                            onClick={handleMusicToggle}
                            className="w-full flex items-center gap-4 group"
                        >
                            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                <Music className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="text-white font-medium">
                                    Background Music
                                </h3>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                    {backgroundMusicEnabled ? "Playing" : "Muted"}
                                </p>
                            </div>
                            <div className="flex items-center">
                                <div
                                    className={`relative w-12 h-6 rounded-full transition-colors ${
                                        backgroundMusicEnabled
                                            ? "bg-purple-500"
                                            : "bg-neutral-600"
                                    }`}
                                >
                                    <div
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                            backgroundMusicEnabled
                                                ? "translate-x-6"
                                                : "translate-x-0"
                                        }`}
                                    />
                                </div>
                            </div>
                        </button>

                        {/* Volume Slider - Only show when music is enabled */}
                        {backgroundMusicEnabled && (
                            <div className="mt-4 pt-4 border-t border-neutral-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-neutral-300 font-medium">
                                        Volume
                                    </span>
                                    <span className="text-xs text-purple-400">
                                        {Math.round(volume * 100)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                                    style={{
                                        background: `linear-gradient(to right, rgb(168 85 247) 0%, rgb(168 85 247) ${volume * 100}%, rgb(64 64 64) ${volume * 100}%, rgb(64 64 64) 100%)`,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
