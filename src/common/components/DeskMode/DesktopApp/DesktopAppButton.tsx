import React from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInstallApp } from "./useInstallApp";

const detectBrowserHint = (): string => {
    if (typeof navigator === "undefined") return "your browser's menu";
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return "the ··· menu → Apps → Install this site as an app";
    if (/Chrome\//.test(ua)) return "the ⋮ menu → Cast, save, and share → Install WorkDash";
    if (/Firefox\//.test(ua)) return "Firefox doesn't yet support installing this site as an app";
    if (/Safari\//.test(ua)) return "File → Add to Dock (macOS Safari 16.4+) or Share → Add to Home Screen (iOS)";
    return "your browser's menu";
};

const TOOLTIPS = {
    installable: "Install WorkDash",
    installed: "WorkDash is installed",
    "ios-manual": "Install: Share → Add to Home Screen",
    unsupported: "How to install WorkDash",
} as const;

function DesktopAppButton() {
    const { state, install } = useInstallApp();

    if (state === "installed") return null;

    const handleClick = () => {
        if (state === "installable") {
            void install();
            return;
        }

        if (state === "ios-manual") {
            toast.info("Install WorkDash on iOS", {
                description: "Tap the Share button, then 'Add to Home Screen'.",
                duration: 8000,
            });
            return;
        }

        toast.info("Install WorkDash", {
            description: `If your browser supports installable apps, look for ${detectBrowserHint()}. If you've already installed it, open it from your dock or app launcher.`,
            duration: 10000,
        });
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={handleClick}
                    className="group relative w-11 h-11 rounded-xl wd-bg-elevated transition-all duration-200 hover:bg-[var(--wd-accent-soft-solid)] cursor-pointer"
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
