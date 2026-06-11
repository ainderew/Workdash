import { describe, it, expect } from "vitest";
import { getTailEntryId, isPendingMessage } from "./messageListScrollGuards";
import type {
    ChatV2Message,
    PendingMessage,
} from "@/communication/chatV2/_types";

const confirmed = (
    id: string,
    overrides: Partial<ChatV2Message> = {},
): ChatV2Message =>
    ({
        id,
        roomId: "r1",
        senderUserId: 1,
        clientMessageId: "",
        content: "",
        messageType: "TEXT",
        replyToMessageId: null,
        editedAt: null,
        deletedAt: null,
        createdAt: "2026-04-19T00:00:00Z",
        attachments: [],
        ...overrides,
    }) as ChatV2Message;

const pending = (clientMessageId: string): PendingMessage => ({
    clientMessageId,
    roomId: "r1",
    content: "",
    createdAt: "2026-04-19T00:00:00Z",
    mentionedUserIds: [],
    uploads: [],
    attachments: [],
    replyToMessageId: null,
    status: "sending",
    error: null,
});

describe("isPendingMessage", () => {
    it("distinguishes pending from confirmed messages so downstream logic does not treat server messages as local sends", () => {
        expect(isPendingMessage(pending("c-1"))).toBe(true);
        expect(isPendingMessage(confirmed("msg-1"))).toBe(false);
    });
});

describe("getTailEntryId — scroll-anchor regression guard", () => {
    it("returns null for an empty tail so the scroll effect resets its ref instead of dereferencing undefined", () => {
        expect(getTailEntryId(undefined)).toBeNull();
    });

    it("returns a stable tail id when older messages are prepended so the chat does NOT snap to bottom on scroll-up (regression: scroll-up-snaps-to-bottom bug)", () => {
        const tail = confirmed("msg-tail", { clientMessageId: "client-tail" });
        const beforePrepend = [confirmed("msg-1"), tail];
        const afterPrepend = [
            confirmed("older-1"),
            confirmed("older-2"),
            ...beforePrepend,
        ];
        expect(getTailEntryId(beforePrepend.at(-1))).toBe(
            getTailEntryId(afterPrepend.at(-1)),
        );
    });

    it("collapses the pending → confirmed transition into one tail identity so send does not trigger a double scroll (regression: double-scroll-on-send)", () => {
        const clientId = "client-42";
        const pendingEntry = pending(clientId);
        const confirmedEntry = confirmed("server-id-99", {
            clientMessageId: clientId,
        });
        expect(getTailEntryId(pendingEntry)).toBe(
            getTailEntryId(confirmedEntry),
        );
        expect(getTailEntryId(pendingEntry)).toBe(`client:${clientId}`);
    });

    it("returns a new tail id when a genuinely new message is appended so the scroll-or-pill effect can fire (regression: missed new-message pill)", () => {
        const before = [confirmed("a"), confirmed("b")];
        const after = [...before, confirmed("c")];
        expect(getTailEntryId(before.at(-1))).not.toBe(
            getTailEntryId(after.at(-1)),
        );
    });

    it("falls back to the server id when a confirmed message has no clientMessageId so server-generated messages still produce a stable key (regression: empty-clientMessageId treated as equal)", () => {
        const a = confirmed("server-a", { clientMessageId: "" });
        const b = confirmed("server-b", { clientMessageId: "" });
        expect(getTailEntryId(a)).toBe("id:server-a");
        expect(getTailEntryId(b)).toBe("id:server-b");
        expect(getTailEntryId(a)).not.toBe(getTailEntryId(b));
    });
});
