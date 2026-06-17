import type {
    ChatV2CreateAttachment,
    ChatV2Message,
    ChatV2RoomMember,
} from "@/communication/chatV2/_types";

export interface ComposerProps {
    roomId: string | null;
    disabled?: boolean;
    isSending?: boolean;
    inputId?: string;
    placeholder?: string;
    members?: ChatV2RoomMember[];
    onSend: (
        content: string,
        attachments?: ChatV2CreateAttachment[],
        options?: {
            mentionedUserIds?: number[];
            clientMessageId?: string;
            replyToMessageId?: string | null;
        },
    ) => Promise<void> | void;
    /** Set when composing a thread reply — recorded on pending entries for retry */
    replyToMessageId?: string | null;
    /**
     * Quick-reply target chosen from the timeline. Renders the reply context
     * bar above the input and threads the next send onto this message.
     */
    replyTarget?: ChatV2Message | null;
    onCancelReply?: () => void;
    onEditLastMessage?: () => void;
    onTyping?: () => void;
    /**
     * Stable id under which unsent text is persisted (e.g. `room:<roomId>`).
     * Omit to disable draft persistence for this composer.
     */
    draftId?: string;
}
