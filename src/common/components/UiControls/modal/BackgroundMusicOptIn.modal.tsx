import React from "react";
import { Music, Volume2, VolumeX } from "lucide-react";
import { EventBus } from "@/game/EventBus";
import { AudioSettingsService } from "@/game/audio/AudioSettingsService";

interface BackgroundMusicOptInModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BackgroundMusicOptInModal({
    isOpen,
    onClose,
}: BackgroundMusicOptInModalProps) {
    const settingsService = AudioSettingsService.getInstance();

    const handleChoice = async (enabled: boolean) => {
        // Save the choice
        await settingsService.setBackgroundMusicEnabled(enabled);

        // Emit event to toggle music
        EventBus.emit("background-music-toggle", enabled);

        // Close modal
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <h2 className="text-xl font-semibold text-white text-center mb-3">
                    Enable Background Music?
                </h2>

                <p className="text-sm text-neutral-400 text-center mb-6">
                    We&apos;ve started playing some background music to enhance
                    your experience. Would you like to keep it playing?
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => handleChoice(true)}
                        className="w-full p-4 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg transition-all group flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                            <Volume2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-white font-medium">
                                Yes, Keep Playing
                            </h3>
                            <p className="text-xs text-blue-100 mt-0.5">
                                Continue with background music
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleChoice(false)}
                        className="w-full p-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-lg transition-all group flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-neutral-700 rounded-lg flex items-center justify-center group-hover:bg-neutral-600">
                            <VolumeX className="w-6 h-6 text-neutral-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-white font-medium">
                                No, Mute Music
                            </h3>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Play without background music
                            </p>
                        </div>
                    </button>
                </div>

                <p className="text-xs text-neutral-500 text-center mt-4">
                    You can always change this later in settings
                </p>
            </div>
        </div>
    );
}
