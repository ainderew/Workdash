import React, { useEffect, useId } from "react";
import { isMac } from "@/common/keyboard";
import OnboardingTip from "./OnboardingTip";
import { TIP_ORDER, TIP_TARGET } from "./constants";
import { getTipContent } from "./tipContent";
import { useTipAnchor } from "./useTipAnchor";
import { useTipSequence } from "./useTipSequence";

const prefersTouch = () =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

/**
 * First-run tips that light the real controls: open chat in the world, switch
 * to desk mode, and switch back. Each shows once per browser. Mount once.
 */
export default function OnboardingTips() {
    const { activeTip, dismiss } = useTipSequence();
    const titleId = useId();
    const bodyId = useId();
    const anchor = useTipAnchor(activeTip ? TIP_TARGET[activeTip] : null, bodyId);

    useEffect(() => {
        if (!activeTip) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [activeTip, dismiss]);

    const content =
        activeTip && anchor
            ? getTipContent(activeTip, { touch: prefersTouch(), mac: isMac })
            : null;

    return (
        <>
            {/* Announces the tip without moving focus away from the world */}
            <p className="sr-only" aria-live="polite">
                {content ? `Tip: ${content.title}. ${content.body}` : ""}
            </p>
            {/* Rendered in place, not portaled: the app font lives on a wrapper
                inside <body>, and nothing above #app breaks position: fixed */}
            {activeTip && anchor && content && (
                <OnboardingTip
                    key={activeTip}
                    anchor={anchor}
                    content={content}
                    step={TIP_ORDER.indexOf(activeTip) + 1}
                    total={TIP_ORDER.length}
                    ids={{ title: titleId, body: bodyId }}
                    overWorld={activeTip !== "world"}
                    onDismiss={dismiss}
                />
            )}
        </>
    );
}
