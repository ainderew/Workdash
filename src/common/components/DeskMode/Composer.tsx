import React, { useCallback, useMemo, useRef, useState } from "react";
import { SendHorizontal, Sticker } from "lucide-react";
import { useClipboardImagePaste } from "./hooks/useClipboardImagePaste";
import { AttachmentPreview } from "./AttachmentPreview";
import { toast } from "sonner";
import type {
    ChatV2CreateAttachment,
    ChatV2RoomMember,
} from "@/communication/chatV2/_types";
import { uploadChatFileForMessage } from "@/communication/chatV2/uploadService";
import {
    buildMemberNameMap,
    getMentionQueryAtCursor,
    insertMentionIntoValue,
    serializeMentionContentForSend,
} from "@/communication/chatV2/mentionUtils";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import DeskGifPicker from "./DeskGifPicker";
import MentionSuggestionFlyout, {
    type MentionSuggestion,
} from "./MentionSuggestionFlyout";
import EmojiAutocompleteFlyout from "./EmojiAutocompleteFlyout";
import {
    BotCommandFlyout,
    useBotCommandSearch,
    type BotCommandEntry,
} from "./BotCommandAutocomplete";
import { getDisplayName, getNameAliases } from "@/common/utils/displayName";
import { useCustomEmojiSearch } from "@/common/hooks/useCustomEmojiSearch";
import useCustomEmojiStore from "@/common/store/customEmojiStore";
import type { CustomEmoji } from "@/common/store/customEmojiStore";

function PlusSolidIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path
                fill="currentColor"
                d="M10.9 4.2h2.2v5.7h5.7v2.2h-5.7v5.7h-2.2v-5.7H5.2V9.9h5.7V4.2Z"
            />
        </svg>
    );
}

function GifBadgeIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <rect
                x="2.5"
                y="5.5"
                width="19"
                height="13"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <text
                x="12"
                y="14.2"
                textAnchor="middle"
                fill="currentColor"
                fontSize="6.2"
                fontWeight="700"
                fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
            >
                GIF
            </text>
        </svg>
    );
}

const MAX_MENTION_SUGGESTIONS = 25;

interface ComposerProps {
    roomId: string | null;
    disabled?: boolean;
    isSending?: boolean;
    inputId?: string;
    placeholder?: string;
    members?: ChatV2RoomMember[];
    onSend: (
        content: string,
        attachments?: ChatV2CreateAttachment[],
        options?: { mentionedUserIds?: number[] },
    ) => Promise<void> | void;
    onEditLastMessage?: () => void;
    onTyping?: () => void;
}

function Composer({
    roomId,
    disabled,
    isSending,
    inputId = "desk-chat-input",
    placeholder = "Message room",
    members,
    onSend,
    onEditLastMessage,
    onTyping,
}: ComposerProps) {
    const backendUser = useUserStore((s) => s.backendUser);
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const [value, setValue] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [mentionQuery, setMentionQuery] = useState<{
        query: string;
        atIndex: number;
    } | null>(null);
    const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
    const [emojiQuery, setEmojiQuery] = useState<{
        query: string;
        colonIndex: number;
    } | null>(null);
    const [emojiSelectedIndex, setEmojiSelectedIndex] = useState(0);
    const [commandQuery, setCommandQuery] = useState<string | null>(null);
    const [commandSelectedIndex, setCommandSelectedIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleImagePaste = useCallback((file: File) => {
        setSelectedFile(file);
        setUploadError(null);
    }, []);

    const { handlePaste } = useClipboardImagePaste({
        onImagePaste: handleImagePaste,
    });
    const inputElementId = inputId;
    const inlineActionButtonClassName =
        "group/inline relative z-[99] h-9 w-9 shrink-0 rounded-full overflow-hidden text-[var(--wd-text-muted)] transition-colors duration-300 hover:text-white focus-visible:text-white disabled:opacity-55 disabled:cursor-not-allowed";

    const localBackendUserId = backendUser?.id;

    const memberNameMap = useMemo(
        () => buildMemberNameMap(members || [], localBackendUserId),
        [members, localBackendUserId],
    );

    const mentionSuggestions = useMemo<MentionSuggestion[]>(() => {
        if (!mentionQuery || !members) return [];

        const queryLower = mentionQuery.query.toLowerCase();

        return members
            .filter((member) => {
                if (member.status !== "ACTIVE") return false;
                if (
                    typeof localBackendUserId === "number" &&
                    member.userId === localBackendUserId
                ) {
                    return false;
                }
                const aliases = getNameAliases({
                    nickname: member.user.nickname,
                    name: member.user.name,
                });
                if (aliases.length === 0) return false;
                return aliases.some((alias) =>
                    alias.toLowerCase().includes(queryLower),
                );
            })
            .slice(0, MAX_MENTION_SUGGESTIONS)
            .map((member) => ({
                userId: member.userId,
                name: getDisplayName(member.user, `User ${member.userId}`),
                fullName: member.user.name,
                nickname: member.user.nickname ?? null,
                image: member.user.image ?? null,
            }));
    }, [members, mentionQuery, localBackendUserId]);

    const emojiSuggestions = useCustomEmojiSearch(
        selectedWorkspaceId,
        emojiQuery?.query ?? "",
    );

    const commandSuggestions = useBotCommandSearch(commandQuery ?? "");

    const isEmojiFlyoutOpen =
        emojiQuery !== null && emojiSuggestions.length > 0;

    const isMentionFlyoutOpen =
        mentionQuery !== null && mentionSuggestions.length > 0;

    const isCommandFlyoutOpen =
        commandQuery !== null && commandSuggestions.length > 0;

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

    const closeEmojiFlyout = useCallback(() => {
        setEmojiQuery(null);
        setEmojiSelectedIndex(0);
    }, []);

    const handleEmojiSelect = useCallback(
        (emoji: CustomEmoji) => {
            if (!emojiQuery) return;

            const textarea = textareaRef.current;
            const cursorPos = textarea?.selectionStart ?? value.length;

            // Replace :query with :name: (human-readable shortcode)
            const before = value.slice(0, emojiQuery.colonIndex);
            const after = value.slice(cursorPos);
            const shortcode = `:${emoji.name}: `;
            const newValue = before + shortcode + after;
            const newCursorPos = before.length + shortcode.length;

            setValue(newValue);
            closeEmojiFlyout();

            window.requestAnimationFrame(() => {
                const input = textareaRef.current;
                if (input) {
                    input.focus();
                    input.setSelectionRange(newCursorPos, newCursorPos);
                }
            });
        },
        [closeEmojiFlyout, emojiQuery, value],
    );

    const closeCommandFlyout = useCallback(() => {
        setCommandQuery(null);
        setCommandSelectedIndex(0);
    }, []);

    const handleCommandSelect = useCallback(
        (entry: BotCommandEntry) => {
            const commandText = `/${entry.command} `;
            setValue(commandText);
            closeCommandFlyout();

            window.requestAnimationFrame(() => {
                const input = textareaRef.current;
                if (input) {
                    input.focus();
                    input.setSelectionRange(
                        commandText.length,
                        commandText.length,
                    );
                }
            });
        },
        [closeCommandFlyout],
    );

    const closeMentionFlyout = useCallback(() => {
        setMentionQuery(null);
        setMentionSelectedIndex(0);
    }, []);

    const handleMentionSelect = useCallback(
        (suggestion: MentionSuggestion) => {
            if (!mentionQuery) return;

            const textarea = textareaRef.current;
            const cursorPos = textarea?.selectionStart ?? value.length;

            const { newValue, newCursorPosition } = insertMentionIntoValue(
                value,
                mentionQuery.atIndex,
                cursorPos,
                suggestion.name,
            );

            setValue(newValue);
            closeMentionFlyout();

            window.requestAnimationFrame(() => {
                const input = textareaRef.current;
                if (input) {
                    input.focus();
                    input.setSelectionRange(
                        newCursorPosition,
                        newCursorPosition,
                    );
                }
            });
        },
        [closeMentionFlyout, mentionQuery, value],
    );

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const nextValue = event.target.value;
            setValue(nextValue);

            if (nextValue.length > 0) {
                onTyping?.();
            }

            const cursorPos = event.target.selectionStart;

            // Check for /command autocomplete — only when "/" is the first char
            const slashMatch = nextValue.match(/^\/([a-z0-9]*)/);
            if (slashMatch && cursorPos <= slashMatch[0].length) {
                setCommandQuery(slashMatch[1]);
                setCommandSelectedIndex(0);
                closeMentionFlyout();
                closeEmojiFlyout();
                return;
            }
            closeCommandFlyout();

            const query = getMentionQueryAtCursor(nextValue, cursorPos);
            if (query) {
                setMentionQuery(query);
                setMentionSelectedIndex(0);
                closeEmojiFlyout();
            } else {
                closeMentionFlyout();

                // Check for :emoji autocomplete trigger (don't match closed :name:)
                const beforeCursor = nextValue.slice(0, cursorPos);
                const colonMatch = beforeCursor.match(/:([a-z0-9_]{2,32})$/);
                if (colonMatch) {
                    const colonIndex = cursorPos - colonMatch[0].length;
                    const charBefore = colonIndex > 0 ? nextValue[colonIndex - 1] : '';
                    if (charBefore !== '<') {
                        setEmojiQuery({ query: colonMatch[1], colonIndex });
                        setEmojiSelectedIndex(0);
                    } else {
                        closeEmojiFlyout();
                    }
                } else {
                    closeEmojiFlyout();
                }
            }
        },
        [closeMentionFlyout, closeEmojiFlyout, closeCommandFlyout, onTyping],
    );

    const serializeCustomEmojis = useCallback(
        (text: string): string => {
            const emojis =
                useCustomEmojiStore.getState().emojisByWorkspace[
                    selectedWorkspaceId ?? ''
                ] ?? [];
            if (emojis.length === 0) return text;
            const emojiMap = new Map(emojis.map((e) => [e.name, e]));
            return text.replace(/:([a-z0-9_]{2,32}):/g, (match, name: string) => {
                const emoji = emojiMap.get(name);
                return emoji ? `<:${emoji.name}:${emoji.id}>` : match;
            });
        },
        [selectedWorkspaceId],
    );

    const submit = async () => {
        const serializedMentionContent = serializeMentionContentForSend(
            value,
            memberNameMap,
        );
        const content = serializeCustomEmojis(
            serializedMentionContent.content.trim(),
        );
        if ((!content && !selectedFile) || disabled || isSending || !roomId)
            return;

        setUploadError(null);

        // Clear input optimistically so the user isn't blocked while the
        // message (or bot command like /play) is being processed.
        const previousValue = value;
        const previousFile = selectedFile;
        setValue("");
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
            // Restore input on failure so the user doesn't lose their message
            setValue(previousValue);
            setSelectedFile(previousFile);
            setUploadError(
                error instanceof Error
                    ? error.message
                    : "Failed to upload file",
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

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            event.stopPropagation();

            if (isCommandFlyoutOpen) {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setCommandSelectedIndex((c) =>
                        c < commandSuggestions.length - 1 ? c + 1 : 0,
                    );
                    return;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setCommandSelectedIndex((c) =>
                        c > 0 ? c - 1 : commandSuggestions.length - 1,
                    );
                    return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    const selected = commandSuggestions[commandSelectedIndex];
                    if (selected) handleCommandSelect(selected);
                    return;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeCommandFlyout();
                    return;
                }
            }

            if (isEmojiFlyoutOpen) {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setEmojiSelectedIndex((c) =>
                        c < emojiSuggestions.length - 1 ? c + 1 : 0,
                    );
                    return;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setEmojiSelectedIndex((c) =>
                        c > 0 ? c - 1 : emojiSuggestions.length - 1,
                    );
                    return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    const selected = emojiSuggestions[emojiSelectedIndex];
                    if (selected) handleEmojiSelect(selected);
                    return;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeEmojiFlyout();
                    return;
                }
            }

            if (isMentionFlyoutOpen) {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setMentionSelectedIndex((current) =>
                        current < mentionSuggestions.length - 1
                            ? current + 1
                            : 0,
                    );
                    return;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setMentionSelectedIndex((current) =>
                        current > 0
                            ? current - 1
                            : mentionSuggestions.length - 1,
                    );
                    return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    const selected = mentionSuggestions[mentionSelectedIndex];
                    if (selected) {
                        handleMentionSelect(selected);
                    }
                    return;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeMentionFlyout();
                    return;
                }
            }

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
            closeCommandFlyout,
            closeEmojiFlyout,
            closeMentionFlyout,
            commandSelectedIndex,
            commandSuggestions,
            emojiSelectedIndex,
            emojiSuggestions,
            handleCommandSelect,
            handleEmojiSelect,
            handleMentionSelect,
            isCommandFlyoutOpen,
            isEmojiFlyoutOpen,
            isMentionFlyoutOpen,
            mentionSelectedIndex,
            mentionSuggestions,
            onEditLastMessage,
            submit,
            value,
        ],
    );

    return (
        <div className="min-h-[var(--wd-panel-height)] relative border-t wd-border-subtle p-4 wd-bg-panel-2">
            {isCommandFlyoutOpen && (
                <BotCommandFlyout
                    entries={commandSuggestions}
                    query={commandQuery ?? ""}
                    selectedIndex={commandSelectedIndex}
                    onSelect={handleCommandSelect}
                    onClose={closeCommandFlyout}
                />
            )}

            {isEmojiFlyoutOpen && (
                <EmojiAutocompleteFlyout
                    emojis={emojiSuggestions}
                    query={emojiQuery?.query ?? ""}
                    selectedIndex={emojiSelectedIndex}
                    onSelect={handleEmojiSelect}
                    onClose={closeEmojiFlyout}
                />
            )}

            {isMentionFlyoutOpen && (
                <MentionSuggestionFlyout
                    suggestions={mentionSuggestions}
                    query={mentionQuery?.query ?? ""}
                    selectedIndex={mentionSelectedIndex}
                    onSelect={handleMentionSelect}
                    onClose={closeMentionFlyout}
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
                <div className="mb-2 text-xs wd-text-danger">{uploadError}</div>
            )}

            <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center">
                    <div className="flex min-h-[54px] w-full items-center gap-1.5 rounded-2xl border wd-border-subtle wd-bg-panel-2 px-2 py-1">
                        <button
                            type="button"
                            onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || isSending}
                            title="Attach file"
                            className={`${inlineActionButtonClassName} self-center`}
                        >
                            <span className="pointer-events-none absolute inset-0 rounded-full scale-50 opacity-0 transition-all duration-300 ease-out bg-[radial-gradient(circle_at_30%_25%,var(--wd-accent-hover),var(--wd-accent))] group-hover/inline:scale-100 group-hover/inline:opacity-100 group-focus-visible/inline:scale-100 group-focus-visible/inline:opacity-100" />
                            <PlusSolidIcon className="relative z-10 h-5 w-5 fill-current mx-auto" />
                        </button>

                        <div className="min-w-0 flex flex-1 items-center">
                            <textarea
                                ref={textareaRef}
                                id={inputElementId}
                                value={value}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                disabled={disabled || isSending}
                                rows={1}
                                placeholder={placeholder}
                                aria-expanded={isMentionFlyoutOpen}
                                aria-autocomplete={
                                    isMentionFlyoutOpen ? "list" : undefined
                                }
                                className="min-h-[44px] text-sm max-h-36 flex-1 border-0 bg-transparent px-2 py-[11px] leading-5 shadow-none resize-none wd-text-primary outline-none focus:outline-none"
                            />
                        </div>

                        <div
                            className="relative z-[99] flex shrink-0 items-center gap-0.5 px-0.5"
                            onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setShowGifPicker((previous) => !previous)
                                }
                                disabled={disabled || isSending}
                                title="Send GIF"
                                className={inlineActionButtonClassName}
                            >
                                <span className="pointer-events-none absolute inset-0 rounded-full scale-50 opacity-0 transition-all duration-300 ease-out bg-[radial-gradient(circle_at_30%_25%,var(--wd-accent-hover),var(--wd-accent))] group-hover/inline:scale-100 group-hover/inline:opacity-100 group-focus-visible/inline:scale-100 group-focus-visible/inline:opacity-100" />
                                <GifBadgeIcon className="relative z-10 h-4.5 w-4.5 mx-auto" />
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    toast("Stickers are coming soon", {
                                        description:
                                            "This action is a placeholder for now.",
                                    })
                                }
                                disabled={disabled || isSending}
                                title="Stickers (coming soon)"
                                className={inlineActionButtonClassName}
                            >
                                <span className="pointer-events-none absolute inset-0 rounded-full scale-50 opacity-0 transition-all duration-300 ease-out bg-[radial-gradient(circle_at_30%_25%,var(--wd-accent-hover),var(--wd-accent))] group-hover/inline:scale-100 group-hover/inline:opacity-100 group-focus-visible/inline:scale-100 group-focus-visible/inline:opacity-100" />
                                <Sticker className="relative z-10 h-4.5 w-4.5 mx-auto" />
                            </button>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                            const nextFile = event.target.files?.[0] || null;
                            setSelectedFile(nextFile);
                            event.target.value = '';
                        }}
                    />
                </div>

                <button
                    type="button"
                    disabled={
                        disabled ||
                        isSending ||
                        (!value.trim() && !selectedFile)
                    }
                    onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    onClick={() => {
                        void submit();
                    }}
                    title={isSending ? "Sending..." : "Send message"}
                    aria-label={isSending ? "Sending..." : "Send message"}
                    className={inlineActionButtonClassName}
                >
                    <span className="pointer-events-none absolute inset-0 rounded-full scale-50 opacity-0 transition-all duration-300 ease-out bg-[radial-gradient(circle_at_30%_25%,var(--wd-accent-hover),var(--wd-accent))] group-hover/inline:scale-100 group-hover/inline:opacity-100 group-focus-visible/inline:scale-100 group-focus-visible/inline:opacity-100" />
                    <SendHorizontal className="relative z-10 h-4.5 w-4.5 mx-auto" />
                </button>
            </div>
        </div>
    );
}

export default Composer;
