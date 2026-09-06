import React from "react";
import {
    MessageCircle,
    Mic,
    MicOff,
    Settings,
    Users,
    VideoIcon,
    VideoOff,
} from "lucide-react";
import useUiStore from "@/common/store/uiStore";
import { ModeSwitchButton } from "../ModeSwitch/ModeSwitchButton";

interface MobileWorldControlsProps {
    isMuted: boolean;
    onToggleMic: () => void;
    isVideoOff: boolean;
    onToggleVideo: () => void;
    onOpenChat: () => void;
    onOpenMembers: () => void;
}

const buttonClass =
    "flex-1 max-w-14 h-11 inline-flex items-center justify-center rounded-xl wd-bg-elevated wd-text-primary active:bg-[var(--wd-surface-base)] transition-colors";

/**
 * Phone and tablet replacement for the world-mode control hub. That hub is
 * over 1000px of fixed-width controls with no left/right anchor, so below
 * 1024px its right half sits outside the viewport. The desk-mode switch lives
 * in that unreachable half, which strands phone users in world mode.
 */
function MobileWorldControls({
    isMuted,
    onToggleMic,
    isVideoOff,
    onToggleVideo,
    onOpenChat,
    onOpenMembers,
}: MobileWorldControlsProps) {
    const openCharacterCustomization = useUiStore(
        (state) => state.openCharacterCustomization,
    );

    return (
        <div
            className="wd-control-hub-legacy lg:hidden fixed inset-x-2 bottom-0 z-40 pb-[env(safe-area-inset-bottom,0px)]"
            role="toolbar"
            aria-label="World controls"
        >
            <div className="mb-2 flex items-center justify-between gap-1 rounded-2xl bg-primary/85 backdrop-blur-sm px-2 py-2 shadow-lg">
                <button
                    type="button"
                    onClick={onToggleMic}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    aria-pressed={isMuted}
                    className={`${buttonClass} ${isMuted ? "text-[var(--wd-danger)]" : ""}`}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                    type="button"
                    onClick={onToggleVideo}
                    aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
                    aria-pressed={!isVideoOff}
                    className={`${buttonClass} ${isVideoOff ? "text-[var(--wd-danger)]" : ""}`}
                >
                    {isVideoOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
                </button>

                <button
                    type="button"
                    onClick={onOpenChat}
                    aria-label="Chat"
                    className={buttonClass}
                >
                    <MessageCircle size={20} />
                </button>

                <button
                    type="button"
                    onClick={onOpenMembers}
                    aria-label="Members"
                    className={buttonClass}
                >
                    <Users size={20} />
                </button>

                <button
                    type="button"
                    onClick={() => openCharacterCustomization("selection")}
                    aria-label="Settings"
                    className={buttonClass}
                >
                    <Settings size={20} />
                </button>

                <ModeSwitchButton iconSize={20} className={buttonClass} />
            </div>
        </div>
    );
}

export default MobileWorldControls;
