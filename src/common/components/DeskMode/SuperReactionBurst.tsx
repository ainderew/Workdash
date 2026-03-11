import React, {
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import Lottie from "lottie-react";
import type { SuperReactionPosition } from "@/common/config/superReactionAnimations";

export type SuperReactionBurstHandle = {
    replay: () => void;
};

const POSITION_STYLES: Record<SuperReactionPosition, React.CSSProperties> = {
    top: { left: "50%", top: "50%" },
    left: { left: 0, top: "50%" },
    center: { left: "50%", top: "50%" },
    right: { right: 0, top: "50%" },
    "bottom-right": { right: 0, bottom: 0 },
    "bottom-left": { left: 0, bottom: 0 },
};

const POSITION_TRANSLATE: Record<
    SuperReactionPosition,
    { x: string; y: string }
> = {
    top: { x: "-50%", y: "-100%" },
    left: { x: "-25%", y: "-50%" },
    center: { x: "-50%", y: "-50%" },
    right: { x: "25%", y: "-50%" },
    "bottom-right": { x: "25%", y: "50%" },
    "bottom-left": { x: "-25%", y: "50%" },
};

const FADE_MS = 200;

type SuperReactionBurstProps = {
    animationData: object | null;
    position?: SuperReactionPosition;
};

/**
 * Renders a Lottie animation burst that auto-plays on mount with a fade-in,
 * fades out after completion, then fully unmounts the Lottie instance.
 * This prevents lottie-web from accumulating rAF-registered animations.
 */
const SuperReactionBurst = React.forwardRef<
    SuperReactionBurstHandle,
    SuperReactionBurstProps
>(function SuperReactionBurst({ animationData, position = "center" }, ref) {
    // "idle" = Lottie unmounted | "playing" = mounted + visible | "fading" = fading out before unmount
    const [phase, setPhase] = useState<"idle" | "playing" | "fading">(
        "playing",
    );
    const translate = POSITION_TRANSLATE[position];
    const mountKey = useRef(0);
    const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (fadeTimer.current) clearTimeout(fadeTimer.current);
        };
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            replay: () => {
                if (fadeTimer.current) {
                    clearTimeout(fadeTimer.current);
                    fadeTimer.current = null;
                }
                mountKey.current++;
                setPhase("playing");
            },
        }),
        [],
    );

    const handleComplete = useCallback(() => {
        setPhase("fading");
        fadeTimer.current = setTimeout(() => {
            setPhase("idle");
            fadeTimer.current = null;
        }, FADE_MS);
    }, []);

    if (!animationData) return null;

    const mounted = phase !== "idle";

    return (
        <div
            className="pointer-events-none absolute z-10"
            style={{
                width: 48,
                height: 48,
                ...POSITION_STYLES[position],
                transform: `translate(${translate.x}, ${translate.y}) scale(${phase === "fading" ? 0.4 : 1})`,
                opacity: phase === "fading" ? 0 : 1,
                transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
            }}
        >
            {mounted && (
                <Lottie
                    key={mountKey.current}
                    animationData={animationData}
                    loop={false}
                    autoplay
                    onComplete={handleComplete}
                    style={{ width: 48, height: 48 }}
                />
            )}
        </div>
    );
});

export default React.memo(SuperReactionBurst);
