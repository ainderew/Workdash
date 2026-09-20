import React from "react";
import { Navbar } from "@/components/navbar/navbar";
import { Footer } from "@/components/landingPage/footer/footer";
import { Seo } from "@/common/components/Seo";
import { CHANGELOG } from "@/common/config/changelog";

const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });

export default function ChangelogPage() {
    return (
        <>
            <Seo
                title="Changelog — WorkDash"
                description="What changed in WorkDash and when. Every release that a person would actually notice, newest first."
                path="/changelog"
            />
            <div className="w-full min-h-screen bg-[var(--wd-surface-base)] text-[var(--wd-text-primary)]">
                <Navbar />

                <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        Change
                        <span className="text-[var(--wd-landing-accent)]">log</span>
                    </h1>
                    <p className="text-lg text-[var(--wd-text-muted)] mb-16 max-w-xl leading-relaxed">
                        Everything worth noticing, newest first. WorkDash is in
                        early access and built by a small group, so this moves in
                        bursts rather than on a schedule.
                    </p>

                    <ol className="space-y-14">
                        {CHANGELOG.map((entry) => (
                            <li key={entry.date} className="relative">
                                <time
                                    dateTime={entry.date}
                                    className="text-sm font-bold uppercase tracking-wider text-[var(--wd-landing-accent)]"
                                >
                                    {formatDate(entry.date)}
                                </time>
                                <h2 className="text-2xl font-bold mt-2 mb-4">
                                    {entry.title}
                                </h2>
                                <ul className="space-y-3">
                                    {entry.items.map((item) => (
                                        <li
                                            key={item}
                                            className="flex gap-3 text-[var(--wd-text-secondary)] leading-relaxed"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wd-landing-accent)]"
                                            />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ol>
                </main>

                <Footer />
            </div>
        </>
    );
}
