import React, { useCallback } from "react";
import { AttachmentPreview } from "../AttachmentPreview";
import DeskGifPicker from "../DeskGifPicker";
import MentionSuggestionFlyout from "../MentionSuggestionFlyout";
import EmojiAutocompleteFlyout from "../EmojiAutocompleteFlyout";
import { BotCommandFlyout } from "../BotCommandAutocomplete";
import ComposerInput from "./ComposerInput";
import ComposerActions from "./ComposerActions";
import { useComposerState } from "./useComposerState";
import { useAutocomplete } from "./useAutocomplete";
import { useSendMessage } from "./useSendMessage";
import type { ComposerProps } from "./_types";

function Composer(props: ComposerProps) {
    const {
        roomId,
        disabled,
        isSending,
        placeholder = "Message room",
        members,
        onSend,
        onEditLastMessage,
        onTyping,
    } = props;

    const state = useComposerState(props);
    const {
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
    } = state;

    const autocomplete = useAutocomplete({
        members,
        value,
        setValue,
        textareaRef,
        selectedWorkspaceId,
        localBackendUserId,
        roomId,
    });

    const { submit, submitGif } = useSendMessage({
        value,
        setValue,
        selectedFile,
        setSelectedFile,
        setUploadError,
        roomId,
        disabled,
        isSending,
        memberNameMap,
        closeMentionFlyout: autocomplete.closeMentionFlyout,
        focusInput,
        onSend,
        selectedWorkspaceId,
    });

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const nextValue = event.target.value;
            setValue(nextValue);

            if (nextValue.length > 0) {
                onTyping?.();
            }

            autocomplete.handleAutocompleteChange(
                nextValue,
                event.target.selectionStart,
            );
        },
        [setValue, onTyping, autocomplete.handleAutocompleteChange],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            event.stopPropagation();

            if (autocomplete.handleAutocompleteKeyDown(event)) return;

            if (
                event.key === "ArrowUp" &&
                onEditLastMessage &&
                value === "" &&
                event.currentTarget.selectionStart === 0
            ) {
                event.preventDefault();
                onEditLastMessage();
                return;
            }

            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
            }
        },
        [
            autocomplete.handleAutocompleteKeyDown,
            onEditLastMessage,
            submit,
            value,
        ],
    );

    const handleToggleCodeBlock = useCallback(() => {
        const trimmed = value.trim();
        if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
            const withoutFences = trimmed.slice(3, -3);
            const firstNewline = withoutFences.indexOf("\n");
            const inner =
                firstNewline >= 0
                    ? withoutFences.slice(firstNewline + 1).trim()
                    : withoutFences.trim();
            setValue(inner);
        } else {
            setValue(`\`\`\`\n${value}\n\`\`\``);
        }
        textareaRef.current?.focus();
    }, [value, setValue, textareaRef]);

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const nextFile = event.target.files?.[0] || null;
            setSelectedFile(nextFile);
            event.target.value = "";
        },
        [setSelectedFile],
    );

    return (
        <div className="min-h-[var(--wd-panel-height)] relative border-t wd-border-subtle p-3 wd-bg-panel-2">
            {autocomplete.isCommandFlyoutOpen && (
                <BotCommandFlyout
                    entries={autocomplete.commandSuggestions}
                    query={autocomplete.commandQuery ?? ""}
                    selectedIndex={autocomplete.commandSelectedIndex}
                    onSelect={autocomplete.handleCommandSelect}
                    onClose={autocomplete.closeCommandFlyout}
                />
            )}

            {autocomplete.isEmojiFlyoutOpen && (
                <EmojiAutocompleteFlyout
                    emojis={autocomplete.emojiSuggestions}
                    query={autocomplete.emojiQuery?.query ?? ""}
                    selectedIndex={autocomplete.emojiSelectedIndex}
                    onSelect={autocomplete.handleEmojiSelect}
                    onClose={autocomplete.closeEmojiFlyout}
                />
            )}

            {autocomplete.isMentionFlyoutOpen && (
                <MentionSuggestionFlyout
                    suggestions={autocomplete.mentionSuggestions}
                    query={autocomplete.mentionQuery?.query ?? ""}
                    selectedIndex={autocomplete.mentionSelectedIndex}
                    onSelect={autocomplete.handleMentionSelect}
                    onClose={autocomplete.closeMentionFlyout}
                />
            )}

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
                <AttachmentPreview
                    file={selectedFile}
                    onRemove={() => setSelectedFile(null)}
                />
            )}

            {uploadError && (
                <div className="mb-2 text-xs wd-text-danger">
                    {uploadError}
                </div>
            )}

            <ComposerActions
                disabled={disabled}
                isSending={isSending}
                fileInputRef={fileInputRef}
                value={value}
                selectedFile={selectedFile}
                setShowGifPicker={setShowGifPicker}
                onFileSelect={handleFileSelect}
                onSubmit={() => void submit()}
                onToggleCodeBlock={handleToggleCodeBlock}
            >
                <ComposerInput
                    textareaRef={textareaRef}
                    inputElementId={inputElementId}
                    value={value}
                    disabled={disabled}
                    isSending={isSending}
                    placeholder={placeholder}
                    isMentionFlyoutOpen={autocomplete.isMentionFlyoutOpen}
                    handleChange={handleChange}
                    handleKeyDown={handleKeyDown}
                    handlePaste={handlePaste}
                />
            </ComposerActions>
        </div>
    );
}

export default Composer;
