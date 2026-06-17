import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { getDraft, setDraft, clearDraft } from "@/common/utils/composerDrafts";

const SAVE_DEBOUNCE_MS = 400;

interface UseComposerDraftArgs {
    /** Stable id for this composer's draft (e.g. `room:<roomId>`). */
    draftId: string | undefined;
    editor: Editor | null;
    getMarkdown: () => string;
    setMarkdown: (md: string, options?: { emitUpdate?: boolean }) => void;
}

/**
 * Persists the composer's unsent text per `draftId`. When `draftId` changes the
 * outgoing draft is flushed and the incoming one is loaded, so text follows the
 * room it was typed in and survives a refresh. Returns `clearDraft`, to call on
 * a successful send.
 *
 * No-ops entirely when `draftId` is undefined (e.g. the thread composer).
 */
export function useComposerDraft({
    draftId,
    editor,
    getMarkdown,
    setMarkdown,
}: UseComposerDraftArgs) {
    // The draft id whose content currently sits in the editor.
    const loadedIdRef = useRef<string | undefined>(undefined);
    const debounceRef = useRef<number | null>(null);

    // Keep the latest getter/setter without re-subscribing the editor listener.
    const getMarkdownRef = useRef(getMarkdown);
    getMarkdownRef.current = getMarkdown;

    const flush = () => {
        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        const id = loadedIdRef.current;
        if (id) setDraft(id, getMarkdownRef.current());
    };

    // Load the right draft when the editor mounts or the draft id changes.
    useEffect(() => {
        if (!editor) return;
        if (loadedIdRef.current === draftId) return;

        // Flush the outgoing room's content before swapping.
        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        if (loadedIdRef.current) {
            setDraft(loadedIdRef.current, getMarkdownRef.current());
        }

        // Load the incoming draft (or clear when there's none). emitUpdate:false
        // so loading doesn't fire a spurious typing signal or re-save.
        const incoming = draftId ? getDraft(draftId) : "";
        setMarkdown(incoming, { emitUpdate: false });
        loadedIdRef.current = draftId;
    }, [editor, draftId, setMarkdown]);

    // Debounced save on every edit.
    useEffect(() => {
        if (!editor) return;
        const onUpdate = () => {
            if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
            }
            debounceRef.current = window.setTimeout(() => {
                debounceRef.current = null;
                const id = loadedIdRef.current;
                if (id) setDraft(id, getMarkdownRef.current());
            }, SAVE_DEBOUNCE_MS);
        };
        editor.on("update", onUpdate);
        return () => {
            editor.off("update", onUpdate);
        };
    }, [editor]);

    // Persist the latest content if the tab closes before a debounce fires, and
    // when the composer unmounts.
    // flush reads everything via refs, so it never goes stale with empty deps.
    useEffect(() => {
        window.addEventListener("beforeunload", flush);
        return () => {
            window.removeEventListener("beforeunload", flush);
            flush();
        };
    }, []);

    return {
        clearDraft: () => {
            if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            if (loadedIdRef.current) clearDraft(loadedIdRef.current);
        },
    };
}
