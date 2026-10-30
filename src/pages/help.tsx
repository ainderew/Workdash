import React from "react";
import Link from "next/link";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
import { FAQ_ITEMS } from "@/components/landingPage/faqSection/faq";

export default function HelpPage() {
    return (
        <DiscoveryPage
            path="/help"
            title="WorkDash Help: Rooms, Voice Chat and Getting Started"
            description="How to start a WorkDash room, invite friends and fix microphone problems. Answers about free access, accounts, room-based voice, mobile and privacy."
            heading="Get your group into the room"
            intro="Create a workspace, share its invite link, and meet in the same room. Everyone signs in with Google or an email link. WorkDash runs in your browser."
        >
            <section>
                <h2>How room-based voice works</h2>
                <p>
                    In world mode, entering a room joins its voice conversation.
                    You hear the people in that room. Leaving it changes who you
                    hear. WorkDash does not fade audio by distance within a
                    room.
                </p>
            </section>
            <section>
                <h2>If you cannot hear each other</h2>
                <ol className="list-decimal pl-6 space-y-3 max-w-2xl">
                    <li>
                        Check that both avatars are in the same room and that
                        neither microphone is muted.
                    </li>
                    <li>
                        Allow microphone access in your browser&apos;s site
                        permissions. Check your operating system&apos;s
                        microphone permissions too.
                    </li>
                    <li>
                        Confirm your selected microphone and speakers,
                        especially after connecting headphones.
                    </li>
                    <li>
                        Reload and rejoin if permissions changed. Use headphones
                        to avoid speaker echo.
                    </li>
                </ol>
                <p className="mt-4">
                    WorkDash is still in early access. If the issue continues,
                    email{" "}
                    <a href="mailto:workdash@gmail.com">workdash@gmail.com</a>{" "}
                    with your browser, device, and the steps that caused it. Do
                    not include passwords or invite links.
                </p>
            </section>
            <section>
                <h2>Common questions</h2>
                <dl className="space-y-7">
                    {FAQ_ITEMS.map((item) => (
                        <div key={item.q}>
                            <dt className="font-semibold text-[var(--wd-text-primary)] mb-2">
                                {item.q}
                            </dt>
                            <dd className="max-w-[70ch]">{item.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>
            <section>
                <h2>Accounts and privacy</h2>
                <p>
                    Friends need an account to join a workspace. A room boundary
                    controls the conversation in the app; it is not a claim of
                    end-to-end encryption. Read the{" "}
                    <Link href="/privacy">privacy policy</Link> for data
                    handling and deletion requests, and the{" "}
                    <Link href="/terms">terms</Link> before using WorkDash.
                </p>
            </section>
        </DiscoveryPage>
    );
}
