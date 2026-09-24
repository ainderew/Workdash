import React from "react";
import { logger } from "@/common/utils/logger";
import UiControlsButton from "./UiControlsButton";
import {
    MessageCircle,
    PhoneMissed,
    VideoIcon,
    VideoOff,
    ScreenShare as ScreenShareIcon,
    CalendarFold,
    Map,
    Monitor,
} from "lucide-react";
import useUiControls from "./hooks/useUiControls";
import CharacterButton from "./CharacterButton";
import { ScreenShareService } from "@/communication/screenShare/screenShare";
import { ButtonSizeEnum, ColorEnum } from "./_enums";
import UiOnlineButton from "./UiOnlineButton";
import MembersUi from "../Members/MembersUi";
import { VideoChatService } from "@/communication/videoChat/videoChat";
import CalendarMenu from "../Google/CalendarMenu";
import ReactionButton from "./ReactionButton";
import MicSplitButton from "@/common/components/DeskMode/MicSplitButton";
import useUiStore from "@/common/store/uiStore";
import { SoccerStatsModal } from "./modal/SoccerStatsModal";
import { SoccerGameControlModal } from "./modal/SoccerGameControlModal";
import { MatchHistoryModal } from "./modal/MatchHistoryModal";
import DeskChatDrawer from "../DeskMode/DeskChatDrawer";
import { WorldWorkspaceSwitcher } from "./WorldWorkspaceSwitcher";
import MobileWorldControls from "./MobileWorldControls";

interface UiControlsProps {
    isVisible?: boolean;
}

function UiControls({ isVisible = true }: UiControlsProps) {
    const {
        micControls,
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

    const isSoccerStatsModalOpen = useUiStore((state) => state.isSoccerStatsModalOpen);
    const closeSoccerStatsModal = useUiStore((state) => state.closeSoccerStatsModal);

    const isSoccerGameControlModalOpen = useUiStore((state) => state.isSoccerGameControlModalOpen);
    const closeSoccerGameControlModal = useUiStore((state) => state.closeSoccerGameControlModal);

    const isMatchHistoryModalOpen = useUiStore((state) => state.isMatchHistoryModalOpen);
    const closeMatchHistoryModal = useUiStore((state) => state.closeMatchHistoryModal);
    const interactionMode = useUiStore((state) => state.interactionMode);
    const toggleInteractionMode = useUiStore((state) => state.toggleInteractionMode);

    const handleScreenShare = async () => {
        try {
            const screenShare = ScreenShareService.getInstance();
            screenShare.startScreenShare();
            logger.log("Screen sharing started successfully");
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
        if (isVideoOff) {
            try {
                await VideoChatService.getInstance().startVideoChat();
            } catch (error) {
                // Camera/permission failures are already toasted by startVideoChat.
                // Leave the button off so it reflects that nothing is being sent.
                logger.error("Video chat error:", error);
                return;
            }
        }
        toggleVideoCam();
    };

    return (
        <>
            <div
                className={`wd-control-hub-legacy h-[var(--ui-controls-height)] w-fit fixed rounded-xl bottom-4 hidden lg:flex gap-4 justify-between items-center bg-primary/80 px-5 z-40 transition-all duration-200 ease-out ${
                    isVisible
                        ? "translate-y-0 opacity-100 pointer-events-auto"
                        : "translate-y-8 opacity-0 pointer-events-none"
                }`}
            >
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

                    <MicSplitButton
                        isMuted={isMuted}
                        onToggleMic={toggleMic}
                        size="lg"
                        variant="block"
                    />

                    <UiControlsButton
                        onClick={handleScreenShare}
                        icon={ScreenShareIcon}
                        label={"Share Screen"}
                        size={ButtonSizeEnum.regular}
                    />

                    <ReactionButton />
                </div>

                <div className="chat-buttons-container items-center flex gap-4">
                    {interactionMode === "world" && (
                        <WorldWorkspaceSwitcher
                            onOpenChatDrawer={toggleChatWindow}
                        />
                    )}

                    <UiControlsButton
                        onClick={toggleInteractionMode}
                        icon={interactionMode === "world" ? Monitor : Map}
                        label={interactionMode === "world" ? "Desk Mode" : "2D Mode"}
                    />

                    <UiControlsButton
                        onClick={toggleCalendarMenu}
                        icon={CalendarFold}
                        label={"Calendar"}
                    />

                    <UiControlsButton
                        onClick={toggleChatWindow}
                        icon={MessageCircle}
                        label={"Chat"}
                    />

                    <UiOnlineButton onClick={toggleMembersUi} />
                </div>
            </div>

            <MobileWorldControls
                isMuted={isMuted}
                onToggleMic={toggleMic}
                isVideoOff={isVideoOff}
                onToggleVideo={handleShareVideoCam}
                onOpenChat={toggleChatWindow}
                onOpenMembers={toggleMembersUi}
            />

            <CalendarMenu
                isOpen={isCalendarUiOpen}
                onClose={toggleCalendarMenu}
            />

            <DeskChatDrawer isOpen={isChatWindowOpen} onClose={toggleChatWindow} />

            <MembersUi
                isMembersUiOpen={isMembersUiOpen}
                onClose={toggleMembersUi}
            />

            <SoccerStatsModal
                isOpen={isSoccerStatsModalOpen}
                onClose={closeSoccerStatsModal}
            />

            <SoccerGameControlModal
                isOpen={isSoccerGameControlModalOpen}
                onClose={closeSoccerGameControlModal}
            />

            <MatchHistoryModal
                isOpen={isMatchHistoryModalOpen}
                onClose={closeMatchHistoryModal}
            />
        </>
    );
}

export default UiControls;
