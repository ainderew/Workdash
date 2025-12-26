import { AudioChat } from "@/communication/audioChat/audioChat";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import { useEffect, useCallback } from "react";
import useUiStore from "@/common/store/uiStore";

function useUiControls() {
    const audioService = AudioChat.getInstance();
    const videoCamService = VideoChatService.getInstance();

    // Get state and actions from Zustand store
    const {
        isMuted,
        toggleMic: toggleMicState,
        setIsMuted,
        availableMicrophones,
        selectedMicrophoneId,
        setAvailableMicrophones,
        setSelectedMicrophoneId,
    } = useUiStore();

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
    }, [audioService, selectedMicrophoneId, setAvailableMicrophones, setSelectedMicrophoneId]);

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

    // Initialize muted state from audio service
    useEffect(() => {
        setIsMuted(audioService.isMuted);
    }, [audioService.isMuted, setIsMuted]);

    function micControls() {
        function toggleMic() {
            toggleMicState();
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
        const {
            toggleMicSelector,
            closeMicSelector,
            isMicSelectorOpen,
        } = useUiStore();

        async function selectMicrophone(deviceId: string) {
            try {
                setSelectedMicrophoneId(deviceId);
                await audioService.switchMicrophone(deviceId);
                closeMicSelector();
            } catch (error) {
                console.error("Failed to switch microphone:", error);
            }
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
        const { isVideoOff, toggleVideoCam: toggleVideoCamState } = useUiStore();

        function toggleVideoCam() {
            toggleVideoCamState();
            if (!isVideoOff) {
                videoCamService.stopVideoChat();
            }
        }

        return {
            isVideoOff,
            toggleVideoCam,
        };
    }

    // Get panel state and actions from store
    const {
        toggleChatWindow,
        isChatWindowOpen,
        toggleMembersUi,
        isMembersUiOpen,
        toggleCalendarMenu,
        isCalendarUiOpen,
    } = useUiStore();

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
