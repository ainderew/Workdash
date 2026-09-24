import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EventBus } from "@/game/EventBus";
import usePlayersStore from "@/common/store/playerStore";
import WorldMapModel from "./WorldMapModel";
import {
    DEFAULT_SPAWN_TILE,
    WORLD_PLACES,
    aimAtCamera,
    toPreviewFraction,
    type HandOffAim,
} from "./places";

type Phase = "loading" | "waking" | "leaving" | "hidden";

const LEAVE_MS = 950;
const LEAVE_REDUCED_MS = 300;
const WAKE_HOLD_MS = 380;
/** If the scene never reports in after the assets arrive, don't trap anyone. */
const STUCK_AFTER_LOAD_MS = 20_000;

interface WorldLoadingScreenProps {
    /** World mode is on screen; the overlay only ever covers the world */
    active: boolean;
}

interface WorldView {
    x: number;
    y: number;
    zoom: number;
}

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Covers the world while it loads: a dim model of the real map whose places
 * light up as assets arrive, then flattens and zooms into the live world.
 * Coming back from desk mode replays a short, already-lit version.
 */
export default function WorldLoadingScreen({
    active,
}: WorldLoadingScreenProps) {
    const [phase, setPhase] = useState<Phase>("loading");
    const [progress, setProgress] = useState(0);
    const [aim, setAim] = useState<HandOffAim | null>(null);
    const zoomRef = useRef<HTMLDivElement>(null);
    const view = useRef<WorldView | null>(null);
    const loadedOnce = useRef(false);
    const cameBack = useRef(false);
    const wasActive = useRef(active);

    /** Flatten and dive toward where the live camera is looking. */
    const leave = () => {
        const { playerMap, localPlayerId } = usePlayersStore.getState();
        const pos =
            (localPlayerId && playerMap[localPlayerId]?.physicsState) ||
            view.current;
        const focus = pos
            ? { tx: pos.x / 32, ty: pos.y / 32 }
            : DEFAULT_SPAWN_TILE;
        const box = zoomRef.current?.getBoundingClientRect() ?? null;
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
        };
        setAim(aimAtCamera(box, focus, view.current?.zoom ?? 1, viewport));
        setPhase("leaving");
    };
    const leaveRef = useRef(leave);
    leaveRef.current = leave;

    useEffect(() => {
        const onProgress = (value: number) =>
            setProgress((p) => Math.max(p, value));
        const onView = (next: WorldView) => {
            view.current = next;
        };
        const onSceneReady = () => {
            if (loadedOnce.current) return;
            loadedOnce.current = true;
            setProgress(1);
            leaveRef.current();
        };
        EventBus.on("world-load-progress", onProgress);
        EventBus.on("world-view", onView);
        EventBus.on("current-scene-ready", onSceneReady);
        return () => {
            EventBus.off("world-load-progress", onProgress);
            EventBus.off("world-view", onView);
            EventBus.off("current-scene-ready", onSceneReady);
        };
    }, []);

    // Back from desk mode: cover the world before it paints, then wake up
    useLayoutEffect(() => {
        if (active && !wasActive.current && loadedOnce.current) {
            cameBack.current = true;
            setPhase("waking");
        }
        wasActive.current = active;
    }, [active]);

    useEffect(() => {
        let timer: number | undefined;
        if (phase === "waking") {
            timer = window.setTimeout(() => leaveRef.current(), WAKE_HOLD_MS);
        } else if (phase === "leaving") {
            const ms = prefersReducedMotion() ? LEAVE_REDUCED_MS : LEAVE_MS;
            timer = window.setTimeout(() => setPhase("hidden"), ms);
        } else if (phase === "loading" && progress >= 1) {
            timer = window.setTimeout(() => {
                loadedOnce.current = true;
                leaveRef.current();
            }, STUCK_AFTER_LOAD_MS);
        }
        return () => window.clearTimeout(timer);
    }, [phase, progress]);

    if (!active || phase === "hidden") return null;

    const lamps = WORLD_PLACES.map((place) => ({
        ...place,
        ...toPreviewFraction(place.tx, place.ty),
        lit: phase !== "loading" || progress >= place.at,
    }));
    const newest = [...lamps].reverse().find((lamp) => lamp.lit);
    const status = cameBack.current
        ? "Walking back in…"
        : (newest ?? lamps[0]).status;
    const pct = `${Math.min(Math.max(progress, 0), 1) * 100}%`;
    const aimStyle = aim
        ? ({
              "--fx": aim.fx,
              "--fy": aim.fy,
              "--dx": `${aim.dx}px`,
              "--dy": `${aim.dy}px`,
              "--zs": aim.zs,
          } as React.CSSProperties)
        : undefined;

    return (
        <div
            className={`wd-splash wd-world-loading wd-world-loading--${phase}`}
            role="status"
            aria-live="polite"
        >
            <div className="wd-splash__air" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="wd-splash__mote" />
                ))}
            </div>

            <WorldMapModel
                lamps={lamps}
                zoomRef={zoomRef}
                zoomStyle={phase === "leaving" ? aimStyle : undefined}
            />

            <div className="wd-splash__status">
                <span key={status} className="wd-splash__status-line">
                    {status}
                </span>
            </div>
            <div className="wd-splash__rail" aria-hidden="true">
                <span className="wd-splash__fill" style={{ width: pct }} />
                <span className="wd-splash__trail" style={{ left: pct }} />
                <span className="wd-splash__comet" style={{ left: pct }} />
            </div>

            <div className="wd-splash__vignette" aria-hidden="true" />
            <div className="wd-splash__grain" aria-hidden="true" />
        </div>
    );
}
