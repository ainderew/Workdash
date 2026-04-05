import React, { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { AttachmentPreview } from "../AttachmentPreview";
import DeskGifPicker from "../DeskGifPicker";
import EmojiPicker from "../EmojiPicker";
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
import { useFileDrop } from "./useFileDrop";
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
        showEmojiPicker,
        setShowEmojiPicker,
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
        disabled,
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

    const handleFileDrop = useCallback(
        (file: File) => {
            setSelectedFile(file);
            setUploadError(null);
        },
        [setSelectedFile, setUploadError],
    );

    const { isDraggingOver, dragHandlers } = useFileDrop(handleFileDrop);

    const handleLinkClick = useCallback(() => {
        setShowLinkPopover((prev) => !prev);
    }, []);

    const handleToggleEmojiPicker = useCallback(() => {
        setShowEmojiPicker((prev) => !prev);
    }, [setShowEmojiPicker]);

    const handleEmojiSelect = useCallback(
        (emoji: string) => {
            if (!tiptap.editor) return;
            tiptap.editor.chain().focus().insertContent(emoji).run();
        },
        [tiptap.editor],
    );

    return (
        <div
            className="relative min-h-[var(--wd-panel-height)] wd-bg-panel-2 px-3 pb-3 pt-2"
            {...dragHandlers}
        >
            {isDraggingOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--wd-accent)] bg-[var(--wd-accent)]/10 pointer-events-none">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--wd-accent)]">
                        <Upload size={16} />
                        Drop to upload
                    </div>
                </div>
            )}

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

            {showEmojiPicker && (
                <div className="absolute bottom-full right-0 z-50 mb-2">
                    <EmojiPicker
                        onSelect={handleEmojiSelect}
                        onClose={() => setShowEmojiPicker(false)}
                    />
                </div>
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
                onToggleEmojiPicker={handleToggleEmojiPicker}
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
