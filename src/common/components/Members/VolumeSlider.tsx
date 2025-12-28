import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import useAudioStore from "@/common/store/audioStore";

interface VolumeSliderProps {
    userName: string;
}

function VolumeSlider({ userName }: VolumeSliderProps) {
    const { getUserVolume, setUserVolume, isUserMuted, toggleUserMute } = useAudioStore();
    const [volume, setVolume] = useState(() => getUserVolume(userName));
    const isMuted = isUserMuted(userName);

    useEffect(() => {
        setVolume(getUserVolume(userName));
    }, [userName, getUserVolume]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseInt(e.target.value) / 100;
        setVolume(newVolume);
        setUserVolume(userName, newVolume);
    };

    const handleMuteToggle = () => {
        toggleUserMute(userName);
    };

    const displayVolume = Math.round(volume * 100);

    return (
        <div className="flex items-center gap-2 w-full mt-1">
            <button
                onClick={handleMuteToggle}
                className="p-1 rounded hover:bg-neutral-700 transition-colors flex-shrink-0"
                aria-label={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? (
                    <VolumeX size={14} className="text-red-400" />
                ) : (
                    <Volume2 size={14} className="text-neutral-400" />
                )}
            </button>

            <input
                type="range"
                min="0"
                max="200"
                value={displayVolume}
                onChange={handleVolumeChange}
                disabled={isMuted}
                className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-cyan-500
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-3
                    [&::-moz-range-thumb]:h-3
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-cyan-500
                    [&::-moz-range-thumb]:border-0
                    [&::-moz-range-thumb]:cursor-pointer"
            />

            <span className="text-xs text-neutral-400 w-10 text-right flex-shrink-0">
                {isMuted ? "0%" : `${displayVolume}%`}
            </span>
        </div>
    );
}

export default VolumeSlider;
