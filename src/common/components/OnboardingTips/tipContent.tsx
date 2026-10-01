import React, { type ReactNode } from "react";
import type { TipId } from "./_types";

export interface TipContent {
    title: string;
    body: string;
    /** The "try it" line; null when there's nothing to add. */
    hint: ReactNode;
}

interface TipContext {
    /** A phone or tablet: tap wording, and no keyboard shortcut. */
    touch: boolean;
    mac: boolean;
}

/** The mode-switch shortcut, as keycaps (Cmd+D on a Mac, Alt+D elsewhere). */
function renderSwitchKeys(mac: boolean) {
    return (
        <>
            <kbd className="wd-tip__key">
                <span aria-hidden="true">{mac ? "⌘" : "Alt"}</span>
                <span className="sr-only">{mac ? "Command" : "Alt"}</span>
            </kbd>
            <kbd className="wd-tip__key">D</kbd>
        </>
    );
}

export function getTipContent(id: TipId, { touch, mac }: TipContext): TipContent {
    const press = touch ? "Tap" : "Click";
    switch (id) {
        case "chat":
            return {
                title: "Chat without leaving the world",
                body: touch
                    ? "Open the room's chat right from here. You stay in the world, so friends still see you and nearby voice keeps going."
                    : "Open the room's chat on the side. You stay in the world, so friends still see you and nearby voice keeps going.",
                hint: `${press} the lit button to open it`,
            };
        case "desk":
            return {
                title: "Heads down? Pull up a desk",
                body: "Desk mode swaps the world for a full chat view: channels, DMs and calls. Nearby voice pauses while you're there.",
                hint: touch ? (
                    "Tap the lit button to try it"
                ) : (
                    <>Click the lit button or press {renderSwitchKeys(mac)}</>
                ),
            };
        case "world":
            return {
                title: touch
                    ? "The world's one tap away"
                    : "The world's one click away",
                body: "Head back into the world anytime to walk around and hear who's nearby.",
                hint: touch ? null : (
                    <>{renderSwitchKeys(mac)} works both ways, even mid-message</>
                ),
            };
    }
}
