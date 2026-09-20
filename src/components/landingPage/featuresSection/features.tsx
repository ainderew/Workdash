import React from "react";

interface LampRow {
    lamp: "on" | "around" | "off";
    state: string;
    body: string;
}

const rows: LampRow[] = [
    {
        lamp: "on",
        state: "On the couch",
        body: "They are in the voice call right now. In the app their plate is a button: press it and you are in the call too — no link to send, nothing to ring, no waiting room to sit in.",
    },
    {
        lamp: "around",
        state: "Around",
        body: "In the world but not in the call. Walk your character over and their audio fades up as you get close, the way it would across a room.",
    },
    {
        lamp: "off",
        state: "Not tonight",
        body: "Nobody is on. Workdash tells you that once and then leaves you alone — no badge, no push, no nudge about who might show up later.",
    },
];

export function Features() {
    return (
        <section id="lamps" className="mx-auto w-full max-w-[80rem] px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-[46rem]">
                <h2 className="wd-board-head">
                    Three lamps. That is the whole interface.
                </h2>
                <p className="wd-board-body mt-5">
                    Everything else in Workdash — the channels, the emotes, the little
                    couch you sit on — only matters once you are in. What you need from
                    outside is one glance at who is around.
                </p>
            </div>

            <div className="wd-board-mount mt-12">
            <div className="wd-board overflow-hidden">
                <span className="wd-board-frame" aria-hidden="true" />

                <div className="relative flex items-center justify-between border-b border-[var(--brd-rule-strong)] px-5 py-3 sm:px-8">
                    <span className="wd-board-legend">Lamp key</span>
                    <span className="wd-board-screw" aria-hidden="true" />
                </div>

                <dl className="relative">
                    {rows.map((row, index) => (
                        <div
                            key={row.state}
                            className={`grid grid-cols-[minmax(0,1fr)] items-start gap-y-3 px-5 py-6 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-x-10 sm:px-8 sm:py-7 ${
                                index > 0 ? "border-t border-[var(--brd-rule)]" : ""
                            }`}
                        >
                            <dt className="flex items-center gap-3 sm:pt-[5px]">
                                <span
                                    className="wd-board-lamp"
                                    data-lamp={row.lamp}
                                    aria-hidden="true"
                                />
                                <span className="wd-board-legend wd-board-legend-strong">
                                    {row.state}
                                </span>
                            </dt>
                            <dd className="wd-board-body max-w-[58ch]">{row.body}</dd>
                        </div>
                    ))}
                </dl>
            </div>
            </div>
        </section>
    );
}
