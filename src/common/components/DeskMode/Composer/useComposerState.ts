import { useCallback, useMemo, useRef, useState } from 'react';
import { buildMemberNameMap } from '@/communication/chatV2/mentionUtils';
import useUserStore from '@/common/store/useStore';
import useChatV2Store from '@/common/store/chatV2Store';
import type { ComposerProps } from './_types';

export const MAX_ATTACHMENTS = 10;

export function useComposerState(props: ComposerProps) {
  const { inputId = 'desk-chat-input' } = props;

  const backendUser = useUserStore((s) => s.backendUser);
  const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputElementId = inputId;
  const localBackendUserId = backendUser?.id;

  const memberNameMap = useMemo(
    () => buildMemberNameMap(props.members || [], localBackendUserId),
    [props.members, localBackendUserId],
  );

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setSelectedFiles((prev) => {
      const remaining = MAX_ATTACHMENTS - prev.length;
      if (remaining <= 0) {
        setUploadError(`You can attach up to ${MAX_ATTACHMENTS} files per message`);
        return prev;
      }
      const next = files.slice(0, remaining);
      if (files.length > remaining) {
        setUploadError(`You can attach up to ${MAX_ATTACHMENTS} files per message`);
      } else {
        setUploadError(null);
      }
      return [...prev, ...next];
    });
  }, []);

  const removeFileAt = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const handleImagePaste = useCallback(
    (files: File[]) => {
      addFiles(files);
    },
    [addFiles],
  );

  return {
    selectedFiles,
    setSelectedFiles,
    addFiles,
    removeFileAt,
    clearFiles,
    uploadError,
    setUploadError,
    showGifPicker,
    setShowGifPicker,
    showEmojiPicker,
    setShowEmojiPicker,
    fileInputRef,
    inputElementId,
    localBackendUserId,
    selectedWorkspaceId,
    memberNameMap,
    handleImagePaste,
  };
}
