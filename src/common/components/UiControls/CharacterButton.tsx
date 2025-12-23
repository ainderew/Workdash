import React, { useState, useEffect } from "react";
import useUserStore from "@/common/store/useStore";
import { UserStore } from "@/common/store/_types";
import { AudioChat } from "@/communication/audioChat/audioChat";
import { AvailabilityStatus } from "@/game/player/_enums";
import { useSession } from "next-auth/react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { User, Pencil } from "lucide-react"; // Added Pencil icon
import { EditNameModal } from "./modal/EditName.modal"; // Adjust path as needed

function CharacterButton() {
    const { data: session } = useSession();
    const user = useUserStore((state: UserStore) => state.user);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [displayName, setDisplayName] = useState(
        user?.name || session?.user?.name || "Guest",
    );
    const [focusState, setFocusState] = useState<AvailabilityStatus>(
        AvailabilityStatus.ONLINE,
    );

    useEffect(() => {
        if (!user?.name) return;
        setDisplayName(user.name);
    }, [user?.name]);

    const spriteSheetDataUrl = user?.spriteSheetDataUrl;
    const googleImage = user?.image || session?.user?.image;

    const audioChatService = AudioChat.getInstance();

    function toggleFocusMode() {
        if (focusState === AvailabilityStatus.ONLINE) {
            audioChatService.enableFocusMode();
            audioChatService.emitFocusModeChange();
            setFocusState(AvailabilityStatus.FOCUS);
        } else {
            audioChatService.disableFocusMode();
            audioChatService.emitFocusModeChange();
            setFocusState(AvailabilityStatus.ONLINE);
        }
    }

    let backgroundStyles: React.CSSProperties = {};
    if (spriteSheetDataUrl) {
        backgroundStyles = {
            backgroundImage: `url('${spriteSheetDataUrl}')`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "-94px -20px",
            imageRendering: "pixelated",
        };
    } else if (googleImage) {
        backgroundStyles = {
            backgroundImage: `url('${googleImage}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
        };
    } else {
        backgroundStyles = {
            backgroundImage:
                "url('/assets/characters/Characters/Adam/Adam_idle_16x16.png')",
            backgroundSize: "auto 200%",
            backgroundPosition: "-607px -16px",
            imageRendering: "pixelated",
        };
    }

    return (
        <>
            <div className="container text-white font-light bg-neutral-800 p-2 rounded-xl w-40 flex items-center gap-4 shadow-lg border border-white/5">
                <div className="online-dot-container relative shrink-0">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={toggleFocusMode}
                                className={`relative outline-none shrink-0 w-10 h-10 rounded-full border-2 border-solid bg-no-repeat overflow-hidden cursor-pointer transition-all duration-300 bg-neutral-700 flex items-center justify-center
                ${
                    focusState === AvailabilityStatus.FOCUS
                        ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        : "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                }`}
                                style={backgroundStyles}
                            >
                                {!backgroundStyles.backgroundImage && (
                                    <User className="w-4 h-4 text-neutral-400" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>
                                {focusState === AvailabilityStatus.FOCUS
                                    ? "Disable Focus Mode"
                                    : "Enable Focus Mode"}
                            </p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Status Indicator Dot */}
                    <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-neutral-800 z-10 ${
                            focusState === AvailabilityStatus.FOCUS
                                ? "bg-amber-500"
                                : "bg-green-500"
                        }`}
                    />
                </div>

                <div className="flex flex-col overflow-hidden">
                    {/* Make name interactive 
             Added 'group' to container and hover effects on text 
          */}
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-left group flex items-center gap-1.5 focus:outline-none"
                        title="Click to edit name"
                    >
                        <span className="text-xs font-medium text-slate-200 truncate max-w-[80px] group-hover:text-amber-400 transition-colors">
                            {displayName}
                        </span>
                        <Pencil className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <span
                        className={`text-[10px] uppercase tracking-wider font-bold ${
                            focusState === AvailabilityStatus.FOCUS
                                ? "text-amber-500"
                                : "text-green-500"
                        }`}
                    >
                        {focusState === AvailabilityStatus.FOCUS
                            ? "BUSY"
                            : "ONLINE"}
                    </span>
                </div>
            </div>

            {/* Render the Modal */}
            <EditNameModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                currentName={displayName}
            />
        </>
    );
}

export default CharacterButton;
