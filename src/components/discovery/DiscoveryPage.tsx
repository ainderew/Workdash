import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Seo } from "@/common/components/Seo";
import { Navbar } from "@/components/navbar/navbar";
import { Footer } from "@/components/landingPage/footer/footer";

import { discoveryLinks } from "./links";

export function DiscoveryLinks({ current }: { current?: string }) {
    return (
        <nav
            aria-label="Explore WorkDash"
            className="mt-16 border-t border-[var(--wd-border-subtle)] pt-8"
        >
            <h2 className="text-xl font-bold mb-4">Find your room</h2>
            <ul className="flex flex-wrap gap-x-8 gap-y-4">
                {discoveryLinks
                    .filter((link) => link.href !== current)
                    .map((link) => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className="text-[var(--wd-text-primary)] underline underline-offset-4"
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
            </ul>
        </nav>
    );
}

export function RoomLink({ location }: { location: string }) {
    return (
        <Link
            href="/app"
            data-umami-event="cta_open_room"
            data-umami-event-location={location}
            className="wd-landing-btn-primary"
        >
            Open a free room
        </Link>
    );
}

export function RoomPreview() {
    return (
        <figure className="my-12">
            <Image
                src="/assets/lounge.webp"
                width={2000}
                height={1337}
                sizes="(max-width: 768px) 100vw, 848px"
                alt="WorkDash's pixel lounge, with couches, bookshelves, an avatar and voice controls."
                className="w-full h-auto rounded-xl border border-[var(--wd-border-subtle)]"
            />
            <figcaption className="mt-3 text-sm text-[var(--wd-text-muted)]">
                The WorkDash lounge. In world mode, walking into a room joins
                its conversation.{" "}
                <Link
                    href="/#features"
                    className="underline underline-offset-4"
                >
                    Watch the room walkthrough
                </Link>
                .
            </figcaption>
        </figure>
    );
}

export function DiscoveryPage({
    title,
    description,
    path,
    heading,
    intro,
    children,
    preview = false,
}: {
    title: string;
    description: string;
    path: string;
    heading: string;
    intro: string;
    children: React.ReactNode;
    preview?: boolean;
}) {
    return (
        <>
            <Seo title={title} description={description} path={path} />
            <div className="wd-discovery min-h-screen bg-[var(--wd-surface-base)] text-[var(--wd-text-primary)]">
                <Navbar />
                <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight text-balance max-w-3xl">
                        {heading}
                    </h1>
                    <p className="mt-6 mb-8 text-lg leading-relaxed text-[var(--wd-text-secondary)] max-w-2xl">
                        {intro}
                    </p>
                    <div className="flex flex-wrap gap-4 items-center">
                        <RoomLink location={path.slice(1) + "_top"} />
                        <Link
                            href="/#features"
                            className="wd-landing-btn-secondary"
                        >
                            See how the room works
                        </Link>
                    </div>
                    {preview && <RoomPreview />}
                    <div className="mt-12 space-y-12 text-[var(--wd-text-secondary)] leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[var(--wd-text-primary)] [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:max-w-[70ch] [&_a]:underline [&_a]:underline-offset-4 [&_a]:text-[var(--wd-text-primary)]">
                        {children}
                    </div>
                    <DiscoveryLinks current={path} />
                </main>
                <Footer />
            </div>
        </>
    );
}
