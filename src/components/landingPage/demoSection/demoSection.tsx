import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { GUEST_PUBLIC_DISCOVERY } from "@/features/guest/discovery";
import styles from "./demoSection.module.css";

export function DemoSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const [inView, setInView] = useState(false);
    const [pageVisible, setPageVisible] = useState(true);
    const [paused, setPaused] = useState(false);
    const href = GUEST_PUBLIC_DISCOVERY ? "/try?from=demo" : "/app";
    const action = GUEST_PUBLIC_DISCOVERY ? "Try WorkDash free" : "Open WorkDash";
    const event = GUEST_PUBLIC_DISCOVERY ? "cta_guest_try" : "cta_open_room";
    const moving = inView && pageVisible && !paused;

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
        observer.observe(section);
        const onVisibility = () => setPageVisible(!document.hidden);
        onVisibility();
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    return (
        <section id="demo" ref={sectionRef} aria-labelledby="demo-heading" className={styles.section}>
            <div className={styles.window}>
                <div className={styles.chrome}>
                    <span className={styles.brand}>Work<span>Dash</span></span>
                    <span className={styles.address}>workdash.site{GUEST_PUBLIC_DISCOVERY ? "/try" : "/app"}</span>
                </div>
                <div className={styles.composition}>
                    <div className={styles.copy}>
                        <h2 id="demo-heading">Make yourself<br />at home.</h2>
                        <p>Pick a character, invite a friend,<br className={styles.desktopBreak} /> and talk as you explore.</p>
                        <div className={styles.action}>
                            <Link href={href} data-umami-event={event} data-umami-event-location="demo"
                                className={styles.tryButton}>
                                {action}<ArrowRight size={20} aria-hidden="true" />
                            </Link>
                            {GUEST_PUBLIC_DISCOVERY && <p>No account needed. Your room is free for 20 minutes.</p>}
                        </div>
                    </div>
                    <div className={styles.stage}>
                        <Link href={href} aria-label={`Explore the lounge: ${action}`} data-umami-event={event}
                            data-umami-event-location="demo" className={styles.previewLink}>
                            {/* Move the original image as one plane. Never synthesize sprite motion. */}
                            <div className={styles.camera} data-moving={moving}>
                                <Image src="/assets/try-room-poster.faeaf1dd.webp"
                                    alt="The real WorkDash lounge, with bookshelves, couches and a character beside the coffee table."
                                    fill sizes="(max-width: 760px) 100vw, (max-width: 1280px) 70vw, 896px"
                                    className={styles.room} />
                            </div>
                            <span className={styles.sceneShade} aria-hidden="true" />
                            <span className={styles.enterHint} aria-hidden="true">Explore the lounge <ArrowUpRight size={18} /></span>
                        </Link>
                        <button type="button" className={styles.playback} onClick={() => setPaused(value => !value)}
                            aria-label={paused ? "Play room preview" : "Pause room preview"}>
                            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
                        </button>
                    </div>
                </div>
                <div className={styles.footer}>
                    <span>Room preview · The lounge</span>
                    {GUEST_PUBLIC_DISCOVERY && <p>Like it here? <span>Sign in to save your character and room.</span></p>}
                </div>
            </div>
        </section>
    );
}
