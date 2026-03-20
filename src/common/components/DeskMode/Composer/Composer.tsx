import React, { useCallback, useState } from "react";
import { AttachmentPreview } from "../AttachmentPreview";
import DeskGifPicker from "../DeskGifPicker";
import MentionSuggestionFlyout from "../MentionSuggestionFlyout";
import EmojiAutocompleteFlyout from "../EmojiAutocompleteFlyout";
import { BotCommandFlyout } from "../BotCommandAutocomplete";
import TiptapEditorContent from "./TiptapEditorContent";
import FormattingToolbar from "./FormattingToolbar";
import LinkPopover from "./LinkPopover";
import ComposerActions from "./ComposerActions";
import { useComposerState } from "./useComposerState";
import { useTiptapEditor } from "./useTiptapEditor";
import { useTiptapAutocomplete } from "./useTiptapAutocomplete";
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
    } = state;

    const [showLinkPopover, setShowLinkPopover] = useState(false);

    // Create a stable submit ref that we'll wire after useSendMessage
    const submitRef = React.useRef<() => void>(() => {});

    const tiptap = useTiptapEditor({
        placeholder,
        disabled: disabled || isSending,
        onSubmit: () => submitRef.current(),
        onEditLastMessage,
        onTyping,
        onImagePaste: handleImagePaste,
        onLinkShortcut: () => setShowLinkPopover((prev) => !prev),
    });

    const autocomplete = useTiptapAutocomplete({
        editor: tiptap.editor,
        members,
        selectedWorkspaceId,
        localBackendUserId,
        roomId,
    });

    const { submit, submitGif } = useSendMessage({
        getContent: tiptap.getMarkdownContent,
        clearContent: () => {
            tiptap.editor?.commands.clearContent();
        },
        selectedFile,
        setSelectedFile,
        setUploadError,
        roomId,
        disabled,
        isSending,
        memberNameMap,
        closeMentionFlyout: autocomplete.closeMentionFlyout,
        focusInput: tiptap.focus,
        onSend,
        selectedWorkspaceId,
    });

    // Wire up the submit ref so the keyboard shortcut can call submit
    submitRef.current = () => void submit();

    const handleToggleCodeBlock = useCallback(() => {
        tiptap.editor?.chain().focus().toggleCodeBlock().run();
    }, [tiptap.editor]);

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const nextFile = event.target.files?.[0] || null;
            setSelectedFile(nextFile);
            event.target.value = "";
        },
        [setSelectedFile],
    );

    const handleLinkClick = useCallback(() => {
        setShowLinkPopover((prev) => !prev);
    }, []);

    return (
        <div className="relative min-h-[var(--wd-panel-height)] wd-bg-panel-2 px-3 pb-3 pt-2">
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
                <div className="mb-2">
                    <AttachmentPreview
                        file={selectedFile}
                        onRemove={() => setSelectedFile(null)}
                    />
                </div>
            )}

            {uploadError && (
                <div className="mb-2 text-xs wd-text-danger">{uploadError}</div>
            )}

            {showLinkPopover && tiptap.editor && (
                <LinkPopover
                    editor={tiptap.editor}
                    onClose={() => setShowLinkPopover(false)}
                />
            )}

            <ComposerActions
                disabled={disabled}
                isSending={isSending}
                fileInputRef={fileInputRef}
                editor={tiptap.editor}
                selectedFile={selectedFile}
                setShowGifPicker={setShowGifPicker}
                onFileSelect={handleFileSelect}
                onSubmit={() => void submit()}
                onToggleCodeBlock={handleToggleCodeBlock}
            >
                <TiptapEditorContent
                    editor={tiptap.editor}
                    inputElementId={inputElementId}
                />
                <FormattingToolbar
                    editor={tiptap.editor}
                    disabled={disabled || isSending}
                    onLinkClick={handleLinkClick}
                />
            </ComposerActions>
        </div>
    );
}

export default Composer;
