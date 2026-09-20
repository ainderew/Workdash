import React from "react";
import Image from "next/image";
import lounge from "../../../../public/assets/lounge.webp";

export function DemoSection() {
    return (
        <section id="room" className="mx-auto w-full max-w-[80rem] px-5 py-16 sm:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)] lg:items-end lg:gap-16">
                <div>
                    <h2 className="wd-board-head">Behind the plate is an actual room.</h2>
                    <p className="wd-board-body mt-5">
                        Workdash has two halves and you can sit in either. The world is a
                        small top-down place with a lounge, a couch and your friends
                        walking around it; audio works by distance, so a conversation you
                        walk away from fades instead of ending. The desk is the quiet
                        half — channels, threads, screenshare — for the nights when
                        nobody feels like moving a sprite.
                    </p>
                </div>
                <p className="wd-board-ledger max-w-[34ch] border-l border-[var(--brd-hairline)] pl-5">
                    Screenshot from our own room. The bar along the bottom is your mic,
                    camera and the count of who is on. The couch is where the call lives.
                </p>
            </div>

            <figure className="wd-board-mount mt-12">
                <span className="wd-board-window block overflow-hidden">
                <Image
                    src={lounge}
                    alt="The Workdash world: a top-down pixel lounge with bookshelves, couches and a player standing by the coffee table, and a control bar along the bottom showing microphone, camera and who is online."
                    placeholder="blur"
                    sizes="(max-width: 1280px) 100vw, 1200px"
                    className="h-auto w-full"
                />
                </span>
            </figure>
        </section>
    );
}
