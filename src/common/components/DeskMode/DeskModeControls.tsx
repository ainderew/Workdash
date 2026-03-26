import React from "react";
import { Mic, MicOff, ScreenShare, Video, VideoOff } from "lucide-react";
import useUiControls from "@/common/components/UiControls/hooks/useUiControls";
import useCallStore from "@/common/store/callStore";
import { ScreenShareService } from "@/communication/screenShare/screenShare";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import SoundboardButton from "@/common/components/Soundboard/SoundboardButton";

interface DeskModeControlsProps {
    compact?: boolean;
    showMicrophoneSelector?: boolean;
}

function DeskModeControlsInner({
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
            await screenShare.startScreenShare();
        } catch (error) {
            console.error("Screen share error:", error);
        }
    };

    const handleToggleVideo = async () => {
        try {
            if (isVideoOff) {
                const videoChat = VideoChatService.getInstance();
                await videoChat.startVideoChat();
            } else {
                const videoChat = VideoChatService.getInstance();
                videoChat.stopVideoChat();
            }
            toggleVideoCam();
        } catch (error) {
            console.error("Video chat error:", error);
        }
    };

    return (
        <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
            <button
                type="button"
                onClick={toggleMic}
                title={isMuted ? "Unmute microphone" : "Mute microphone"}
                className={`wd-dock-action-btn ${
                    isMuted
                        ? "wd-dock-action-btn--danger"
                        : "wd-dock-action-btn--success"
                }`}
            >
                {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            <button
                type="button"
                onClick={() => {
                    void handleToggleVideo();
                }}
                title={isVideoOff ? "Start camera" : "Stop camera"}
                className={`wd-dock-action-btn ${
                    isVideoOff
                        ? "wd-dock-action-btn--danger"
                        : "wd-dock-action-btn--success"
                }`}
            >
                {isVideoOff ? <VideoOff size={15} /> : <Video size={15} />}
            </button>

            <button
                type="button"
                onClick={() => {
                    void handleScreenShare();
                }}
                title="Share screen"
                className="wd-dock-action-btn"
            >
                <ScreenShare size={15} />
            </button>

            <SoundboardButton />

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

function DeskModeControls(props: DeskModeControlsProps) {
    const currentCall = useCallStore((s) => s.currentCall);
    if (!currentCall) return null;
    return <DeskModeControlsInner {...props} />;
}

export default DeskModeControls;
