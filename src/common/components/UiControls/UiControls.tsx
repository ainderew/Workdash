import React, { useRef, useEffect } from "react";
import UiControlsButton from "./UiControlsButton";
import {
    Mic,
    MicOff,
    MessageCircle,
    PhoneMissed,
    VideoIcon,
    VideoOff,
    ScreenShare as ScreenShareIcon,
    CalendarFold,
    ChevronUp,
    Check,
} from "lucide-react";
import useUiControls from "./hooks/useUiControls";
import ChatWindow from "../TextChat/ChatWindow";
import CharacterButton from "./CharacterButton";
import { ScreenShareService } from "@/communication/screenShare/screenShare";
import { ButtonSizeEnum, ColorEnum } from "./_enums";
import UiOnlineButton from "./UiOnlineButton";
import MembersUi from "../Members/MembersUi";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import CalendarMenu from "../Google/CalendarMenu";
import ReactionButton from "./ReactionButton";
import useMessagingStore, {
    MessagingState,
} from "@/common/store/messagingStore";
import useUiStore from "@/common/store/uiStore";
import { SoccerStatsModal } from "./modal/SoccerStatsModal";

function UiControls() {
    const {
        micControls,
        microphoneSelector,
        videoCamControls,
        toggleChatWindow,
        isChatWindowOpen,
        toggleMembersUi,
        isMembersUiOpen,
        toggleCalendarMenu,
        isCalendarUiOpen,
    } = useUiControls();

    const { isMuted, toggleMic } = micControls();
    const { isVideoOff, toggleVideoCam } = videoCamControls();
    const {
        availableMicrophones,
        selectedMicrophoneId,
        selectMicrophone,
        isMicSelectorOpen,
        toggleMicSelector,
        closeMicSelector,
    } = microphoneSelector();

    const unreadCount = useMessagingStore(
        (state: MessagingState) => state.unreadCount,
    );

    const isSoccerStatsModalOpen = useUiStore((state) => state.isSoccerStatsModalOpen);
    const closeSoccerStatsModal = useUiStore((state) => state.closeSoccerStatsModal);

    // Ref for click outside detection
    const micSelectorRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                micSelectorRef.current &&
                !micSelectorRef.current.contains(event.target as Node)
            ) {
                closeMicSelector();
            }
        }

        if (isMicSelectorOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMicSelectorOpen, closeMicSelector]);

    const handleScreenShare = async () => {
        try {
            const screenShare = ScreenShareService.getInstance();
            screenShare.startScreenShare();
            console.log("Screen sharing started successfully");
        } catch (error) {
            console.error("Screen share error:", error);

            if (error instanceof Error) {
                if (error.name === "NotAllowedError") {
                    alert("Screen sharing permission denied");
                } else if (error.name === "NotFoundError") {
                    alert("No screen available to share");
                } else {
                    alert("Failed to start screen sharing");
                }
            }
        }
    };

    const handleShareVideoCam = async () => {
        try {
            const videoChat = VideoChatService.getInstance();
            videoChat.startVideoChat();
            toggleVideoCam();
        } catch (error) {
            console.error("Video chat error:", error);

            if (error instanceof Error) {
                if (error.name === "NotAllowedError") {
                    alert("Camera permission denied");
                } else if (error.name === "NotFoundError") {
                    alert("No camera available");
                } else {
                    alert("Failed to start video chat");
                }
            }
        }
    };

    return (
        <div className="h-[var(--ui-controls-height)] w-fit fixed rounded-xl bottom-4 flex gap-4 justify-between items-center bg-primary/80 px-5">
            <div className="controller-container flex gap-4 items-center pr-30">
                <CharacterButton />

                <UiControlsButton
                    icon={PhoneMissed}
                    label={"Leave Call"}
                    round={true}
                    size={ButtonSizeEnum.large}
                />

                <UiControlsButton
                    onClick={handleShareVideoCam}
                    icon={isVideoOff ? VideoOff : VideoIcon}
                    label={"Share Video"}
                    size={ButtonSizeEnum.regular}
                    color={isVideoOff ? ColorEnum.darkRed : ColorEnum.darkGreen}
                    textColor={isVideoOff ? ColorEnum.red : ColorEnum.green}
                />

                <div className="relative" ref={micSelectorRef}>
                    <button
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                            isMuted ? "bg-red-950" : "bg-green-950"
                        }`}
                    >
                        <div
                            onClick={toggleMic}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            {isMuted ? (
                                <MicOff size={20} className="text-red-600" />
                            ) : (
                                <Mic size={20} className="text-green-600" />
                            )}
                        </div>

                        <div
                            className={`w-px h-5 mx-1 ${isMuted ? "bg-red-400/30" : "bg-green-400/30"}`}
                        />

                        <div
                            onClick={toggleMicSelector}
                            className="cursor-pointer p-1 rounded hover:bg-white/10 transition-colors"
                            aria-label="Select microphone"
                        >
                            <ChevronUp
                                size={14}
                                className={`transition-transform ${isMuted ? "text-red-400/70" : "text-green-400/70"} ${
                                    isMicSelectorOpen ? "rotate-180" : ""
                                }`}
                            />
                        </div>
                    </button>

                    {isMicSelectorOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-50">
                            <div className="px-3 py-2 border-b border-gray-700">
                                <span className="text-xs text-gray-400 uppercase tracking-wide">
                                    Select Microphone
                                </span>
                            </div>

                            <div className="max-h-48 overflow-y-auto">
                                {availableMicrophones.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-400">
                                        No microphones found
                                    </div>
                                ) : (
                                    availableMicrophones.map((mic) => (
                                        <button
                                            key={mic.deviceId}
                                            onClick={() =>
                                                selectMicrophone(mic.deviceId)
                                            }
                                            className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-700 transition-colors ${
                                                selectedMicrophoneId ===
                                                mic.deviceId
                                                    ? "bg-gray-700/50"
                                                    : ""
                                            }`}
                                        >
                                            <span className="text-white truncate pr-2">
                                                {mic.label ||
                                                    `Microphone ${mic.deviceId.slice(0, 8)}`}
                                            </span>

                                            {selectedMicrophoneId ===
                                                mic.deviceId && (
                                                <Check
                                                    size={16}
                                                    className="text-green-400 flex-shrink-0"
                                                />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <UiControlsButton
                    onClick={handleScreenShare}
                    icon={ScreenShareIcon}
                    label={"Share Screen"}
                    size={ButtonSizeEnum.regular}
                />

                <ReactionButton />
            </div>

            <div className="chat-buttons-container items-center flex gap-4">
                <UiControlsButton
                    onClick={toggleCalendarMenu}
                    icon={CalendarFold}
                    label={"Calendar"}
                />

                <UiControlsButton
                    onClick={toggleChatWindow}
                    icon={MessageCircle}
                    label={"Chat"}
                    badgeCount={unreadCount}
                />

                <UiOnlineButton onClick={toggleMembersUi} />
            </div>

            <CalendarMenu
                isOpen={isCalendarUiOpen}
                onClose={toggleCalendarMenu}
            />

            <ChatWindow isOpen={isChatWindowOpen} onClose={toggleChatWindow} />

            <MembersUi
                isMembersUiOpen={isMembersUiOpen}
                onClose={toggleMembersUi}
            />

            <SoccerStatsModal
                isOpen={isSoccerStatsModalOpen}
                onClose={closeSoccerStatsModal}
            />
        </div>
    );
}

export default UiControls;
