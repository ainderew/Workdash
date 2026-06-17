/**
 * End-to-end-ish integration test for composer drafts.
 *
 * Unlike the unit test (which uses a fake editor), this mounts the REAL
 * `useTiptapEditor` + REAL `useComposerDraft` + real markdown serializer + real
 * localStorage, and drives the actual ProseMirror editor via its commands. It
 * exercises the full persistence pipeline a user would: type, switch rooms,
 * come back, refresh (remount), and send.
 */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import { useTiptapEditor } from "./useTiptapEditor";
import { useComposerDraft } from "./useComposerDraft";
import TiptapEditorContent from "./TiptapEditorContent";
import { getDraft, setDraft } from "@/common/utils/composerDrafts";

let tiptapApi: ReturnType<typeof useTiptapEditor> | null = null;
let draftApi: ReturnType<typeof useComposerDraft> | null = null;

function Harness({
    draftId,
    onTyping,
}: {
    draftId: string | undefined;
    onTyping?: () => void;
}) {
    const tiptap = useTiptapEditor({
        placeholder: "",
        onSubmit: () => {},
        onTyping,
    });
    const draft = useComposerDraft({
        draftId,
        editor: tiptap.editor,
        getMarkdown: tiptap.getMarkdownContent,
        setMarkdown: tiptap.setContentFromMarkdown,
    });
    tiptapApi = tiptap;
    draftApi = draft;
    return <TiptapEditorContent editor={tiptap.editor} inputElementId="x" />;
}

afterEach(() => {
    cleanup();
    localStorage.clear();
    tiptapApi = null;
    draftApi = null;
});

async function waitForEditor() {
    await waitFor(() => expect(tiptapApi?.editor).toBeTruthy());
}

function type(text: string) {
    act(() => {
        tiptapApi!.editor!.commands.insertContent(text);
    });
}

function currentText() {
    return tiptapApi!.getMarkdownContent();
}

describe("composer drafts (real editor integration)", () => {
    it("persists typed text to the room's draft", async () => {
        render(<Harness draftId="room:a" />);
        await waitForEditor();

        type("hello from A");

        await waitFor(() => expect(getDraft("room:a")).toContain("hello from A"));
    });

    it("swaps drafts when the room changes and restores on return", async () => {
        const { rerender } = render(<Harness draftId="room:a" />);
        await waitForEditor();
        type("draft for A");
        await waitFor(() => expect(getDraft("room:a")).toContain("draft for A"));

        // Switch to room B → editor clears, A's text is preserved in storage.
        act(() => rerender(<Harness draftId="room:b" />));
        await waitFor(() => expect(currentText()).not.toContain("draft for A"));

        type("draft for B");
        await waitFor(() => expect(getDraft("room:b")).toContain("draft for B"));

        // Back to room A → A's text is restored into the editor.
        act(() => rerender(<Harness draftId="room:a" />));
        await waitFor(() => expect(currentText()).toContain("draft for A"));
        expect(currentText()).not.toContain("draft for B");
    });

    it("restores a draft after a remount (page refresh)", async () => {
        render(<Harness draftId="room:a" />);
        await waitForEditor();
        type("survives refresh");
        await waitFor(() =>
            expect(getDraft("room:a")).toContain("survives refresh"),
        );

        // Simulate a refresh: tear down and mount fresh against the same room.
        cleanup();
        tiptapApi = null;
        render(<Harness draftId="room:a" />);
        await waitForEditor();

        await waitFor(() => expect(currentText()).toContain("survives refresh"));
    });

    it("clears the draft on send and does not resurrect it", async () => {
        render(<Harness draftId="room:a" />);
        await waitForEditor();
        type("about to send");
        await waitFor(() => expect(getDraft("room:a")).toContain("about to send"));

        // Simulate a send: the composer clears the editor and the draft.
        act(() => {
            tiptapApi!.editor!.commands.clearContent();
            draftApi!.clearDraft();
        });

        expect(getDraft("room:a")).toBe("");

        // Remounting must not bring the sent text back.
        cleanup();
        tiptapApi = null;
        render(<Harness draftId="room:a" />);
        await waitForEditor();
        expect(currentText()).not.toContain("about to send");
    });

    it("preserves markdown formatting through a save/restore round-trip", async () => {
        const { rerender } = render(<Harness draftId="room:a" />);
        await waitForEditor();
        type("a **bold** word");
        await waitFor(() => expect(getDraft("room:a")).toContain("**bold**"));

        act(() => rerender(<Harness draftId="room:b" />));
        await waitFor(() => expect(currentText()).not.toContain("bold"));

        act(() => rerender(<Harness draftId="room:a" />));
        await waitFor(() => expect(currentText()).toContain("**bold**"));
    });

    it("does not fire a typing signal when loading a draft on room switch", async () => {
        setDraft("room:b", "draft for B");
        const onTyping = vi.fn();

        const { rerender } = render(
            <Harness draftId="room:a" onTyping={onTyping} />,
        );
        await waitForEditor();
        // Ignore any editor-creation noise from the initial mount; we only care
        // that the *switch* is silent.
        onTyping.mockClear();

        act(() => rerender(<Harness draftId="room:b" onTyping={onTyping} />));
        await waitFor(() => expect(currentText()).toContain("draft for B"));
        expect(onTyping).not.toHaveBeenCalled();

        // Actual typing still emits the signal.
        type(" and more");
        await waitFor(() => expect(onTyping).toHaveBeenCalled());
    });

    it("does not persist anything when draftId is undefined", async () => {
        render(<Harness draftId={undefined} />);
        await waitForEditor();
        type("ephemeral");

        // Give any debounce a chance to (not) fire.
        await new Promise((r) => setTimeout(r, 500));
        expect(localStorage.getItem("workdash:composerDrafts")).toBeNull();
    });
});
