import { useCallback } from 'react';
import type {
  ChatV2CreateAttachment,
  PendingMessage,
} from '@/communication/chatV2/_types';
import type { MentionMemberNameMap } from '@/communication/chatV2/mentionUtils';
import { serializeMentionContentForSend } from '@/communication/chatV2/mentionUtils';
import useCustomEmojiStore from '@/common/store/customEmojiStore';
import useChatV2Store from '@/common/store/chatV2Store';

interface UseSendMessageArgs {
  getContent: () => string;
  clearContent: () => void;
  takeReadyAttachments: () => ChatV2CreateAttachment[] | null;
  hasActiveUploads: boolean;
  hasFailedUploads: boolean;
  setSubmitError: (e: string | null) => void;
  roomId: string | null;
  disabled?: boolean;
  isSending?: boolean;
  memberNameMap: MentionMemberNameMap;
  closeMentionFlyout: () => void;
  focusInput: () => void;
  onSend: (
    content: string,
    attachments?: ChatV2CreateAttachment[],
    options?: {
      mentionedUserIds?: number[];
      clientMessageId?: string;
      replyToMessageId?: string | null;
    },
  ) => Promise<void> | void;
  replyToMessageId?: string | null;
  selectedWorkspaceId: string | null;
}

const generateClientMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function useSendMessage({
  getContent,
  clearContent,
  takeReadyAttachments,
  hasActiveUploads,
  hasFailedUploads,
  setSubmitError,
  roomId,
  disabled,
  isSending,
  memberNameMap,
  closeMentionFlyout,
  focusInput,
  onSend,
  replyToMessageId,
  selectedWorkspaceId,
}: UseSendMessageArgs) {
  const serializeCustomEmojis = useCallback(
    (text: string): string => {
      const emojis =
        useCustomEmojiStore.getState().emojisByWorkspace[
          selectedWorkspaceId ?? ''
        ] ?? [];
      if (emojis.length === 0) return text;
      const emojiMap = new Map(emojis.map((e) => [e.name, e]));
      return text.replace(
        /:([a-z0-9_]{2,32}):/g,
        (match, name: string) => {
          const emoji = emojiMap.get(name);
          return emoji ? `<:${emoji.name}:${emoji.id}>` : match;
        },
      );
    },
    [selectedWorkspaceId],
  );

  const submit = useCallback(async () => {
    if (disabled || isSending || !roomId) return;

    if (hasActiveUploads) {
      setSubmitError('Waiting for uploads to finish');
      return;
    }
    if (hasFailedUploads) {
      setSubmitError('Retry or remove the failed uploads before sending');
      return;
    }

    const rawContent = getContent();
    const serializedMentionContent = serializeMentionContentForSend(
      rawContent,
      memberNameMap,
    );
    const content = serializeCustomEmojis(
      serializedMentionContent.content.trim(),
    );

    const ready = takeReadyAttachments();
    if (ready === null) {
      setSubmitError('Waiting for uploads to finish');
      return;
    }

    if (!content && ready.length === 0) return;

    setSubmitError(null);

    const clientMessageId = generateClientMessageId();
    const pendingMessage: PendingMessage = {
      clientMessageId,
      roomId,
      content,
      createdAt: new Date().toISOString(),
      mentionedUserIds: serializedMentionContent.mentionedUserIds,
      uploads: [],
      attachments: ready,
      replyToMessageId: replyToMessageId ?? null,
      status: 'sending',
      error: null,
    };

    const store = useChatV2Store.getState();
    store.addPendingMessage(pendingMessage);

    clearContent();
    closeMentionFlyout();

    try {
      await onSend(
        content,
        ready.length > 0 ? ready : undefined,
        {
          ...(serializedMentionContent.mentionedUserIds.length > 0 && {
            mentionedUserIds: serializedMentionContent.mentionedUserIds,
          }),
          clientMessageId,
          ...(replyToMessageId ? { replyToMessageId } : {}),
        },
      );
      // Server reconciliation drops the pending entry on realtime receipt.
    } catch (error) {
      useChatV2Store
        .getState()
        .markPendingMessageFailed(
          roomId,
          clientMessageId,
          error instanceof Error ? error.message : 'Failed to send message',
        );
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to send message',
      );
    } finally {
      window.requestAnimationFrame(() => {
        const editorEl = document.querySelector('.tiptap-editor');
        if (!editorEl?.contains(document.activeElement)) {
          focusInput();
        }
      });
    }
  }, [
    disabled,
    isSending,
    roomId,
    hasActiveUploads,
    hasFailedUploads,
    getContent,
    memberNameMap,
    serializeCustomEmojis,
    takeReadyAttachments,
    setSubmitError,
    clearContent,
    closeMentionFlyout,
    onSend,
    replyToMessageId,
    focusInput,
  ]);

  const submitGif = useCallback(
    async (gifUrl: string) => {
      if (!gifUrl.trim() || disabled || isSending || !roomId) return;

      setSubmitError(null);

      try {
        await onSend(gifUrl);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Failed to send GIF',
        );
      } finally {
        window.requestAnimationFrame(() => {
          focusInput();
        });
      }
    },
    [disabled, isSending, roomId, setSubmitError, onSend, focusInput],
  );

  return { submit, submitGif };
}
