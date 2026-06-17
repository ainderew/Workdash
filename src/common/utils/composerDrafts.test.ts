import { afterEach, describe, expect, it } from "vitest";
import {
    COMPOSER_DRAFTS_STORAGE_KEY,
    getDraft,
    setDraft,
    clearDraft,
} from "./composerDrafts";

afterEach(() => {
    localStorage.clear();
});

describe("composerDrafts", () => {
    it("returns an empty string when no draft exists", () => {
        expect(getDraft("room:1")).toBe("");
    });

    it("round-trips a draft for an id", () => {
        setDraft("room:1", "hello **world**");
        expect(getDraft("room:1")).toBe("hello **world**");
    });

    it("keeps drafts isolated per id", () => {
        setDraft("room:1", "first");
        setDraft("room:2", "second");
        expect(getDraft("room:1")).toBe("first");
        expect(getDraft("room:2")).toBe("second");
    });

    it("removes the entry when saving empty or whitespace content", () => {
        setDraft("room:1", "draft");
        setDraft("room:1", "   ");
        expect(getDraft("room:1")).toBe("");
    });

    it("does not create an entry for empty content", () => {
        setDraft("room:1", "");
        expect(localStorage.getItem(COMPOSER_DRAFTS_STORAGE_KEY)).toBeNull();
    });

    it("clearDraft removes only the targeted id", () => {
        setDraft("room:1", "a");
        setDraft("room:2", "b");
        clearDraft("room:1");
        expect(getDraft("room:1")).toBe("");
        expect(getDraft("room:2")).toBe("b");
    });

    it("removes the storage key entirely once the last draft is gone", () => {
        setDraft("room:1", "a");
        clearDraft("room:1");
        expect(localStorage.getItem(COMPOSER_DRAFTS_STORAGE_KEY)).toBeNull();
    });

    it("survives corrupted storage by treating it as empty", () => {
        localStorage.setItem(COMPOSER_DRAFTS_STORAGE_KEY, "not json{");
        expect(getDraft("room:1")).toBe("");
        // and can still write afterward
        setDraft("room:1", "recovered");
        expect(getDraft("room:1")).toBe("recovered");
    });

    it("ignores a non-object JSON payload", () => {
        localStorage.setItem(COMPOSER_DRAFTS_STORAGE_KEY, '["a","b"]');
        expect(getDraft("room:1")).toBe("");
    });
});
