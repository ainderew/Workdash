import { useCallback, useState } from "react";
import type { ChatV2Message } from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";
import { toast } from "sonner";

function useMessageEdit(roomId: string | null) {
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null,
    );

    const startEdit = useCallback((message: ChatV2Message) => {
        if (message.deletedAt || message.messageType === "SYSTEM") return;
        setEditingMessageId(message.id);
    }, []);

    const cancelEdit = useCallback(() => setEditingMessageId(null), []);

    const saveEdit = useCallback(
        async (messageId: string, content: string) => {
            if (!roomId) return;
            try {
                const service = ChatV2Service.getInstance();
                await service.editMessage(roomId, messageId, content);
                setEditingMessageId(null);
            } catch (error) {
                toast.error("Failed to edit message", {
                    description:
                        error instanceof Error
                            ? error.message
                            : "Please try again.",
                });
            }
        },
        [roomId],
    );

    return { editingMessageId, startEdit, cancelEdit, saveEdit };
}

export default useMessageEdit;
