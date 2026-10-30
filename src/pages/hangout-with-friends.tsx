import React from "react";
import Link from "next/link";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";

export default function HangoutWithFriends() {
    return (
        <DiscoveryPage
            path="/hangout-with-friends"
            title="Hang Out Online with Friends in a Virtual Room | WorkDash"
            description="Make a browser hangout for your friend group. WorkDash has a shared 2D world, room-based voice, video and screen sharing. Free in early access."
            heading="A virtual room to hang out with friends"
            intro="Keep a place for the people you already talk to. WorkDash runs in a browser, so your group can meet in the lounge, talk between games, and come back to the same workspace another night."
            preview
        >
            <section>
                <h2>Built for the time between games</h2>
                <p>
                    WorkDash started with a group of former coworkers who kept a
                    call open while playing Dota. The shared world gives that
                    group a place to meet before a match and hang out afterward.
                    It is a separate browser app, not an in-game voice
                    integration.
                </p>
            </section>
            <section>
                <h2>One world, separate conversations</h2>
                <p>
                    Walk into the café or the campfire to hear the people in
                    that room. Move to another room to change conversations.
                    Everyone in the same room hears each other; moving a little
                    farther across it does not lower their volume.
                </p>
                <p className="mt-4">
                    For a quieter session, switch to desk mode for text channels
                    and threads without moving an avatar. Video and screen
                    sharing are also available.
                </p>
            </section>
            <section>
                <h2>Your first night in the room</h2>
                <ol className="list-decimal pl-6 space-y-4 max-w-2xl">
                    <li>
                        <strong>Create your group&apos;s workspace.</strong>{" "}
                        Sign in with Google or a magic link sent to your email,
                        then give the workspace a name.
                    </li>
                    <li>
                        <strong>Invite a few friends.</strong> Send the
                        workspace invite link through the chat you already use.
                        Each friend signs in to join.
                    </li>
                    <li>
                        <strong>Meet in the same room.</strong> Allow microphone
                        access and check that everyone can hear each other
                        before launching a game.
                    </li>
                    <li>
                        <strong>Come back when you feel like it.</strong> Use
                        the same workspace next time. A persistent workspace
                        does not mean anyone has to stay connected.
                    </li>
                </ol>
            </section>
            <section>
                <h2>What to know before inviting everyone</h2>
                <p>
                    WorkDash is free in early access, with no card required. It
                    is intended for small groups of about twenty, and a laptop
                    is currently the smoother experience. Phones can use the
                    browser and an on-screen joystick. There is one shared world
                    layout rather than a map editor.
                </p>
                <p className="mt-4">
                    Compare it with{" "}
                    <Link href="/discord-alternative">
                        Discord for friend groups
                    </Link>{" "}
                    or a{" "}
                    <Link href="/gather-alternative">Gather-style hangout</Link>
                    . For microphone troubleshooting, see{" "}
                    <Link href="/help">getting started</Link>.
                </p>
            </section>
        </DiscoveryPage>
    );
}
