import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { useComposerDraft } from "./useComposerDraft";
import { getDraft, setDraft } from "@/common/utils/composerDrafts";

/** Minimal stand-in for the tiptap Editor — only `on`/`off` are used. */
function makeFakeEditor() {
    const handlers: Record<string, Array<() => void>> = {};
    return {
        on(event: string, cb: () => void) {
            (handlers[event] ??= []).push(cb);
        },
        off(event: string, cb: () => void) {
            handlers[event] = (handlers[event] ?? []).filter((h) => h !== cb);
        },
        emit(event: string) {
            (handlers[event] ?? []).forEach((h) => h());
        },
    };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    // Unmount first so each hook's flush-on-unmount runs against its own
    // content, then wipe storage for the next test.
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    localStorage.clear();
});

function setup(draftId: string | undefined, markdownRef: { current: string }) {
    const editor = makeFakeEditor();
    const setMarkdown = vi.fn();
    const view = renderHook(
        (props: { draftId: string | undefined }) =>
            useComposerDraft({
                draftId: props.draftId,
                editor: editor as unknown as Editor,
                getMarkdown: () => markdownRef.current,
                setMarkdown,
            }),
        { initialProps: { draftId } },
    );
    return { editor, setMarkdown, view };
}

describe("useComposerDraft", () => {
    it("loads an existing draft into the editor on mount", () => {
        setDraft("room:1", "saved text");
        const md = { current: "" };
        const { setMarkdown } = setup("room:1", md);
        expect(setMarkdown).toHaveBeenCalledWith("saved text", {
            emitUpdate: false,
        });
    });

    it("loads empty content when the room has no draft", () => {
        const md = { current: "" };
        const { setMarkdown } = setup("room:1", md);
        expect(setMarkdown).toHaveBeenCalledWith("", { emitUpdate: false });
    });

    it("debounce-saves edits to the current draft id", () => {
        const md = { current: "" };
        const { editor } = setup("room:1", md);

        md.current = "typing a draft";
        act(() => {
            editor.emit("update");
            vi.advanceTimersByTime(400);
        });

        expect(getDraft("room:1")).toBe("typing a draft");
    });

    it("flushes the outgoing draft and loads the incoming one on id change", () => {
        const md = { current: "" };
        const { setMarkdown, view } = setup("room:1", md);
        setDraft("room:2", "room two text");

        md.current = "unsent in room one";
        act(() => {
            view.rerender({ draftId: "room:2" });
        });

        // Outgoing room's content was flushed...
        expect(getDraft("room:1")).toBe("unsent in room one");
        // ...and room 2's stored draft was loaded into the editor.
        expect(setMarkdown).toHaveBeenLastCalledWith("room two text", {
            emitUpdate: false,
        });
    });

    it("clearDraft removes the current room's draft", () => {
        setDraft("room:1", "to be cleared");
        const md = { current: "to be cleared" };
        const { view } = setup("room:1", md);

        act(() => {
            view.result.current.clearDraft();
        });

        expect(getDraft("room:1")).toBe("");
    });

    it("does nothing when draftId is undefined", () => {
        const md = { current: "anything" };
        const { editor } = setup(undefined, md);

        md.current = "should not persist";
        act(() => {
            editor.emit("update");
            vi.advanceTimersByTime(400);
        });

        // Nothing was written under any id.
        expect(localStorage.getItem("workdash:composerDrafts")).toBeNull();
    });
});
