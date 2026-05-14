import React from "react";
import Image from "next/image";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInstallApp } from "./useInstallApp";

const TOOLTIPS = {
    installable: "Install WorkDash",
    installed: "WorkDash is installed",
    "ios-manual": "Install: Share → Add to Home Screen",
    unsupported: "Install via browser menu",
} as const;

function DesktopAppButton() {
    const { state, install } = useInstallApp();

    if (state === "installed") return null;

    const handleClick = () => {
        if (state === "installable") {
            void install();
        }
    };

    const isInteractive = state === "installable";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={!isInteractive}
                    className="group relative w-11 h-11 rounded-xl wd-bg-elevated transition-all duration-200 hover:bg-[var(--wd-accent-soft-solid)] cursor-pointer disabled:cursor-default disabled:opacity-60"
                    aria-label={TOOLTIPS[state]}
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
                <span>{TOOLTIPS[state]}</span>
            </TooltipContent>
        </Tooltip>
    );
}

export default DesktopAppButton;
