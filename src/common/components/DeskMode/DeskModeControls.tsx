import React from "react";
import { Mic, MicOff, ScreenShare, Video, VideoOff } from "lucide-react";
import useUiControls from "@/common/components/UiControls/hooks/useUiControls";
import { ScreenShareService } from "@/communication/screenShare/screenShare";
import { VideoChatService } from "@/communication/videoChat/videoChat";

interface DeskModeControlsProps {
    compact?: boolean;
    showMicrophoneSelector?: boolean;
}

function DeskModeControls({
    compact = false,
    showMicrophoneSelector = true,
}: DeskModeControlsProps) {
    const { micControls, microphoneSelector, videoCamControls } = useUiControls();
    const { isMuted, toggleMic } = micControls();
    const { isVideoOff, toggleVideoCam } = videoCamControls();
    const {
        availableMicrophones,
        selectedMicrophoneId,
        selectMicrophone,
    } = microphoneSelector();

    const handleScreenShare = async () => {
        try {
            const screenShare = ScreenShareService.getInstance();
            screenShare.startScreenShare();
        } catch (error) {
            console.error("Screen share error:", error);
        }
    };

    const handleToggleVideo = async () => {
        try {
            if (isVideoOff) {
                const videoChat = VideoChatService.getInstance();
                videoChat.startVideoChat();
            }
            toggleVideoCam();
        } catch (error) {
            console.error("Video chat error:", error);
        }
    };

    const controlButtonSize = compact ? "h-7 w-7" : "h-8 w-8";

    return (
        <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
            <button
                type="button"
                onClick={toggleMic}
                title={isMuted ? "Unmute microphone" : "Mute microphone"}
                className={`inline-flex ${controlButtonSize} items-center justify-center rounded-md border transition-colors ${
                    isMuted
                        ? "border-[var(--wd-danger)] text-[var(--wd-danger)] hover:bg-[color-mix(in_srgb,var(--wd-danger)_18%,transparent)]"
                        : "border-[var(--wd-success)] text-[var(--wd-success)] hover:bg-[color-mix(in_srgb,var(--wd-success)_18%,transparent)]"
                }`}
            >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <button
                type="button"
                onClick={() => {
                    void handleToggleVideo();
                }}
                title={isVideoOff ? "Start camera" : "Stop camera"}
                className={`inline-flex ${controlButtonSize} items-center justify-center rounded-md border transition-colors ${
                    isVideoOff
                        ? "border-[var(--wd-danger)] text-[var(--wd-danger)] hover:bg-[color-mix(in_srgb,var(--wd-danger)_18%,transparent)]"
                        : "border-[var(--wd-success)] text-[var(--wd-success)] hover:bg-[color-mix(in_srgb,var(--wd-success)_18%,transparent)]"
                }`}
            >
                {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>

            <button
                type="button"
                onClick={() => {
                    void handleScreenShare();
                }}
                title="Share screen"
                className={`inline-flex ${controlButtonSize} items-center justify-center rounded-md border wd-border-subtle wd-bg-elevated wd-text-secondary transition-colors hover:bg-[var(--wd-surface-base)]`}
            >
                <ScreenShare size={16} />
            </button>

            {showMicrophoneSelector && (
                <>
                    <label htmlFor="desk-mic-select" className="sr-only">
                        Select microphone
                    </label>
                    <select
                        id="desk-mic-select"
                        value={selectedMicrophoneId || ""}
                        disabled={availableMicrophones.length === 0}
                        onChange={(event) => {
                            void selectMicrophone(event.target.value);
                        }}
                        className="h-8 min-w-40 rounded-md border wd-border-subtle wd-bg-elevated px-2 text-xs wd-text-secondary outline-none transition-colors focus:border-[var(--wd-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {availableMicrophones.length === 0 && (
                            <option value="">No microphones</option>
                        )}
                        {availableMicrophones.map((mic) => (
                            <option key={mic.deviceId} value={mic.deviceId}>
                                {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                            </option>
                        ))}
                    </select>
                </>
            )}
        </div>
    );
}

export default DeskModeControls;
