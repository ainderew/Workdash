import React from "react";
import Link from "next/link";

const spec = [
    { label: "Price", value: "Free — no card, no seats, no tiers" },
    { label: "Room size", value: "Comfortable up to about 20 people" },
    { label: "Stage", value: "Early access. Expect rough edges." },
    { label: "Sign in", value: "Google, or a magic link by email" },
];

export function Status() {
    return (
        <section id="status" className="mx-auto w-full max-w-[80rem] px-5 py-16 sm:px-8 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-20">
                <div>
                    <h2 className="wd-board-head">
                        Free while we&rsquo;re still building it.
                    </h2>
                    <p className="wd-board-body mt-5">
                        There is no pricing page yet because there is nothing to charge
                        for yet. Bring your group, keep a room open, and tell us what
                        breaks — that is the entire arrangement for now.
                    </p>
                    <div className="mt-9">
                        <Link href="/app" className="wd-board-button">
                            Open the room
                        </Link>
                    </div>
                </div>

                {/* Rating plate — the small engraved panel screwed to the equipment */}
                <div className="wd-board-mount">
                <div className="wd-board overflow-hidden">
                    <span className="wd-board-frame" aria-hidden="true" />
                    <div className="relative flex items-center justify-between border-b border-[var(--brd-rule-strong)] px-5 py-3 sm:px-7">
                        <span className="wd-board-legend">Where things stand</span>
                        <span className="wd-board-screw" aria-hidden="true" />
                    </div>
                    <dl className="relative px-5 py-2 sm:px-7">
                        {spec.map((item, index) => (
                            <div
                                key={item.label}
                                className={`flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6 ${
                                    index > 0 ? "border-t border-[var(--brd-rule)]" : ""
                                }`}
                            >
                                <dt className="wd-board-legend sm:w-[7.5rem] sm:shrink-0">
                                    {item.label}
                                </dt>
                                <dd className="text-[0.9375rem] leading-relaxed text-[var(--brd-ink)]">
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
                </div>
            </div>
        </section>
    );
}
