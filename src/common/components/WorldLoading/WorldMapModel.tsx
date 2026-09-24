import React from "react";
import Image from "next/image";
import { WORLD_MAP_PREVIEW } from "./places";

export interface MapLamp {
    name: string;
    /** Position on the preview, as fractions (0..1) */
    x: number;
    y: number;
    lit: boolean;
}

interface WorldMapModelProps {
    lamps: MapLamp[];
    /** Measured for the hand-off; carries the zoom's aim while leaving */
    zoomRef: React.Ref<HTMLDivElement>;
    zoomStyle?: React.CSSProperties;
}

/** The tilted miniature of the world, with a lamp and a lit pool per place. */
export default function WorldMapModel({
    lamps,
    zoomRef,
    zoomStyle,
}: WorldMapModelProps) {
    return (
        <div className="wd-world-loading__stage" aria-hidden="true">
            <div
                ref={zoomRef}
                className="wd-world-loading__zoom"
                style={zoomStyle}
            >
                <div
                    className="wd-world-loading__model"
                    style={
                        {
                            "--map": `url(${WORLD_MAP_PREVIEW})`,
                        } as React.CSSProperties
                    }
                >
                    <Image
                        src={WORLD_MAP_PREVIEW}
                        alt=""
                        width={1016}
                        height={880}
                        className="wd-world-loading__map"
                        draggable={false}
                        priority
                        unoptimized
                    />
                    {lamps.map((lamp) => (
                        <div
                            key={lamp.name}
                            className={`wd-world-loading__place${lamp.lit ? " is-lit" : ""}`}
                            style={
                                {
                                    "--x": lamp.x,
                                    "--y": lamp.y,
                                } as React.CSSProperties
                            }
                        >
                            <span className="wd-world-loading__pool" />
                            <span className="wd-world-loading__lamp" />
                            <span className="wd-world-loading__label">
                                {lamp.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <span className="wd-world-loading__shadow" />
        </div>
    );
}
