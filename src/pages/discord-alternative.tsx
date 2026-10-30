import React from "react";
import Link from "next/link";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";

const rows = [
    [
        "Joining voice",
        "Walk into a room in the 2D world, or use desk mode",
        "Click a server voice channel to join",
    ],
    [
        "Seeing friends",
        "Avatars share a walkable world",
        "Members appear in the server's voice channels",
    ],
    ["Text, video and screen sharing", "Available", "Available"],
    [
        "Best fit",
        "A small group that wants a shared place to hang out",
        "Groups that want a channel-based server",
    ],
    [
        "Moving your history",
        "Start a new workspace; no Discord import",
        "Keep your existing server and messages",
    ],
];

export default function DiscordAlternative() {
    return (
        <DiscoveryPage
            path="/discord-alternative"
            title="A Discord Alternative for Friends | WorkDash"
            description="Want a Discord alternative with a virtual world? WorkDash gives small friend groups free browser rooms, voice by room, video, chat and screen sharing."
            heading="A Discord alternative for friends who want a shared room"
            intro="WorkDash is a free browser hangout for small groups. Walk around a 2D world, join the conversation in a room, or switch to desk mode for channels and threads. Keep your Discord server if you still use it."
            preview
        >
            <section>
                <h2>Choose by how your group hangs out</h2>
                <p>
                    Discord already has drop-in voice channels. You can see who
                    is in them and join without ringing anyone. WorkDash&apos;s
                    difference is the walkable world: your avatar moves between
                    rooms, and you hear the people in your current room.
                </p>
                <p className="mt-4">
                    If you are looking for a Discord alternative with proximity
                    chat, this is the distinction to know. WorkDash uses room
                    boundaries. Audio does not gradually fade as you move away
                    from another avatar.
                </p>
            </section>
            <section>
                <h2>WorkDash and Discord compared</h2>
                <div
                    className="overflow-x-auto rounded-xl border border-[var(--wd-border-subtle)]"
                    role="region"
                    aria-label="Scrollable WorkDash and Discord comparison"
                    tabIndex={0}
                >
                    <table className="w-full min-w-[36rem] text-left text-sm">
                        <caption className="sr-only">
                            Choosing between WorkDash and Discord for a small
                            friend group
                        </caption>
                        <thead className="bg-[var(--wd-surface-panel-2)]">
                            <tr>
                                {["What matters", "WorkDash", "Discord"].map(
                                    (label) => (
                                        <th
                                            scope="col"
                                            key={label}
                                            className="p-4"
                                        >
                                            {label}
                                        </th>
                                    ),
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(([label, workdash, discord]) => (
                                <tr
                                    key={label}
                                    className="border-t border-[var(--wd-border-subtle)]"
                                >
                                    <th
                                        scope="row"
                                        className="p-4 align-top font-medium"
                                    >
                                        {label}
                                    </th>
                                    <td className="p-4 align-top">
                                        {workdash}
                                    </td>
                                    <td className="p-4 align-top">{discord}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-4 text-sm">
                    Discord&apos;s voice, video and screen-sharing details were
                    checked on October 30, 2026 against its{" "}
                    <a href="https://support.discord.com/hc/en-us/articles/360045138571-Beginner-s-Guide-to-Discord">
                        official beginner&apos;s guide
                    </a>
                    . WorkDash is an independent product.
                </p>
            </section>
            <section>
                <h2>When WorkDash fits</h2>
                <p>
                    Your group knows each other, wants somewhere to meet between
                    games, and likes moving around a shared space. WorkDash is
                    in early access and is intended for groups of about twenty.
                    That is a comfort guideline, not a tested capacity
                    guarantee.
                </p>
                <h3 className="mt-6">When to keep Discord</h3>
                <p>
                    If your group is happy with voice channels, there is no need
                    to move. Keep Discord for an established community and its
                    existing conversations. WorkDash does not import Discord
                    messages, roles or bots.
                </p>
            </section>
            <section>
                <h2>Try one evening together</h2>
                <ol className="list-decimal pl-6 space-y-3 max-w-2xl">
                    <li>
                        Sign in with Google or an email link and create a
                        workspace.
                    </li>
                    <li>
                        Share its invite link in your existing group chat.
                        Friends need to sign in too.
                    </li>
                    <li>
                        Meet in the same room, allow microphone access, and try
                        voice before starting your game.
                    </li>
                </ol>
                <p className="mt-5">
                    Nothing is for sale yet. Read{" "}
                    <Link href="/pricing">
                        what is free today and what may cost money later
                    </Link>
                    , or check the{" "}
                    <Link href="/help">setup and device answers</Link>.
                </p>
            </section>
        </DiscoveryPage>
    );
}
