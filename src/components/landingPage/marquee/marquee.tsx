import React from "react";
import { WorkdashGlyph } from "./workdashGlyph";

const WORDS = [
    "HANG OUT",
    "QUEUE UP",
    "SIT DOWN",
    "TALK",
    "PLAY",
    "STAY A WHILE",
];

function Run({ ariaHidden }: { ariaHidden?: boolean }) {
    return (
        <div
            className="wd-marquee-run"
            aria-hidden={ariaHidden ? "true" : undefined}
        >
            {WORDS.map((word) => (
                <React.Fragment key={word}>
                    <span className="wd-marquee-word">{word}</span>
                    <WorkdashGlyph className="wd-marquee-glyph" />
                </React.Fragment>
            ))}
        </div>
    );
}

/**
 * Horizontal ticker band. The second run is an exact copy offset by 100%, so
 * the loop is seamless; only the first is exposed to assistive tech.
 */
export function Marquee() {
    return (
        <div className="wd-marquee" role="presentation">
            <div className="wd-marquee-track">
                <Run />
                <Run ariaHidden />
            </div>
        </div>
    );
}
