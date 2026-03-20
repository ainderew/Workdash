import { useCallback, useMemo, useRef, useState } from 'react';
import { buildMemberNameMap } from '@/communication/chatV2/mentionUtils';
import useUserStore from '@/common/store/useStore';
import useChatV2Store from '@/common/store/chatV2Store';
import type { ComposerProps } from './_types';

export function useComposerState(props: ComposerProps) {
  const { inputId = 'desk-chat-input' } = props;

  const backendUser = useUserStore((s) => s.backendUser);
  const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputElementId = inputId;
  const localBackendUserId = backendUser?.id;

  const memberNameMap = useMemo(
    () => buildMemberNameMap(props.members || [], localBackendUserId),
    [props.members, localBackendUserId],
  );

  const handleImagePaste = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadError(null);
  }, []);

  return {
    selectedFile,
    setSelectedFile,
    uploadError,
    setUploadError,
    showGifPicker,
    setShowGifPicker,
    fileInputRef,
    inputElementId,
    localBackendUserId,
    selectedWorkspaceId,
    memberNameMap,
    handleImagePaste,
  };
}
