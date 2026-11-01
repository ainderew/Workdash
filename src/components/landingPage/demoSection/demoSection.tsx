import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, Gamepad2Icon, Pause, Play } from "lucide-react";
import { GUEST_PUBLIC_DISCOVERY } from "@/features/guest/discovery";
import { Floaties, SPRITES } from "../floaties/floaties";
import styles from "./demoSection.module.css";

const PREVIEW_VIDEO = "/assets/try-room-preview.e84e44d7.mp4";

export function DemoSection() {
    const stageRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const reducedMotion = useReducedMotion();
    const [inView, setInView] = useState(false);
    const [userPaused, setUserPaused] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const href = GUEST_PUBLIC_DISCOVERY ? "/try?from=demo" : "/app";
    const action = GUEST_PUBLIC_DISCOVERY ? "Try WorkDash free" : "Open WorkDash";
    const event = GUEST_PUBLIC_DISCOVERY ? "cta_guest_try" : "cta_open_room";

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
        observer.observe(stage);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const syncPlayback = () => {
            if (!inView || reducedMotion !== false || userPaused || failed || document.hidden) {
                video.pause();
                return;
            }
            // Load only when the preview is visible and motion is allowed.
            if (!video.getAttribute("src")) video.src = PREVIEW_VIDEO;
            void video.play().catch(() => { /* The still and play control remain usable. */ });
        };
        syncPlayback();
        document.addEventListener("visibilitychange", syncPlayback);
        return () => {
            document.removeEventListener("visibilitychange", syncPlayback);
            video.pause();
        };
    }, [inView, reducedMotion, userPaused, failed]);

    function togglePlayback() {
        const video = videoRef.current;
        if (!video) return;
        if (playing) {
            setUserPaused(true);
            video.pause();
        } else {
            setUserPaused(false);
            void video.play().catch(() => {});
        }
    }

    return (
        <section id="demo" aria-labelledby="demo-heading" className={styles.section}>
            <Floaties items={[
                { ...SPRITES.star, top: "8%", left: "5%", drift: -120, display: 32, opacity: 0.85 },
                { ...SPRITES.plant, top: "58%", right: "3%", drift: -70, display: 62, rotate: 8 },
            ]} />
            <div className={styles.container}>
                <div className={styles.window}>
                    <div className={styles.chrome}>
                        <div className={styles.dots} aria-hidden="true"><i /><i /><i /></div>
                        <span className={styles.address}>workdash.site{GUEST_PUBLIC_DISCOVERY ? "/try" : "/app"}</span>
                        <span className={styles.previewLabel}>Animated room preview</span>
                    </div>
                    <div className={styles.stage} ref={stageRef}>
                        <Link href={href} aria-label={`Step inside: ${action}`} data-umami-event={event}
                            data-umami-event-location="demo" className={styles.previewLink}>
                            <Image src="/assets/try-room-poster.faeaf1dd.webp" alt="WorkDash’s pixel-art lounge, with couches, bookshelves and a character by the coffee table."
                                fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1152px"
                                className={styles.poster} />
                            <video ref={videoRef} muted loop playsInline preload="none" aria-hidden="true"
                                className={styles.video} data-ready={ready && !failed && !reducedMotion}
                                onPlaying={() => { setPlaying(true); setReady(true); }}
                                onPause={() => setPlaying(false)} onError={() => setFailed(true)} />
                            <span className={styles.enterHint} aria-hidden="true">
                                <Gamepad2Icon size={18} /> {GUEST_PUBLIC_DISCOVERY ? "Step inside" : "Open the room"}
                                <ArrowUpRight size={18} />
                            </span>
                        </Link>
                        {!failed && (
                            <button type="button" className={styles.playback} onClick={togglePlayback}
                                aria-label={playing ? "Pause room preview" : "Play room preview"}>
                                {playing ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                        )}
                    </div>
                    <div className={styles.invitation}>
                        <div className={styles.copy}>
                            <h2 id="demo-heading">Make yourself at home.</h2>
                            <p>Pick a character, invite a friend, and talk as you explore.</p>
                            {GUEST_PUBLIC_DISCOVERY && <p className={styles.saveNote}>Like it here? Sign in to save your character and room.</p>}
                        </div>
                        <div className={styles.action}>
                            <Link href={href} data-umami-event={event} data-umami-event-location="demo"
                                className={styles.tryButton}>
                                <Gamepad2Icon size={21} aria-hidden="true" /> {action}
                                <ArrowUpRight size={21} aria-hidden="true" />
                            </Link>
                            {GUEST_PUBLIC_DISCOVERY && <p>No account needed · 20-minute room</p>}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
