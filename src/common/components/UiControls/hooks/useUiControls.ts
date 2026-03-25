import { AudioChat } from "@/communication/audioChat/audioChat";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import { useEffect } from "react";
import useUiStore from "@/common/store/uiStore";
import useCallStore from "@/common/store/callStore";
import { CallSignalingService } from "@/communication/callSignaling/callSignalingService";

// Hoist singleton references to module level for stable identity
const audioService = AudioChat.getInstance();
const videoCamService = VideoChatService.getInstance();

function useUiControls() {
    // Individual selectors so this hot-path component only re-renders when its own values change
    const isMuted = useUiStore((s) => s.isMuted);
    const setIsMuted = useUiStore((s) => s.setIsMuted);
    const availableMicrophones = useUiStore((s) => s.availableMicrophones);
    const selectedMicrophoneId = useUiStore((s) => s.selectedMicrophoneId);
    const setSelectedMicrophoneId = useUiStore((s) => s.setSelectedMicrophoneId);
    const availableCameras = useUiStore((s) => s.availableCameras);
    const selectedCameraId = useUiStore((s) => s.selectedCameraId);
    const setSelectedCameraId = useUiStore((s) => s.setSelectedCameraId);
    const isVideoOff = useUiStore((s) => s.isVideoOff);
    const toggleVideoCamState = useUiStore((s) => s.toggleVideoCam);
    const toggleMicSelector = useUiStore((s) => s.toggleMicSelector);
    const closeMicSelector = useUiStore((s) => s.closeMicSelector);
    const isMicSelectorOpen = useUiStore((s) => s.isMicSelectorOpen);
    const toggleChatWindow = useUiStore((s) => s.toggleChatWindow);
    const isChatWindowOpen = useUiStore((s) => s.isChatWindowOpen);
    const toggleMembersUi = useUiStore((s) => s.toggleMembersUi);
    const isMembersUiOpen = useUiStore((s) => s.isMembersUiOpen);
    const toggleCalendarMenu = useUiStore((s) => s.toggleCalendarMenu);
    const isCalendarUiOpen = useUiStore((s) => s.isCalendarUiOpen);

    // Request mic/camera permissions on first mount so enumerateDevices()
    // returns labeled devices. The app-level useDeviceEnumeration hook
    // handles ongoing enumeration and devicechange events.
    useEffect(() => {
        const grantPermissions = async () => {
            try {
                const mics = await audioService.getAvailableMicrophones();
                useUiStore.getState().setAllDevices({
                    microphones: mics,
                    cameras: useUiStore.getState().availableCameras,
                    outputs: useUiStore.getState().availableOutputDevices,
                });
            } catch {
                // Permission denied — labels stay empty
            }
            try {
                const cams = await videoCamService.getAvailableCameras();
                useUiStore.getState().setAllDevices({
                    microphones: useUiStore.getState().availableMicrophones,
                    cameras: cams,
                    outputs: useUiStore.getState().availableOutputDevices,
                });
            } catch {
                // Permission denied — labels stay empty
            }
        };
        grantPermissions();
    }, []);


    useEffect(() => {
        setIsMuted(audioService.isMuted);
    }, [setIsMuted]);

    function micControls() {
        function toggleMic() {
            if (audioService.isMuted) {
                audioService.unMuteMic();
            } else {
                audioService.muteMic();
            }

            const call = useCallStore.getState().currentCall;
            if (call) {
                CallSignalingService.getInstance().setMedia(call.channelId, {
                    audio: !audioService.isMuted,
                });
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
                closeMicSelector();
            } catch {
                // switch failed — UI already updated optimistically
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
            } catch {
                // switch failed — UI already updated optimistically
            }
        }

        return {
            availableCameras,
            selectedCameraId,
            selectCamera,
        };
    }

    function videoCamControls() {
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
