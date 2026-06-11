import type {
    ChatV2CreateAttachment,
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
        },
    ) => Promise<void> | void;
    /** Set when composing a thread reply — recorded on pending entries for retry */
    replyToMessageId?: string | null;
    onEditLastMessage?: () => void;
    onTyping?: () => void;
}
