import React from "react";
import Link from "next/link";

/**
 * A note from the person building it. Everything here has to stay true: no
 * invented quotes, user counts or logos. Swap in real quotes from groups
 * (with their permission) once there are some.
 */
export function Origin() {
    return (
        <section aria-labelledby="origin-title" className="pb-24 bg-[var(--wd-surface-base)]">
            <figure className="max-w-2xl mx-auto px-6">
                <div className="rounded-2xl border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)] p-8 md:p-10">
                    <h2
                        id="origin-title"
                        className="text-sm font-bold uppercase tracking-wider text-[var(--wd-landing-accent)]"
                    >
                        Built for our Dota nights
                    </h2>
                    <blockquote className="mt-4 space-y-4 text-lg text-[var(--wd-text-secondary)] leading-relaxed">
                        <p>
                            WorkDash started with one group: a few of us who used
                            to work together and still keep a call open most
                            nights while we play Dota. We wanted a room we could
                            leave open, where you can see who&rsquo;s around and
                            just walk over.
                        </p>
                        <p>
                            That&rsquo;s what this is. It&rsquo;s early, and
                            I&rsquo;m building it on my own, so tell me what
                            breaks.
                        </p>
                    </blockquote>
                    <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <Link href="/about" className="font-bold text-[var(--wd-text-primary)] underline underline-offset-4">
                            Andrew Pinon, building WorkDash
                        </Link>
                        <Link
                            href="/changelog"
                            className="text-[var(--wd-text-muted)] underline underline-offset-4 hover:text-[var(--wd-landing-accent)] transition-colors"
                        >
                            What changed lately
                        </Link>
                    </figcaption>
                </div>
            </figure>
        </section>
    );
}
