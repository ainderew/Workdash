import React from "react";
import Image from "next/image";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDesktopApp } from "./useDesktopApp";

function DesktopAppButton() {
    const { isAvailable, downloadUrl } = useDesktopApp();

    const handleClick = () => {
        if (isAvailable && downloadUrl) {
            window.open(downloadUrl, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={handleClick}
                    className="group relative w-11 h-11 rounded-xl wd-bg-elevated transition-all duration-200 hover:bg-[var(--wd-accent-soft-solid)] cursor-pointer"
                    aria-label="Download Desktop App (Coming Soon)"
                >
                    <span className="inline-flex h-full w-full items-center justify-center overflow-hidden rounded-lg">
                        <Image
                            src="/assets/workdash-logo.svg"
                            alt="WorkDash"
                            width={24}
                            height={24}
                            className="opacity-100"
                        />
                    </span>
                </button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
                <span>
                    {isAvailable
                        ? "Download Desktop App"
                        : "Desktop App — Coming Soon"}
                </span>
            </TooltipContent>
        </Tooltip>
    );
}

export default DesktopAppButton;
