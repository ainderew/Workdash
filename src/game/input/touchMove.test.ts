import { describe, it, expect, afterEach } from "vitest";
import {
    directionFromPull,
    NO_DIRECTION,
    setTouchDirection,
    touchDirection,
} from "./touchMove";

const DEAD = 10;

describe("directionFromPull", () => {
    it("stands still inside the dead zone", () => {
        expect(directionFromPull(0, 0, DEAD)).toEqual(NO_DIRECTION);
        expect(directionFromPull(6, -6, DEAD)).toEqual(NO_DIRECTION);
    });

    it("walks straight along each axis", () => {
        expect(directionFromPull(0, -40, DEAD)).toEqual({ ...NO_DIRECTION, up: true });
        expect(directionFromPull(0, 40, DEAD)).toEqual({ ...NO_DIRECTION, down: true });
        expect(directionFromPull(-40, 0, DEAD)).toEqual({ ...NO_DIRECTION, left: true });
        expect(directionFromPull(40, 0, DEAD)).toEqual({ ...NO_DIRECTION, right: true });
    });

    it("walks diagonally when the pull is diagonal", () => {
        expect(directionFromPull(30, -30, DEAD)).toEqual({ ...NO_DIRECTION, up: true, right: true });
        expect(directionFromPull(-30, 30, DEAD)).toEqual({ ...NO_DIRECTION, down: true, left: true });
    });

    it("keeps a slightly wobbly straight pull straight", () => {
        // 40 right, 15 down is ~21° off the axis
        expect(directionFromPull(40, 15, DEAD)).toEqual({ ...NO_DIRECTION, right: true });
        expect(directionFromPull(-12, -40, DEAD)).toEqual({ ...NO_DIRECTION, up: true });
    });

    it("never presses opposite directions together", () => {
        for (let angle = 0; angle < 360; angle += 5) {
            const r = (angle * Math.PI) / 180;
            const d = directionFromPull(Math.cos(r) * 40, Math.sin(r) * 40, DEAD);
            expect(d.up && d.down).toBe(false);
            expect(d.left && d.right).toBe(false);
            expect(d.up || d.down || d.left || d.right).toBe(true);
        }
    });
});

describe("touch direction", () => {
    afterEach(() => setTouchDirection(NO_DIRECTION));

    it("holds whatever the joystick last wrote", () => {
        expect(touchDirection()).toEqual(NO_DIRECTION);
        setTouchDirection({ ...NO_DIRECTION, left: true });
        expect(touchDirection().left).toBe(true);
    });
});
