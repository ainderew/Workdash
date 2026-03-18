import { useCallback, useMemo, useRef, useState } from "react";
import { buildMemberNameMap } from "@/communication/chatV2/mentionUtils";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { useClipboardImagePaste } from "../hooks/useClipboardImagePaste";
import type { ComposerProps } from "./_types";

export function useComposerState(props: ComposerProps) {
    const { inputId = "desk-chat-input" } = props;

    const backendUser = useUserStore((s) => s.backendUser);
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);

    const [value, setValue] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showGifPicker, setShowGifPicker] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const { handlePaste } = useClipboardImagePaste({
        onImagePaste: handleImagePaste,
    });

    const focusInput = useCallback(() => {
        if (typeof document === "undefined") return;
        const input = document.getElementById(
            inputElementId,
        ) as HTMLTextAreaElement | null;
        if (!input) return;

        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
    }, [inputElementId]);

    return {
        value,
        setValue,
        selectedFile,
        setSelectedFile,
        uploadError,
        setUploadError,
        showGifPicker,
        setShowGifPicker,
        fileInputRef,
        textareaRef,
        inputElementId,
        localBackendUserId,
        selectedWorkspaceId,
        memberNameMap,
        handlePaste,
        focusInput,
    };
}
