import { useCallback } from 'react';
import type { ChatV2CreateAttachment } from '@/communication/chatV2/_types';
import type { MentionMemberNameMap } from '@/communication/chatV2/mentionUtils';
import { serializeMentionContentForSend } from '@/communication/chatV2/mentionUtils';
import { uploadChatFileForMessage } from '@/communication/chatV2/uploadService';
import useCustomEmojiStore from '@/common/store/customEmojiStore';

interface UseSendMessageArgs {
  getContent: () => string;
  clearContent: () => void;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  setUploadError: (e: string | null) => void;
  roomId: string | null;
  disabled?: boolean;
  isSending?: boolean;
  memberNameMap: MentionMemberNameMap;
  closeMentionFlyout: () => void;
  focusInput: () => void;
  onSend: (
    content: string,
    attachments?: ChatV2CreateAttachment[],
    options?: { mentionedUserIds?: number[] },
  ) => Promise<void> | void;
  selectedWorkspaceId: string | null;
}

export function useSendMessage({
  getContent,
  clearContent,
  selectedFiles,
  setSelectedFiles,
  setUploadError,
  roomId,
  disabled,
  isSending,
  memberNameMap,
  closeMentionFlyout,
  focusInput,
  onSend,
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
    const rawContent = getContent();
    const serializedMentionContent = serializeMentionContentForSend(
      rawContent,
      memberNameMap,
    );
    const content = serializeCustomEmojis(
      serializedMentionContent.content.trim(),
    );
    if (
      (!content && selectedFiles.length === 0) ||
      disabled ||
      isSending ||
      !roomId
    )
      return;

    setUploadError(null);

    const previousFiles = selectedFiles;
    clearContent();
    setSelectedFiles([]);
    closeMentionFlyout();

    try {
      let attachments: ChatV2CreateAttachment[] | undefined;

      if (previousFiles.length > 0) {
        const uploaded = await Promise.all(
          previousFiles.map((file) =>
            uploadChatFileForMessage(roomId, file),
          ),
        );
        attachments = uploaded.map((u) => u.attachment);
      }

      await onSend(
        content,
        attachments,
        serializedMentionContent.mentionedUserIds.length > 0
          ? {
              mentionedUserIds:
                serializedMentionContent.mentionedUserIds,
            }
          : undefined,
      );
    } catch (error) {
      // Restore the file selection so the user can retry without re-picking
      setSelectedFiles(previousFiles);
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Failed to upload file',
      );
    } finally {
      // Only re-focus if the editor lost focus (e.g. file upload dialog).
      // Avoid unconditional focus — it interrupts typing that's already
      // happening in the still-editable editor and can swallow keystrokes.
      window.requestAnimationFrame(() => {
        const editorEl = document.querySelector('.tiptap-editor');
        if (!editorEl?.contains(document.activeElement)) {
          focusInput();
        }
      });
    }
  }, [
    getContent,
    selectedFiles,
    disabled,
    isSending,
    roomId,
    memberNameMap,
    serializeCustomEmojis,
    setUploadError,
    clearContent,
    setSelectedFiles,
    closeMentionFlyout,
    onSend,
    focusInput,
  ]);

  const submitGif = useCallback(
    async (gifUrl: string) => {
      if (!gifUrl.trim() || disabled || isSending || !roomId) return;

      setUploadError(null);

      try {
        await onSend(gifUrl);
      } catch (error) {
        setUploadError(
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
    [disabled, isSending, roomId, setUploadError, onSend, focusInput],
  );

  return { submit, submitGif };
}
