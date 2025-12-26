import React from "react";
import { X, User, Palette } from "lucide-react";

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
                </div>
            </div>
        </div>
    );
}
