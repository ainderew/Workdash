import React, { useEffect, useState } from "react";

type LampState = "on" | "around" | "off";

interface Station {
    name: string;
    lamp: LampState;
    /* How long they have been on. The lamp carries the state visually;
       `state` carries the same fact for anyone who cannot see colour. */
    since: string;
}

const lampState: Record<LampState, string> = {
    on: "in the call",
    around: "around, not in the call",
    off: "not on tonight",
};

// An example board, not a user list — see the note under it.
const stations: Station[] = [
    { name: "Brett", lamp: "on", since: "51m" },
    { name: "Marky", lamp: "on", since: "34m" },
    { name: "Ivan", lamp: "around", since: "28m" },
    { name: "Andrew", lamp: "on", since: "22m" },
    { name: "Rain", lamp: "off", since: "—" },
];

const ledger = [
    { time: "21:41", line: "Brett sat down" },
    { time: "21:58", line: "Marky sat down" },
    { time: "22:04", line: "Ivan walked in" },
    { time: "22:10", line: "Andrew sat down" },
];

const litCount = stations.filter((s) => s.lamp !== "off").length;

function StationRow({ station, index, lit }: { station: Station; index: number; lit: boolean }) {
    // The authored moment: plates seat in their channels one after another,
    // then each lamp warms up. Both stagger off this single delay.
    const delay = `${220 + index * 110}ms`;

    return (
        <li
            className="wd-board-station relative"
            data-lit={lit ? (station.lamp === "around" ? "around" : "true") : "false"}
        >
            <span className="wd-board-pool" aria-hidden="true" style={{ transitionDelay: delay }} />
            <div className="wd-board-channel relative flex items-center gap-3 p-[5px] pr-3.5">
                <div
                    className="wd-board-plate wd-board-seating w-[11.5rem] max-w-[62%] shrink-0"
                    data-state={station.lamp === "off" ? "out" : "in"}
                    style={{ animationDelay: delay }}
                >
                    <span className="truncate">{station.name}</span>
                </div>
                <span className="flex-1" aria-hidden="true" />
                <span
                    className="wd-board-lamp"
                    data-lamp={lit ? station.lamp : "off"}
                    style={{ ["--lamp-delay" as string]: delay }}
                    aria-hidden="true"
                />
                <span className="sr-only">{lampState[station.lamp]},</span>
                <span className="wd-board-ledger w-12 shrink-0 text-right tabular-nums">
                    {station.since}
                </span>
            </div>
        </li>
    );
}

export function CrewBoard() {
    const [lit, setLit] = useState(false);

    // Lamps come up after first paint so the board is seen switching on,
    // not already on. Reduced motion collapses the transitions to 1ms.
    useEffect(() => {
        const id = window.requestAnimationFrame(() => setLit(true));
        return () => window.cancelAnimationFrame(id);
    }, []);

    return (
        <div className="wd-board-mount">
            <div className="wd-board overflow-hidden">
            <span className="wd-board-frame" aria-hidden="true" />

            {/* Header rail */}
            <div className="relative flex items-center justify-between gap-4 border-b border-[var(--brd-rule-strong)] px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                    <span className="wd-board-screw" aria-hidden="true" />
                    <span className="wd-board-legend">Crew board</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="wd-board-legend wd-board-legend-strong">
                        {litCount} on · since 21:41
                    </span>
                    <span className="wd-board-screw" aria-hidden="true" />
                </div>
            </div>

            {/* Stations */}
            <div className="relative px-4 py-5 sm:px-6 sm:py-6">
                <div className="mb-3 flex items-center justify-between">
                    <span className="wd-board-legend">Station</span>
                    <span className="wd-board-legend">On for</span>
                </div>
                <ul className="flex flex-col gap-[7px]">
                    {stations.map((station, index) => (
                        <StationRow
                            key={station.name}
                            station={station}
                            index={index}
                            lit={lit}
                        />
                    ))}
                </ul>
            </div>

            {/* Ledger strip */}
            <div className="wd-board-paper relative px-4 py-3 sm:px-6">
                <p className="wd-board-ledger relative flex flex-wrap gap-x-4 gap-y-0">
                    {ledger.map((entry) => (
                        <span key={entry.time} className="whitespace-nowrap">
                            <span className="text-[var(--brd-fg)]">{entry.time}</span>{" "}
                            {entry.line}
                        </span>
                    ))}
                </p>
            </div>
            </div>
        </div>
    );
}
