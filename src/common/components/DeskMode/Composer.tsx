import React, { useCallback, useRef, useState } from "react";
import { Paperclip, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatV2CreateAttachment } from "@/communication/chatV2/_types";
import {
    initChatUpload,
    uploadFileToSignedUrl,
} from "@/communication/chatV2/uploadService";
import DeskGifPicker from "./DeskGifPicker";

interface ComposerProps {
    roomId: string | null;
    disabled?: boolean;
    isSending?: boolean;
    onSend: (
        content: string,
        attachments?: ChatV2CreateAttachment[],
    ) => Promise<void> | void;
}

function Composer({ roomId, disabled, isSending, onSend }: ComposerProps) {
    const [value, setValue] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputElementId = "desk-chat-input";

    const focusInput = useCallback(() => {
        if (typeof document === "undefined") return;
        const input = document.getElementById(inputElementId) as HTMLTextAreaElement | null;
        if (!input) return;

        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
    }, []);

    const submit = async () => {
        const content = value.trim();
        if ((!content && !selectedFile) || disabled || isSending || !roomId) return;

        setUploadError(null);

        try {
            let attachments: ChatV2CreateAttachment[] | undefined;

            if (selectedFile) {
                const uploadInit = await initChatUpload({
                    roomId,
                    file: selectedFile,
                });
                await uploadFileToSignedUrl(selectedFile, uploadInit);
                attachments = [uploadInit.attachment];
            }

            await onSend(content, attachments);
            setValue("");
            setSelectedFile(null);
        } catch (error) {
            setUploadError(
                error instanceof Error ? error.message : "Failed to upload file",
            );
        } finally {
            window.requestAnimationFrame(() => {
                focusInput();
            });
        }
    };

    const submitGif = async (gifUrl: string) => {
        if (!gifUrl.trim() || disabled || isSending || !roomId) return;

        setUploadError(null);

        try {
            await onSend(gifUrl);
        } catch (error) {
            setUploadError(
                error instanceof Error ? error.message : "Failed to send GIF",
            );
        } finally {
            window.requestAnimationFrame(() => {
                focusInput();
            });
        }
    };

    return (
        <div className="relative border-t wd-border-subtle p-4 wd-bg-panel-2">
            {showGifPicker && (
                <DeskGifPicker
                    inputId={inputElementId}
                    onClose={() => setShowGifPicker(false)}
                    onSelectGif={(gifUrl) => {
                        void submitGif(gifUrl);
                    }}
                />
            )}

            {selectedFile && (
                <div className="mb-3 px-3 py-2 rounded-md wd-bg-elevated text-xs wd-text-secondary flex items-center justify-between border wd-border-subtle">
                    <span className="truncate pr-2">{selectedFile.name}</span>
                    <button
                        type="button"
                        className="wd-text-muted hover:text-[var(--wd-text-primary)]"
                        onClick={() => setSelectedFile(null)}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {uploadError && (
                <div className="mb-2 text-xs wd-text-danger">{uploadError}</div>
            )}

            <div className="flex gap-3 items-end">
                <Textarea
                    id={inputElementId}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void submit();
                        }
                    }}
                    disabled={disabled || isSending}
                    rows={2}
                    placeholder="Message room"
                    className="flex-1 wd-bg-elevated wd-border-subtle wd-text-primary resize-none"
                />

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                        const nextFile = event.target.files?.[0] || null;
                        setSelectedFile(nextFile);
                    }}
                />

                <Button
                    type="button"
                    variant="outline"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setShowGifPicker((previous) => !previous)}
                    disabled={disabled || isSending}
                    className="wd-border-subtle wd-bg-elevated hover:bg-[var(--wd-surface-base)] wd-text-secondary"
                    title="Send GIF"
                >
                    <Smile className="w-4 h-4" />
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isSending}
                    className="wd-border-subtle wd-bg-elevated hover:bg-[var(--wd-surface-base)] wd-text-secondary"
                >
                    <Paperclip className="w-4 h-4" />
                </Button>

                <Button
                    disabled={
                        disabled
                        || isSending
                        || (!value.trim() && !selectedFile)
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        void submit();
                    }}
                    className="bg-[var(--wd-accent)] hover:bg-[var(--wd-accent-hover)] text-white"
                >
                    {isSending ? "Sending..." : "Send"}
                </Button>
            </div>
        </div>
    );
}

export default Composer;
