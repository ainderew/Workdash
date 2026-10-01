import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll } from "framer-motion";
import styles from "./walkIn.module.css";
import { WalkInStage } from "./WalkInStage";

/** Frames shown instead of the scrubbed film when motion is reduced. */
const STILLS = [0.12, 0.37, 0.535, 0.69, 0.84, 0.97];

/**
 * The features section: a 25 s film scrubbed by scroll while the stage stays
 * pinned. It uses native scroll (no wheel capture), so the scrollbar, keyboard
 * and the navbar's /#features link keep working.
 */
export function WalkIn() {
    const trackRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
    const prefersReduced = useReducedMotion();
    // Decide after mount so the server render and the first client render match.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const still = mounted && prefersReduced;

    return (
        <section id="features" aria-labelledby="walk-in-title" className={styles.section}>
            {still ? (
                <div className={styles.stills}>
                    {STILLS.map((p) => <WalkInStage key={p} still={p} />)}
                </div>
            ) : (
                <div ref={trackRef} className={styles.track}>
                    <div className={styles.sticky}>
                        <WalkInStage progress={scrollYProgress} />
                    </div>
                </div>
            )}
        </section>
    );
}
