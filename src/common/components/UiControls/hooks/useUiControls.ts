import { AudioChat } from "@/communication/audioChat/audioChat";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import { useEffect, useCallback } from "react";
import useUiStore from "@/common/store/uiStore";
import useCallStore from "@/common/store/callStore";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";

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
        availableCameras,
        selectedCameraId,
        setAvailableCameras,
        setSelectedCameraId,
    } = useUiStore();

    const loadMicrophones = useCallback(async () => {
        try {
            const mics = await audioService.getAvailableMicrophones();
            setAvailableMicrophones(mics);

            // Auto-select first mic only if none is selected yet
            const currentMicId = useUiStore.getState().selectedMicrophoneId;
            if (mics.length > 0 && !currentMicId) {
                setSelectedMicrophoneId(mics[0].deviceId);
            }
        } catch (error) {
            console.error("Failed to load microphones:", error);
        }
    }, [audioService, setAvailableMicrophones, setSelectedMicrophoneId]);

    const loadCameras = useCallback(async () => {
        try {
            const cameras = await videoCamService.getAvailableCameras();
            setAvailableCameras(cameras);

            const currentCamId = useUiStore.getState().selectedCameraId;
            if (cameras.length > 0 && !currentCamId) {
                setSelectedCameraId(cameras[0].deviceId);
            }
        } catch (error) {
            console.error("Failed to load cameras:", error);
        }
    }, [videoCamService, setAvailableCameras, setSelectedCameraId]);

    useEffect(() => {
        loadMicrophones();
        loadCameras();

        const handleDeviceChange = () => {
            loadMicrophones();
            loadCameras();
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
    }, [loadMicrophones, loadCameras]);

    
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

            const call = useCallStore.getState().currentCall;
            if (call) {
                CallSignalingService.getInstance().setMedia(call.channelId, {
                    audio: audioService.isMuted, // was muted, now unmuted
                });
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

    function cameraSelector() {
        async function selectCamera(deviceId: string) {
            try {
                setSelectedCameraId(deviceId);
                await videoCamService.switchCamera(deviceId);
            } catch (error) {
                console.error("Failed to switch camera:", error);
            }
        }

        return {
            availableCameras,
            selectedCameraId,
            selectCamera,
        };
    }

    function videoCamControls() {
        const { isVideoOff, toggleVideoCam: toggleVideoCamState } = useUiStore();

        function toggleVideoCam() {
            toggleVideoCamState();
            if (!isVideoOff) {
                videoCamService.stopVideoChat();
            }

            const call = useCallStore.getState().currentCall;
            if (call) {
                CallSignalingService.getInstance().setMedia(call.channelId, {
                    video: isVideoOff, // was off, now on
                });
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
        cameraSelector,
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
