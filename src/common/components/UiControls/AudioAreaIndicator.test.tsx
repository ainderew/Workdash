import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AudioAreaIndicator, { AUDIO_AREA_HELP_KEY } from "./AudioAreaIndicator";
import useWorldAudioStore from "@/common/store/worldAudioStore";
import useUiStore from "@/common/store/uiStore";
import useCallStore from "@/common/store/callStore";
import useFocusStore from "@/common/store/focusStore";

describe("audio area help", () => {
    beforeEach(() => {
        localStorage.removeItem(AUDIO_AREA_HELP_KEY);
        useWorldAudioStore.setState({ connected: true, zoneId: "main_office", peerIds: [], showAreas: false, helpOpen: false });
        useUiStore.setState({ isMuted: true });
        useCallStore.getState().reset();
        useFocusStore.getState().reset();
    });
    afterEach(cleanup);

    it("explains audio on the first visit, shows map areas, and remembers dismissal", () => {
        const first = render(<AudioAreaIndicator />);
        expect(screen.getByRole("region", { name: "How audio areas work" })).toBeInTheDocument();
        expect(useWorldAudioStore.getState().showAreas).toBe(true);
        // Help does not switch on the microphone.
        expect(useUiStore.getState().isMuted).toBe(true);
        fireEvent.click(screen.getByRole("button", { name: "Got it" }));
        expect(screen.queryByRole("region")).not.toBeInTheDocument();
        expect(useWorldAudioStore.getState().showAreas).toBe(false);
        expect(localStorage.getItem(AUDIO_AREA_HELP_KEY)).toBe("seen");
        first.unmount();
        render(<AudioAreaIndicator />);
        expect(screen.queryByRole("region")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Audio area help/ }));
        expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("allows map boundaries to be toggled and dismisses with Escape", () => {
        render(<AudioAreaIndicator />);
        fireEvent.click(screen.getByRole("button", { name: "Hide audio areas" }));
        expect(useWorldAudioStore.getState().showAreas).toBe(false);
        fireEvent.click(screen.getByRole("button", { name: "Show audio areas" }));
        expect(useWorldAudioStore.getState().showAreas).toBe(true);
        fireEvent.keyDown(window, { key: "Escape" });
        expect(screen.queryByRole("region")).not.toBeInTheDocument();
        expect(useWorldAudioStore.getState().showAreas).toBe(false);
    });

    it("reflects server area/occupancy changes, mic state and disconnects", () => {
        localStorage.setItem(AUDIO_AREA_HELP_KEY, "seen");
        render(<AudioAreaIndicator />);
        expect(screen.getByRole("button", { name: /Main office. Mic off · Just you here/ })).toBeInTheDocument();
        act(() => { useWorldAudioStore.getState().setZone("outdoors", ["a", "b"]); useUiStore.setState({ isMuted: false }); });
        expect(screen.getByRole("button", { name: /Outdoor paths. Mic on · 2 others here/ })).toBeInTheDocument();
        act(() => useWorldAudioStore.getState().resetConnection());
        expect(screen.getByRole("button", { name: /Connecting audio/ })).toBeInTheDocument();
        expect(screen.queryByText(/2 others/)).not.toBeInTheDocument();
    });

    it("does not claim world audio is active during a call or focus mode", () => {
        localStorage.setItem(AUDIO_AREA_HELP_KEY, "seen");
        render(<AudioAreaIndicator />);
        act(() => useCallStore.getState().setCurrentCallAsOwner("channel"));
        expect(screen.getByRole("button", { name: /In a call · World audio paused/ })).toBeInTheDocument();
        act(() => { useCallStore.getState().reset(); useFocusStore.getState().setLocalFocusMode(true); });
        expect(screen.getByRole("button", { name: /Focus mode · World audio paused/ })).toBeInTheDocument();
    });
});
