import { useEffect, useState } from "react";
import type { TipAnchor } from "./_types";

/** Several copies of a control exist (dock and phone bar); light the one on screen. */
function findVisibleTarget(target: string): HTMLElement | null {
    const candidates = document.querySelectorAll<HTMLElement>(
        `[data-onboarding-target="${target}"]`,
    );
    for (const element of candidates) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return element;
    }
    return null;
}

function measure(element: HTMLElement): TipAnchor {
    const rect = element.getBoundingClientRect();
    return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        radius: parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
    };
}

function sameAnchor(a: TipAnchor | null, b: TipAnchor | null): boolean {
    if (!a || !b) return a === b;
    return (Object.keys(a) as (keyof TipAnchor)[]).every(
        (key) => Math.abs(a[key] - b[key]) < 0.5,
    );
}

/**
 * Finds the control a tip points at, marks it lit (`data-onboarding-lit`, and
 * described by the tip's body), and follows it as the layout moves. Returns
 * null while the control is off screen or a modal dialog is up.
 */
export function useTipAnchor(
    target: string | null,
    describedById: string,
): TipAnchor | null {
    const [anchor, setAnchor] = useState<TipAnchor | null>(null);

    useEffect(() => {
        if (!target) return;
        let frame = 0;
        let lit: HTMLElement | null = null;
        let previousDescribedBy: string | null = null;
        let last: TipAnchor | null = null;

        const release = () => {
            if (!lit) return;
            lit.removeAttribute("data-onboarding-lit");
            if (previousDescribedBy === null) {
                lit.removeAttribute("aria-describedby");
            } else {
                lit.setAttribute("aria-describedby", previousDescribedBy);
            }
            lit = null;
        };

        const light = (element: HTMLElement) => {
            previousDescribedBy = element.getAttribute("aria-describedby");
            element.setAttribute("data-onboarding-lit", "");
            element.setAttribute(
                "aria-describedby",
                previousDescribedBy
                    ? `${previousDescribedBy} ${describedById}`
                    : describedById,
            );
            lit = element;
        };

        const tick = () => {
            frame = requestAnimationFrame(tick);
            const modalOpen = document.querySelector('[aria-modal="true"]');
            const element = modalOpen ? null : findVisibleTarget(target);
            if (element !== lit) {
                release();
                if (element) light(element);
            }
            const next = element ? measure(element) : null;
            if (!sameAnchor(last, next)) {
                last = next;
                setAnchor(next);
            }
        };
        frame = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frame);
            release();
            setAnchor(null);
        };
    }, [target, describedById]);

    return target ? anchor : null;
}
