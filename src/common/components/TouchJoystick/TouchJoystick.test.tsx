import React from "react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import TouchJoystick from "./TouchJoystick";
import { NO_DIRECTION, touchDirection } from "@/game/input/touchMove";

let map: HTMLElement;
let chatButton: HTMLElement;

/** A pointer event with the fields the joystick reads (jsdom has no PointerEvent). */
function pointer(
    type: string,
    target: EventTarget,
    x: number,
    y: number,
    { id = 1, kind = "touch" }: { id?: number; kind?: string } = {},
) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    Object.defineProperties(event, {
        pointerId: { value: id },
        pointerType: { value: kind },
    });
    act(() => {
        target.dispatchEvent(event);
    });
}

describe("TouchJoystick", () => {
    beforeEach(() => {
        map = document.createElement("div");
        map.id = "game-container";
        map.appendChild(document.createElement("canvas"));
        chatButton = document.createElement("button");
        document.body.append(map, chatButton);
    });

    afterEach(() => {
        cleanup();
        map.remove();
        chatButton.remove();
    });

    it("walks the way a thumb drags on the map, and stops when it lifts", () => {
        render(<TouchJoystick />);
        const canvas = map.querySelector("canvas")!;

        pointer("pointerdown", canvas, 100, 500);
        expect(touchDirection()).toEqual(NO_DIRECTION);

        pointer("pointermove", window, 100, 450);
        expect(touchDirection()).toEqual({ ...NO_DIRECTION, up: true });

        pointer("pointermove", window, 140, 460);
        expect(touchDirection()).toEqual({ ...NO_DIRECTION, up: true, right: true });

        pointer("pointerup", window, 140, 460);
        expect(touchDirection()).toEqual(NO_DIRECTION);
    });

    it("doesn't walk on a tiny wobble", () => {
        render(<TouchJoystick />);
        pointer("pointerdown", map.querySelector("canvas")!, 100, 500);
        pointer("pointermove", window, 104, 503);
        expect(touchDirection()).toEqual(NO_DIRECTION);
    });

    it("stops if the browser cancels the touch", () => {
        render(<TouchJoystick />);
        pointer("pointerdown", map.querySelector("canvas")!, 100, 500);
        pointer("pointermove", window, 60, 500);
        expect(touchDirection().left).toBe(true);
        pointer("pointercancel", window, 60, 500);
        expect(touchDirection()).toEqual(NO_DIRECTION);
    });

    it("leaves mouse drags alone", () => {
        render(<TouchJoystick />);
        pointer("pointerdown", map.querySelector("canvas")!, 100, 500, { kind: "mouse" });
        pointer("pointermove", window, 100, 400, { kind: "mouse" });
        expect(touchDirection()).toEqual(NO_DIRECTION);
    });

    it("ignores touches on the UI over the map", () => {
        render(<TouchJoystick />);
        pointer("pointerdown", chatButton, 100, 500);
        pointer("pointermove", window, 100, 400);
        expect(touchDirection()).toEqual(NO_DIRECTION);
    });

    it("keeps steering with the first finger while a second one taps", () => {
        render(<TouchJoystick />);
        const canvas = map.querySelector("canvas")!;
        pointer("pointerdown", canvas, 100, 500, { id: 1 });
        pointer("pointermove", window, 100, 560, { id: 1 });
        pointer("pointerdown", canvas, 300, 300, { id: 2 });
        pointer("pointerup", window, 300, 300, { id: 2 });
        expect(touchDirection()).toEqual({ ...NO_DIRECTION, down: true });
    });

    it("stops walking when it goes away", () => {
        const { unmount } = render(<TouchJoystick />);
        pointer("pointerdown", map.querySelector("canvas")!, 100, 500);
        pointer("pointermove", window, 160, 500);
        expect(touchDirection().right).toBe(true);
        unmount();
        expect(touchDirection()).toEqual(NO_DIRECTION);
    });
});
