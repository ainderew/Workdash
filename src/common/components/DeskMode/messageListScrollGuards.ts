import type { ChatV2Message, PendingMessage } from "@/communication/chatV2/_types";

export const isPendingMessage = (
    entry: ChatV2Message | PendingMessage,
): entry is PendingMessage =>
    typeof (entry as PendingMessage).status === "string" &&
    Array.isArray((entry as PendingMessage).uploads);

// Returns a stable identifier for the tail entry of the message list. Used by
// MessageList's scroll effect to decide whether the list's last item changed.
// Keying on clientMessageId when available collapses the pending → confirmed
// transition into a single tail identity, avoiding a double scroll on send.
export const getTailEntryId = (
    entry: ChatV2Message | PendingMessage | undefined,
): string | null => {
    if (!entry) return null;
    if (isPendingMessage(entry)) return `client:${entry.clientMessageId}`;
    if (entry.clientMessageId) return `client:${entry.clientMessageId}`;
    return `id:${entry.id}`;
};
