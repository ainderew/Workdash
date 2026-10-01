import React, { type CSSProperties } from "react";
import { placeTip } from "./placeTip";
import type { TipContent } from "./tipContent";
import type { TipAnchor } from "./_types";

interface OnboardingTipProps {
    anchor: TipAnchor;
    content: TipContent;
    step: number;
    total: number;
    ids: { title: string; body: string };
    /** Shown over the live world, where touches must still reach the map. */
    overWorld: boolean;
    onDismiss: () => void;
}

/**
 * The lamp on the real control and the card that hangs off it, lit from the
 * caret's side. Never takes focus, so the world keeps its keyboard.
 */
export default function OnboardingTip({
    anchor,
    content,
    step,
    total,
    ids,
    overWorld,
    onDismiss,
}: OnboardingTipProps) {
    const place = placeTip(anchor);
    const haloSize = Math.max(150, Math.max(anchor.width, anchor.height) * 2.8);
    const haloStyle = {
        left: anchor.left + anchor.width / 2,
        top: anchor.top + anchor.height / 2,
        width: haloSize,
        height: haloSize,
        "--wd-tip-core": `${(Math.min(anchor.width, anchor.height) / haloSize) * 100}%`,
    } as CSSProperties;
    const sparkStyle: CSSProperties = {
        left: anchor.left - 4,
        top: anchor.top - 4,
        width: anchor.width + 8,
        height: anchor.height + 8,
        borderRadius: anchor.radius + 4,
    };
    const cardStyle = {
        left: place.left,
        width: place.width,
        [place.side === "above" ? "bottom" : "top"]: place.offset,
        "--wd-tip-caret-x": `${place.caretX}px`,
        "--wd-tip-lx": `${(place.caretX / place.width) * 100}%`,
    } as CSSProperties;

    return (
        <>
            <span className="wd-tip-halo" style={haloStyle} aria-hidden="true" />
            <span className="wd-tip-spark" style={sparkStyle} aria-hidden="true" />
            <section
                role="dialog"
                aria-modal="false"
                aria-labelledby={ids.title}
                aria-describedby={ids.body}
                className="wd-tip"
                data-placement={place.side}
                data-square-corner={place.squareCorner ?? undefined}
                data-over-world={overWorld ? "" : undefined}
                style={cardStyle}
            >
                <h2 id={ids.title} className="wd-tip__title">
                    {content.title}
                </h2>
                <p id={ids.body} className="wd-tip__body">
                    {content.body}
                </p>
                {content.hint && <p className="wd-tip__hint">{content.hint}</p>}
                <div className="wd-tip__foot">
                    <div className="wd-tip__steps">
                        {Array.from({ length: total }, (_, i) => (
                            <span
                                key={i}
                                className="wd-tip__pip"
                                data-current={i + 1 === step ? "" : undefined}
                                aria-hidden="true"
                            />
                        ))}
                        <span className="wd-tip__count">
                            {step} of {total}
                        </span>
                    </div>
                    <button type="button" className="wd-tip__dismiss" onClick={onDismiss}>
                        Got it
                    </button>
                </div>
                <span className="wd-tip__caret" aria-hidden="true" />
            </section>
        </>
    );
}
