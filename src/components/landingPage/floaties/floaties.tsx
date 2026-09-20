import React from "react";
import Image from "next/image";
import {
    motion,
    MotionValue,
    useReducedMotion,
    useScroll,
    useTransform,
} from "framer-motion";

export interface Floatie {
    src: string;
    alt?: string;
    width: number;
    height: number;
    /** Percentage offsets within the parent section. */
    top: string;
    left?: string;
    right?: string;
    /**
     * How far it travels over one viewport of scroll, in pixels. Negative
     * drifts up and out of frame faster than the page; positive lags behind.
     */
    drift: number;
    rotate?: number;
    opacity?: number;
    /** Rendered width on screen; the file is 4x so it stays crisp. */
    display: number;
}

function One({ floatie }: { floatie: Floatie }) {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, (value) => (value / 800) * floatie.drift);

    return (
        <motion.div
            aria-hidden="true"
            style={{
                y,
                top: floatie.top,
                left: floatie.left,
                right: floatie.right,
                opacity: floatie.opacity ?? 1,
                rotate: floatie.rotate ?? 0,
            }}
            className="wd-floatie"
        >
            <Image
                src={floatie.src}
                alt=""
                width={floatie.width}
                height={floatie.height}
                style={{ width: floatie.display, height: "auto" }}
                className="wd-floatie-img"
            />
        </motion.div>
    );
}

/**
 * Decorative parallax layer. Sits behind a section's content and moves at a
 * rate the section does not, so objects drift out of frame as you scroll.
 *
 * Under prefers-reduced-motion the objects render in place and never move.
 */
interface FloatiesProps {
    items: Floatie[];
    /**
     * Optional shared opacity, so a layer can fade out on the same curve as
     * the content it decorates rather than hanging around after it has gone.
     */
    fade?: MotionValue<number>;
}

export function Floaties({ items, fade }: FloatiesProps) {
    const reduced = useReducedMotion();

    if (reduced) {
        return (
            <div className="wd-floatie-layer" aria-hidden="true">
                {items.map((floatie) => (
                    <div
                        key={floatie.src + floatie.top + (floatie.left ?? floatie.right)}
                        className="wd-floatie"
                        style={{
                            top: floatie.top,
                            left: floatie.left,
                            right: floatie.right,
                            opacity: floatie.opacity ?? 1,
                            rotate: `${floatie.rotate ?? 0}deg`,
                        }}
                    >
                        <Image
                            src={floatie.src}
                            alt=""
                            width={floatie.width}
                            height={floatie.height}
                            style={{ width: floatie.display, height: "auto" }}
                            className="wd-floatie-img"
                        />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            className="wd-floatie-layer"
            aria-hidden="true"
            style={fade ? { opacity: fade } : undefined}
        >
            {items.map((floatie) => (
                <One
                    key={floatie.src + floatie.top + (floatie.left ?? floatie.right)}
                    floatie={floatie}
                />
            ))}
        </motion.div>
    );
}

/** Shared sprite definitions so sections stay declarative. */
export const SPRITES = {
    plant: { src: "/assets/floaties/plant.png", width: 124, height: 248 },
    pizza: { src: "/assets/floaties/pizza.png", width: 88, height: 88 },
    coffee: { src: "/assets/floaties/coffee.png", width: 72, height: 120 },
    star: { src: "/assets/floaties/star.png", width: 64, height: 64 },
} as const;
