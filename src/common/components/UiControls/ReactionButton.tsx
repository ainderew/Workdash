import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SmilePlus } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import useReaction from "./hooks/useReaction";

function ReactionButton() {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    function expnadEmojiContainer() {
        setIsExpanded((prev) => !prev);
    }

    const { handleReact, toggleRaiseHand, isRaisingHand } = useReaction();

    return (
        <div
            className={`relative flex cursor-pointer dark wd-bg-elevated h-9 wd-text-primary gap-4 rounded-md transition-all duration-200
                        ${isExpanded ? "overflow-auto w-105" : "overflow-hidden w-9"}`}
        >
            <div
                onClick={expnadEmojiContainer}
                className={`w-9 h-9 flex items-center absolute justify-center hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)] z-20`}
            >
                <SmilePlus size={18} />
            </div>

            {isExpanded && <Separator orientation="vertical" />}

            <div
                className={`expanded-emoji-container flex gap-2 transition-all duration-200 
                ${isExpanded ? "translate-x-9" : "-translate-x-190 absolute -z-10"}
                `}
            >
                <Button
                    onClick={() => handleReact("👍")}
                    className="text-lg wd-bg-elevated hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)] h-9"
                    variant="default"
                >
                    👍
                </Button>
                <Button
                    onClick={() => handleReact("😂")}
                    className="text-lg wd-bg-elevated hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)] h-9"
                    variant="default"
                >
                    😂
                </Button>
                <Button
                    onClick={() => handleReact("❤️")}
                    className="text-lg wd-bg-elevated hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)] h-9"
                    variant="default"
                >
                    ❤️
                </Button>
                <Button
                    onClick={() => handleReact("🔥")}
                    className="text-lg wd-bg-elevated hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)] h-9"
                    variant="default"
                >
                    🔥
                </Button>
                <Button
                    onClick={() => handleReact("🥷")}
                    className="text-xl wd-bg-elevated hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)] h-9"
                    variant="default"
                >
                    🥷
                </Button>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={() => toggleRaiseHand()}
                            className="text-lg wd-bg-elevated hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)] h-9"
                            variant="default"
                        >
                            🤚
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isRaisingHand ? "Put down hand" : "Raise hand"}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
export default ReactionButton;
