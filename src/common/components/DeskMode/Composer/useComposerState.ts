import { useMemo, useRef, useState } from 'react';
import { buildMemberNameMap } from '@/communication/chatV2/mentionUtils';
import useUserStore from '@/common/store/useStore';
import useChatV2Store from '@/common/store/chatV2Store';
import type { ComposerProps } from './_types';

export function useComposerState(props: ComposerProps) {
  const { inputId = 'desk-chat-input' } = props;

  const backendUser = useUserStore((s) => s.backendUser);
  const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputElementId = inputId;
  const localBackendUserId = backendUser?.id;

  const memberNameMap = useMemo(
    () => buildMemberNameMap(props.members || [], localBackendUserId),
    [props.members, localBackendUserId],
  );

  return {
    submitError,
    setSubmitError,
    showGifPicker,
    setShowGifPicker,
    showEmojiPicker,
    setShowEmojiPicker,
    fileInputRef,
    inputElementId,
    localBackendUserId,
    selectedWorkspaceId,
    memberNameMap,
  };
}
