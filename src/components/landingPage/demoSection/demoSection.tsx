import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GUEST_PUBLIC_DISCOVERY } from "@/features/guest/discovery";
import { TRIAL_PREVIEW } from "./content";
import styles from "./demoSection.module.css";

export function DemoSection() {
    const href = GUEST_PUBLIC_DISCOVERY ? "/try?from=demo" : "/app";
    const action = GUEST_PUBLIC_DISCOVERY ? "Enter a free room" : "Open WorkDash";
    const event = GUEST_PUBLIC_DISCOVERY ? "cta_guest_try" : "cta_open_room";

    return (
        <section id="demo" aria-labelledby="demo-heading" className={styles.section}>
            <div className={styles.window}>
                <div className={styles.composition}>
                    <div className={styles.copy}>
                        <h2 id="demo-heading">
                            {GUEST_PUBLIC_DISCOVERY ? <>Try WorkDash <span>free.</span></> : "Find your spot in WorkDash."}
                        </h2>
                        {GUEST_PUBLIC_DISCOVERY && <p className={styles.reassurance}>No sign-up needed.</p>}
                        <p className={styles.description}>
                            WorkDash is a browser-based 2D hangout with voice chat.
                            Pick a character, invite a friend and explore together.
                        </p>
                        <Link href={href} data-umami-event={event} data-umami-event-location="demo"
                            className={styles.tryButton}>
                            {action}<ArrowRight size={20} aria-hidden="true" />
                        </Link>
                        {GUEST_PUBLIC_DISCOVERY && (
                            <p className={styles.duration}>Your free room lasts 20 minutes.<br />It closes after three empty minutes.</p>
                        )}
                    </div>
                    <figure className={styles.scene}>
                        <Link href={href}
                            aria-label={GUEST_PUBLIC_DISCOVERY ? "Try WorkDash without signing up" : "Explore WorkDash"}
                            data-umami-event={event} data-umami-event-location="demo"
                            className={styles.previewLink}>
                            <Image src={TRIAL_PREVIEW.src} alt={TRIAL_PREVIEW.alt}
                                width={TRIAL_PREVIEW.width} height={TRIAL_PREVIEW.height}
                                sizes="(max-width: 920px) calc(100vw - 48px), (max-width: 1328px) 66vw, 850px"
                                className={styles.room} />
                        </Link>
                        <figcaption>{TRIAL_PREVIEW.caption}</figcaption>
                    </figure>
                </div>
                <div className={styles.footer}>
                    {GUEST_PUBLIC_DISCOVERY && (
                        <p>Sign in to keep your character. The host can also save the room.</p>
                    )}
                    <Link href="/hangout-with-friends">Explore places to hang out<ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
            </div>
        </section>
    );
}
