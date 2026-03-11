import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatV2RoomMember } from "@/communication/chatV2/_types";
import {
    buildMemberNameMap,
    deserializeMentionContent,
    getMentionQueryAtCursor,
    insertMentionIntoValue,
    serializeMentionContentForSend,
} from "@/communication/chatV2/mentionUtils";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import MentionSuggestionFlyout, {
    type MentionSuggestion,
} from "./MentionSuggestionFlyout";
import EmojiAutocompleteFlyout from "./EmojiAutocompleteFlyout";
import { getDisplayName, getNameAliases } from "@/common/utils/displayName";
import { useCustomEmojiSearch } from "@/common/hooks/useCustomEmojiSearch";
import useCustomEmojiStore from "@/common/store/customEmojiStore";

const MAX_MENTION_SUGGESTIONS = 25;

interface InlineMessageEditorProps {
    initialContent: string;
    members?: ChatV2RoomMember[];
    onSave: (content: string) => Promise<void>;
    onCancel: () => void;
}

function InlineMessageEditor({
    initialContent,
    members,
    onSave,
    onCancel,
}: InlineMessageEditorProps) {
    const backendUser = useUserStore((s) => s.backendUser);
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const localBackendUserId = backendUser?.id;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const memberNameMap = useMemo(
        () => buildMemberNameMap(members || []),
        [members],
    );

    const deserializedContent = useMemo(
        () => deserializeMentionContent(initialContent, memberNameMap),
        [initialContent, memberNameMap],
    );

    const [value, setValue] = useState(deserializedContent);
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

    const mentionSuggestions = useMemo<MentionSuggestion[]>(() => {
        if (!mentionQuery || !members) return [];
        const queryLower = mentionQuery.query.toLowerCase();
        return members
            .filter((member) => {
                if (member.status !== "ACTIVE") return false;
                if (
                    typeof localBackendUserId === "number" &&
                    member.userId === localBackendUserId
                )
                    return false;
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

    const isEmojiFlyoutOpen =
        emojiQuery !== null && emojiSuggestions.length > 0;
    const isMentionFlyoutOpen =
        mentionQuery !== null && mentionSuggestions.length > 0;

    const closeEmojiFlyout = useCallback(() => {
        setEmojiQuery(null);
        setEmojiSelectedIndex(0);
    }, []);

    const closeMentionFlyout = useCallback(() => {
        setMentionQuery(null);
        setMentionSelectedIndex(0);
    }, []);

    const handleEmojiSelect = useCallback(
        (emoji: { name: string; id: string }) => {
            if (!emojiQuery) return;
            const cursorPos =
                textareaRef.current?.selectionStart ?? value.length;
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

    const handleMentionSelect = useCallback(
        (suggestion: MentionSuggestion) => {
            if (!mentionQuery) return;
            const cursorPos =
                textareaRef.current?.selectionStart ?? value.length;
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
            setValidationError(null);

            const cursorPos = event.target.selectionStart;
            const query = getMentionQueryAtCursor(nextValue, cursorPos);
            if (query) {
                setMentionQuery(query);
                setMentionSelectedIndex(0);
                closeEmojiFlyout();
            } else {
                closeMentionFlyout();
                const beforeCursor = nextValue.slice(0, cursorPos);
                const colonMatch = beforeCursor.match(/:([a-z0-9_]{2,32})$/);
                if (colonMatch) {
                    const colonIndex = cursorPos - colonMatch[0].length;
                    const charBefore =
                        colonIndex > 0 ? nextValue[colonIndex - 1] : "";
                    if (charBefore !== "<") {
                        setEmojiQuery({
                            query: colonMatch[1],
                            colonIndex,
                        });
                        setEmojiSelectedIndex(0);
                    } else {
                        closeEmojiFlyout();
                    }
                } else {
                    closeEmojiFlyout();
                }
            }
        },
        [closeMentionFlyout, closeEmojiFlyout],
    );

    const serializeCustomEmojis = useCallback(
        (text: string): string => {
            const emojis =
                useCustomEmojiStore.getState().emojisByWorkspace[
                    selectedWorkspaceId ?? ""
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

    const handleSave = useCallback(async () => {
        const trimmed = value.trim();
        if (!trimmed) {
            setValidationError("Message cannot be empty");
            return;
        }

        const serialized = serializeMentionContentForSend(
            value,
            memberNameMap,
        );
        const content = serializeCustomEmojis(serialized.content.trim());

        if (content === initialContent) {
            onCancel();
            return;
        }

        setIsSaving(true);
        try {
            await onSave(content);
        } finally {
            setIsSaving(false);
        }
    }, [
        value,
        memberNameMap,
        serializeCustomEmojis,
        initialContent,
        onCancel,
        onSave,
    ]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            event.stopPropagation();

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
                    setMentionSelectedIndex((c) =>
                        c < mentionSuggestions.length - 1 ? c + 1 : 0,
                    );
                    return;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setMentionSelectedIndex((c) =>
                        c > 0 ? c - 1 : mentionSuggestions.length - 1,
                    );
                    return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    const selected = mentionSuggestions[mentionSelectedIndex];
                    if (selected) handleMentionSelect(selected);
                    return;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeMentionFlyout();
                    return;
                }
            }

            if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
                return;
            }

            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSave();
            }
        },
        [
            isEmojiFlyoutOpen,
            isMentionFlyoutOpen,
            emojiSuggestions,
            emojiSelectedIndex,
            mentionSuggestions,
            mentionSelectedIndex,
            handleEmojiSelect,
            handleMentionSelect,
            closeEmojiFlyout,
            closeMentionFlyout,
            onCancel,
            handleSave,
        ],
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(
                textarea.value.length,
                textarea.value.length,
            );
        }
    }, []);

    return (
        <div className="relative">
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

            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                rows={1}
                className="text-sm wd-text-secondary bg-[var(--wd-surface-panel-2)] border wd-border-subtle rounded-md px-2 py-1.5 w-full resize-none outline-none focus:border-[var(--wd-accent)]"
                style={{
                    minHeight: "2.25rem",
                    height: "auto",
                }}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                }}
            />

            {validationError && (
                <div className="text-[11px] text-red-400 mt-0.5">
                    {validationError}
                </div>
            )}

            <div className="text-[11px] wd-text-muted mt-1">
                escape to cancel · enter to save
            </div>
        </div>
    );
}

export default InlineMessageEditor;
