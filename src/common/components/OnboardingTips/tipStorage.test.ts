import { beforeEach, describe, expect, it } from "vitest";
import { TIPS_STORAGE_KEY } from "./constants";
import { markTipSeen, readSeenTips } from "./tipStorage";

describe("tipStorage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("reads nothing seen on a fresh browser", () => {
        expect(readSeenTips()).toEqual({});
    });

    it("keeps every retired tip across reads", () => {
        markTipSeen("chat");
        markTipSeen("world");

        expect(readSeenTips()).toEqual({ chat: true, world: true });
    });

    it("treats corrupt storage as nothing seen", () => {
        localStorage.setItem(TIPS_STORAGE_KEY, "{not json");

        expect(readSeenTips()).toEqual({});
        expect(markTipSeen("desk")).toEqual({ desk: true });
    });
});
