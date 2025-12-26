import { AudioChat } from "@/communication/audioChat/audioChat";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import { useState, useEffect, useCallback } from "react";

function useUiControls() {
    const audioService = AudioChat.getInstance();
    const videoCamService = VideoChatService.getInstance();

    const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
    const [isMembersUiOpen, setIsMembersUiOpen] = useState(false);
    const [isCalendarUiOpen, setIsCalendarUiOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(audioService.isMuted);
    const [isVideoOff, setIsVideoOff] = useState(true);

    // Microphone selection state
    const [availableMicrophones, setAvailableMicrophones] = useState<
        MediaDeviceInfo[]
    >([]);
    const [selectedMicrophoneId, setSelectedMicrophoneId] =
        useState<string>("");
    const [isMicSelectorOpen, setIsMicSelectorOpen] = useState(false);

    // Load available microphones
    const loadMicrophones = useCallback(async () => {
        try {
            const mics = await audioService.getAvailableMicrophones();
            setAvailableMicrophones(mics);

            // Set default microphone if none selected
            if (mics.length > 0 && !selectedMicrophoneId) {
                setSelectedMicrophoneId(mics[0].deviceId);
            }
        } catch (error) {
            console.error("Failed to load microphones:", error);
        }
    }, [audioService, selectedMicrophoneId]);

    // Listen for device changes
    useEffect(() => {
        loadMicrophones();

        const handleDeviceChange = () => {
            loadMicrophones();
        };

        navigator.mediaDevices.addEventListener(
            "devicechange",
            handleDeviceChange,
        );

        return () => {
            navigator.mediaDevices.removeEventListener(
                "devicechange",
                handleDeviceChange,
            );
        };
    }, [loadMicrophones]);

    function micControls() {
        function toggleMic() {
            setIsMuted((prev) => !prev);
            if (audioService.isMuted) {
                audioService.unMuteMic();
            } else {
                audioService.muteMic();
            }
        }

        return {
            isMuted,
            toggleMic,
        };
    }

    function microphoneSelector() {
        async function selectMicrophone(deviceId: string) {
            try {
                setSelectedMicrophoneId(deviceId);
                await audioService.switchMicrophone(deviceId);
                setIsMicSelectorOpen(false);
            } catch (error) {
                console.error("Failed to switch microphone:", error);
            }
        }

        function toggleMicSelector() {
            setIsMicSelectorOpen((prev) => !prev);
        }

        function closeMicSelector() {
            setIsMicSelectorOpen(false);
        }

        return {
            availableMicrophones,
            selectedMicrophoneId,
            selectMicrophone,
            isMicSelectorOpen,
            toggleMicSelector,
            closeMicSelector,
        };
    }

    function videoCamControls() {
        function toggleVideoCam() {
            setIsVideoOff((prev) => !prev);
            if (!isVideoOff) {
                videoCamService.stopVideoChat();
            }
        }

        return {
            isVideoOff,
            toggleVideoCam,
        };
    }

    function toggleChatWindow() {
        closeAllExcluding("chat");
        setIsChatWindowOpen((prev) => !prev);
    }

    function toggleMembersUi() {
        closeAllExcluding("members");
        setIsMembersUiOpen((prev) => !prev);
    }

    function toggleCalendarMenu() {
        closeAllExcluding("calendar");
        setIsCalendarUiOpen((prev) => !prev);
    }

    function closeAllExcluding(excluded: string) {
        const closeMap: Record<string, () => void> = {
            chat: () => {
                setIsMembersUiOpen(false);
                setIsCalendarUiOpen(false);
            },
            members: () => {
                setIsChatWindowOpen(false);
                setIsCalendarUiOpen(false);
            },
            calendar: () => {
                setIsMembersUiOpen(false);
                setIsChatWindowOpen(false);
            },
        };

        closeMap[excluded]?.();
    }

    return {
        micControls,
        microphoneSelector,
        videoCamControls,
        toggleMembersUi,
        isMembersUiOpen,
        toggleChatWindow,
        isChatWindowOpen,
        toggleCalendarMenu,
        isCalendarUiOpen,
    };
}

export default useUiControls;
