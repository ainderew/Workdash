import React from "react";
import Link from "next/link";
import { CrewBoard } from "./crewBoard";

export function Hero() {
    return (
        <section
            id="board"
            className="relative mx-auto grid w-full max-w-[80rem] items-center gap-12 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)] lg:gap-14 lg:pb-24 lg:pt-36"
        >
            <div>
                <h1 className="wd-board-display">The room&rsquo;s already open.</h1>

                <p className="wd-board-body mt-6">
                    Workdash keeps one room running for your friend group &mdash; a voice
                    call nobody has to start, and a small world you can actually walk
                    around in. Open the tab, see who&rsquo;s on, sit down.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                    <Link href="/app" className="wd-board-button">
                        Open the room
                    </Link>
                    <a href="#room" className="wd-board-button-ghost">
                        Look inside first
                    </a>
                </div>

                <p className="wd-board-legend mt-8 leading-relaxed">
                    Free while we build it &nbsp;·&nbsp; No card &nbsp;·&nbsp; Early access
                </p>
            </div>

            <div>
                <CrewBoard />
                <p className="wd-board-legend mt-4 pl-1">
                    Example board &mdash; your room, your people
                </p>
            </div>
        </section>
    );
}
