import { useCallback, useEffect, useState } from "react";

type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState =
    | "installable"
    | "installed"
    | "ios-manual"
    | "unsupported";

const isIos = (): boolean => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const iPad = /iPad/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return /iPhone|iPod/.test(ua) || iPad;
};

const isStandalone = (): boolean => {
    if (typeof window === "undefined") return false;
    const mq = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone =
        "standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return mq || iosStandalone;
};

export function useInstallApp() {
    const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
    const [state, setState] = useState<InstallState>("unsupported");

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (isStandalone()) {
            setState("installed");
            return;
        }

        if (isIos()) {
            setState("ios-manual");
            return;
        }

        const onBeforeInstall = (event: Event) => {
            event.preventDefault();
            setPrompt(event as InstallPromptEvent);
            setState("installable");
        };

        const onInstalled = () => {
            setPrompt(null);
            setState("installed");
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstall);
        window.addEventListener("appinstalled", onInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    const install = useCallback(async () => {
        if (!prompt) return;
        await prompt.prompt();
        const result = await prompt.userChoice;
        if (result.outcome === "accepted") {
            setPrompt(null);
            setState("installed");
        }
    }, [prompt]);

    return { state, install } as const;
}
