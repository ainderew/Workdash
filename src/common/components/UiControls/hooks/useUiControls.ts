import { AudioChat } from "@/communication/audioChat/audioChat";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import { useEffect, useCallback } from "react";
import useUiStore from "@/common/store/uiStore";

function useUiControls() {
    const audioService = AudioChat.getInstance();
    const videoCamService = VideoChatService.getInstance();

    
    const {
        isMuted,
        toggleMic: toggleMicState,
        setIsMuted,
        availableMicrophones,
        selectedMicrophoneId,
        setAvailableMicrophones,
        setSelectedMicrophoneId,
    } = useUiStore();

    
    const loadMicrophones = useCallback(async () => {
        try {
            const mics = await audioService.getAvailableMicrophones();
            setAvailableMicrophones(mics);

            
            if (mics.length > 0 && !selectedMicrophoneId) {
                setSelectedMicrophoneId(mics[0].deviceId);
            }
        } catch (error) {
            console.error("Failed to load microphones:", error);
        }
    }, [audioService, selectedMicrophoneId, setAvailableMicrophones, setSelectedMicrophoneId]);

    
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
