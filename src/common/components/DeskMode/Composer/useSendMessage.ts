import { useCallback } from 'react';
import type { ChatV2CreateAttachment } from '@/communication/chatV2/_types';
import type { MentionMemberNameMap } from '@/communication/chatV2/mentionUtils';
import { serializeMentionContentForSend } from '@/communication/chatV2/mentionUtils';
import { uploadChatFileForMessage } from '@/communication/chatV2/uploadService';
import useCustomEmojiStore from '@/common/store/customEmojiStore';

interface UseSendMessageArgs {
  getContent: () => string;
  clearContent: () => void;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
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
  selectedFile,
  setSelectedFile,
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
    if ((!content && !selectedFile) || disabled || isSending || !roomId)
      return;

    setUploadError(null);

    const previousContent = rawContent;
    const previousFile = selectedFile;
    clearContent();
    setSelectedFile(null);
    closeMentionFlyout();

    try {
      let attachments: ChatV2CreateAttachment[] | undefined;

      if (previousFile) {
        const uploaded = await uploadChatFileForMessage(
          roomId,
          previousFile,
        );
        attachments = [uploaded.attachment];
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
      // Note: with Tiptap we can't easily restore previous rich text state,
      // but we can restore the markdown string by setting content
      // For now, just report the error - the content was already serialized
      setSelectedFile(previousFile);
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Failed to upload file',
      );
      // Attempt to restore content by re-inserting the raw markdown
      if (previousContent) {
        // The clearContent already cleared the editor, so we need to signal restoration
        // This is handled by the caller if needed
      }
    } finally {
      window.requestAnimationFrame(() => {
        focusInput();
      });
    }
  }, [
    getContent,
    selectedFile,
    disabled,
    isSending,
    roomId,
    memberNameMap,
    serializeCustomEmojis,
    setUploadError,
    clearContent,
    setSelectedFile,
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
