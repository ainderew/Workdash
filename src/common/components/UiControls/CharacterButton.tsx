import React, { useMemo, useState } from "react";
import useUserStore from "@/common/store/useStore";
import { UserStore } from "@/common/store/_types";
import { useFocusToggle } from "@/common/hooks/useFocusToggle";
import { useSession } from "next-auth/react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { User, Pencil } from "lucide-react";
import { EditNameModal } from "./modal/EditName.modal";
import { getDisplayName } from "@/common/utils/displayName";

function CharacterButton() {
    const { data: session } = useSession();
    const user = useUserStore((state: UserStore) => state.user);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { isInFocusMode, toggleFocusMode } = useFocusToggle();
    const displayName = useMemo(
        () =>
            getDisplayName(
                {
                    nickname: user?.nickname,
                    name: user?.name || session?.user?.name,
                },
                "Guest",
            ),
        [session?.user?.name, user?.name, user?.nickname],
    );
    const fullName = user?.name || session?.user?.name || "Guest";

    const spriteSheetDataUrl = user?.spriteSheetDataUrl;
    const googleImage = user?.image || session?.user?.image;

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
            <div className="container wd-text-primary font-light bg-[var(--wd-surface-panel)] p-2 rounded-xl w-40 flex items-center gap-4 shadow-lg wd-border-subtle">
                <div className="online-dot-container relative shrink-0">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={toggleFocusMode}
                                className={`relative outline-none shrink-0 w-10 h-10 rounded-full border-2 border-solid bg-no-repeat overflow-hidden cursor-pointer transition-all duration-300 bg-[var(--wd-surface-elevated)] flex items-center justify-center
                ${
                    isInFocusMode
                        ? "border-[var(--wd-warning)] shadow-[0_0_10px_var(--wd-warning)/0.5]"
                        : "border-[var(--wd-success)] shadow-[0_0_10px_var(--wd-success)/0.5]"
                }`}
                                style={backgroundStyles}
                            >
                                {!backgroundStyles.backgroundImage && (
                                    <User className="w-4 h-4 wd-text-muted" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>
                                {isInFocusMode
                                    ? "Disable Focus Mode"
                                    : "Enable Focus Mode"}
                            </p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Status Indicator Dot */}
                    <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[var(--wd-surface-panel)] z-10 ${
                            isInFocusMode
                                ? "bg-[var(--wd-warning)]"
                                : "bg-[var(--wd-success)]"
                        }`}
                    />
                </div>

                <div className="flex flex-col overflow-hidden">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-left group flex items-center gap-1.5 focus:outline-none"
                        title="Click to edit name"
                    >
                        <span className="text-xs font-medium wd-text-primary truncate max-w-[80px] group-hover:text-[var(--wd-accent)] transition-colors">
                            {displayName}
                        </span>
                        <Pencil className="w-3 h-3 wd-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <span
                        className={`text-[10px] uppercase tracking-wider font-bold ${
                            isInFocusMode
                                ? "text-[var(--wd-warning)]"
                                : "text-[var(--wd-success)]"
                        }`}
                    >
                        {isInFocusMode
                            ? "BUSY"
                            : "ONLINE"}
                    </span>
                </div>
            </div>

            {/* Edit Name Modal */}
            <EditNameModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                currentName={fullName}
            />
        </>
    );
}

export default CharacterButton;
