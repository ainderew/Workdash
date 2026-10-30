import React from "react";
import Head from "next/head";
import Link from "next/link";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
import { SITE_NAME, SITE_URL } from "@/common/config/site";

const about = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "AboutPage",
            "@id": `${SITE_URL}/about#page`,
            url: `${SITE_URL}/about`,
            name: "About WorkDash",
            description:
                "WorkDash is a browser hangout for small groups, with a shared 2D world, room-based voice, text channels, video and screen sharing.",
            about: { "@id": `${SITE_URL}/#app` },
        },
        {
            "@type": "Person",
            "@id": `${SITE_URL}/about#andrew`,
            name: "Andrew Pinon",
            url: "https://github.com/ainderew",
        },
        {
            "@type": "WebApplication",
            "@id": `${SITE_URL}/#app`,
            name: SITE_NAME,
            url: SITE_URL,
            applicationCategory: "CommunicationApplication",
            creator: { "@id": `${SITE_URL}/about#andrew` },
        },
    ],
};

export default function AboutPage() {
    return (
        <>
            <Head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(about).replace(/</g, "\\u003c"),
                    }}
                />
            </Head>
            <DiscoveryPage
                path="/about"
                title="About WorkDash | A Shared Place for Your Group"
                description="WorkDash is a browser hangout for small groups. Explore a shared 2D world, talk by room, and stay connected through channels, video and screen sharing."
                heading="A place to spend time together"
                intro="WorkDash gives your group a shared place to hang out online. Meet before a game, work alongside each other, or catch up at the end of the day. Open it in your browser and come back to the same workspace whenever you want."
                preview
            >
                <section>
                    <h2>For the time you spend together</h2>
                    <p>
                        WorkDash is built for small groups who already know
                        each other. A shared world gives you somewhere to meet,
                        while channels and threads keep conversations around
                        for the next time you drop in.
                    </p>
                    <p className="mt-4">
                        Use it alongside the games and chat apps your group
                        already enjoys. There is no need to move everything
                        into a new tool just to spend an evening together.
                    </p>
                </section>
                <section>
                    <h2>A room for the people you already know</h2>
                    <p>
                        WorkDash combines a walkable 2D world with text
                        channels, video and screen sharing. In world mode,
                        entering a room joins its voice conversation. Everyone
                        in that room hears each other. Audio does not fade with
                        distance inside it.
                    </p>
                    <p className="mt-4">
                        Desk mode lets you use channels and threads without
                        moving an avatar. Read{" "}
                        <Link href="/hangout-with-friends">
                            how a group can spend an evening together
                        </Link>
                        .
                    </p>
                </section>
                <section>
                    <h2>What is ready, and what is still early</h2>
                    <p>
                        WorkDash is free to use today, with no payment card
                        required. It is intended for groups of about twenty, not
                        large events. There is one shared world layout and no
                        map editor. A laptop is currently the smoother
                        experience, though phones can join through a browser.
                    </p>
                    <p className="mt-4">
                        Check{" "}
                        <Link href="/pricing">
                            pricing and possible future plans
                        </Link>{" "}
                        for the current position. For setup questions and
                        microphone troubleshooting, use{" "}
                        <Link href="/help">the help page</Link>.
                    </p>
                </section>
                <section>
                    <h2>Tell us what breaks</h2>
                    <p>
                        Send product questions or corrections to{" "}
                        <a href="mailto:workdash@gmail.com">
                            workdash@gmail.com
                        </a>
                        . For a bug, include your browser, device and what you
                        were doing. Keep passwords, private messages and invite
                        links out of your report.
                    </p>
                    <p className="mt-4">
                        The <Link href="/privacy">privacy policy</Link> explains
                        data handling and deletion requests. The{" "}
                        <Link href="/terms">terms</Link> cover use of the
                        service.
                    </p>
                </section>
                <p className="text-sm text-[var(--wd-text-muted)]">
                    WorkDash is an independent project created by{" "}
                    <a href="https://github.com/ainderew">Andrew Pinon</a>.
                    It started with friends keeping a call open on Dota nights.
                    Follow its progress in the <Link href="/changelog">changelog</Link>.
                </p>
            </DiscoveryPage>
        </>
    );
}
