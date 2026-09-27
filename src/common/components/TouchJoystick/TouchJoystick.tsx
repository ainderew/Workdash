import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import {
    directionFromPull,
    NO_DIRECTION,
    setTouchDirection,
} from "@/game/input/touchMove";
import useCoarsePointer from "./useCoarsePointer";

/** How far the knob travels from the centre of the ring, px. */
const REACH = 36;
/** Pulls shorter than this don't walk, so resting a thumb doesn't drift. */
const DEAD_ZONE = 10;

interface Point {
    x: number;
    y: number;
}

/**
 * Walking on phones and tablets: put a thumb anywhere on the map and drag.
 * The stick appears under the thumb and walks the way it's pulled; lifting
 * the thumb stops. On touch screens a faint stick rests bottom-left so people
 * know it's there. Mouse presses are ignored (keyboards walk with arrows and
 * WASD), and only the first finger steers, so a second one can tap to kick.
 */
export default function TouchJoystick() {
    const [origin, setOrigin] = useState<Point | null>(null);
    const isCoarse = useCoarsePointer();
    const knob = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let pointerId: number | null = null;
        let centre: Point = { x: 0, y: 0 };

        const moveKnob = (dx: number, dy: number, walking: boolean) => {
            if (!knob.current) return;
            knob.current.style.translate = `${dx}px ${dy}px`;
            knob.current.dataset.walking = walking ? "true" : "false";
        };
        const pull = (event: PointerEvent) => {
            const dx = event.clientX - centre.x;
            const dy = event.clientY - centre.y;
            const direction = directionFromPull(dx, dy, DEAD_ZONE);
            setTouchDirection(direction);
            const scale = Math.min(1, REACH / (Math.hypot(dx, dy) || 1));
            moveKnob(dx * scale, dy * scale, direction !== NO_DIRECTION);
        };
        const release = () => {
            if (pointerId === null) return;
            pointerId = null;
            setTouchDirection(NO_DIRECTION);
            moveKnob(0, 0, false);
            setOrigin(null);
        };

        const onDown = (event: PointerEvent) => {
            if (event.pointerType === "mouse" || pointerId !== null) return;
            const target = event.target as Element | null;
            if (!target?.closest?.("#game-container")) return;
            pointerId = event.pointerId;
            centre = { x: event.clientX, y: event.clientY };
            setOrigin(centre);
            moveKnob(0, 0, false);
        };
        const onMove = (event: PointerEvent) => {
            if (event.pointerId === pointerId) pull(event);
        };
        const onUp = (event: PointerEvent) => {
            if (event.pointerId === pointerId) release();
        };
        const onHidden = () => {
            if (document.visibilityState === "hidden") release();
        };

        document.addEventListener("pointerdown", onDown, true);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        window.addEventListener("blur", release);
        document.addEventListener("visibilitychange", onHidden);
        return () => {
            document.removeEventListener("pointerdown", onDown, true);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            window.removeEventListener("blur", release);
            document.removeEventListener("visibilitychange", onHidden);
            setTouchDirection(NO_DIRECTION);
        };
    }, []);

    const active = origin !== null;
    return (
        <div
            aria-hidden="true"
            className={`wd-touch-stick ${active ? "is-active" : "is-resting"}`}
            hidden={!active && !isCoarse}
            style={active ? { left: origin.x, top: origin.y } : undefined}
        >
            <ChevronUp className="wd-touch-stick__arrow is-up" size={14} />
            <ChevronDown className="wd-touch-stick__arrow is-down" size={14} />
            <ChevronLeft className="wd-touch-stick__arrow is-left" size={14} />
            <ChevronRight className="wd-touch-stick__arrow is-right" size={14} />
            <div ref={knob} className="wd-touch-stick__knob" />
        </div>
    );
}
