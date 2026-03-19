import { useCallback, useEffect, useMemo, useState } from "react";
import type { MentionSuggestion } from "../MentionSuggestionFlyout";
import type { CustomEmoji } from "@/common/store/customEmojiStore";
import type { BotCommandEntry } from "../BotCommandAutocomplete";
import { useBotCommandSearch } from "../BotCommandAutocomplete";
import { useCustomEmojiSearch } from "@/common/hooks/useCustomEmojiSearch";
import {
    getMentionQueryAtCursor,
    insertMentionIntoValue,
} from "@/communication/chatV2/mentionUtils";
import { getDisplayName, getNameAliases } from "@/common/utils/displayName";
import type { ChatV2RoomMember } from "@/communication/chatV2/_types";
import {
    getEveryoneCooldownRemaining,
    subscribeEveryoneCooldown,
} from "@/communication/chatV2/everyoneCooldown";

const MAX_MENTION_SUGGESTIONS = 25;
export const EVERYONE_SENTINEL_ID = -1;

interface UseAutocompleteArgs {
    members?: ChatV2RoomMember[];
    value: string;
    setValue: (v: string) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    selectedWorkspaceId: string | null;
    localBackendUserId?: number;
    roomId?: string | null;
}

export function useAutocomplete({
    members,
    value,
    setValue,
    textareaRef,
    selectedWorkspaceId,
    localBackendUserId,
    roomId,
}: UseAutocompleteArgs) {
    const [everyoneCooldownSeconds, setEveryoneCooldownSeconds] = useState(
        () => (roomId ? getEveryoneCooldownRemaining(roomId) : 0),
    );

    useEffect(() => {
        if (!roomId) return;
        const tick = () => {
            setEveryoneCooldownSeconds(getEveryoneCooldownRemaining(roomId));
        };
        tick();
        const unsubscribe = subscribeEveryoneCooldown(tick);
        const interval = setInterval(tick, 1000);
        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [roomId]);

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

    const mentionSuggestions = useMemo<MentionSuggestion[]>(() => {
        if (!mentionQuery || !members) return [];

        const queryLower = mentionQuery.query.toLowerCase();
        const results: MentionSuggestion[] = [];

        if ("everyone".startsWith(queryLower)) {
            results.push({
                userId: EVERYONE_SENTINEL_ID,
                name: "everyone",
                fullName: "Notify all members in this channel",
                nickname: null,
                image: null,
                cooldownSeconds: everyoneCooldownSeconds > 0 ? everyoneCooldownSeconds : undefined,
            });
        }

        const memberResults = members
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
            .map((member) => ({
                userId: member.userId,
                name: getDisplayName(member.user, `User ${member.userId}`),
                fullName: member.user.name,
                nickname: member.user.nickname ?? null,
                image: member.user.image ?? null,
            }));

        return [...results, ...memberResults].slice(0, MAX_MENTION_SUGGESTIONS);
    }, [members, mentionQuery, localBackendUserId, everyoneCooldownSeconds]);

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

    const closeEmojiFlyout = useCallback(() => {
        setEmojiQuery(null);
        setEmojiSelectedIndex(0);
    }, []);

    const closeCommandFlyout = useCallback(() => {
        setCommandQuery(null);
        setCommandSelectedIndex(0);
    }, []);

    const closeMentionFlyout = useCallback(() => {
        setMentionQuery(null);
        setMentionSelectedIndex(0);
    }, []);

    const handleEmojiSelect = useCallback(
        (emoji: CustomEmoji) => {
            if (!emojiQuery) return;

            const textarea = textareaRef.current;
            const cursorPos = textarea?.selectionStart ?? value.length;

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
        [closeEmojiFlyout, emojiQuery, value, setValue, textareaRef],
    );

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
        [closeCommandFlyout, setValue, textareaRef],
    );

    const handleMentionSelect = useCallback(
        (suggestion: MentionSuggestion) => {
            if (!mentionQuery) return;
            if (suggestion.cooldownSeconds && suggestion.cooldownSeconds > 0) return;

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
        [closeMentionFlyout, mentionQuery, value, setValue, textareaRef],
    );

    const handleAutocompleteChange = useCallback(
        (nextValue: string, cursorPos: number) => {
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
        [closeMentionFlyout, closeEmojiFlyout, closeCommandFlyout],
    );

    const handleAutocompleteKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
            if (isCommandFlyoutOpen) {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setCommandSelectedIndex((c) =>
                        c < commandSuggestions.length - 1 ? c + 1 : 0,
                    );
                    return true;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setCommandSelectedIndex((c) =>
                        c > 0 ? c - 1 : commandSuggestions.length - 1,
                    );
                    return true;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    const selected = commandSuggestions[commandSelectedIndex];
                    if (selected) handleCommandSelect(selected);
                    return true;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeCommandFlyout();
                    return true;
                }
            }

            if (isEmojiFlyoutOpen) {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setEmojiSelectedIndex((c) =>
                        c < emojiSuggestions.length - 1 ? c + 1 : 0,
                    );
                    return true;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setEmojiSelectedIndex((c) =>
                        c > 0 ? c - 1 : emojiSuggestions.length - 1,
                    );
                    return true;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    const selected = emojiSuggestions[emojiSelectedIndex];
                    if (selected) handleEmojiSelect(selected);
                    return true;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeEmojiFlyout();
                    return true;
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
                    return true;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setMentionSelectedIndex((current) =>
                        current > 0
                            ? current - 1
                            : mentionSuggestions.length - 1,
                    );
                    return true;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    const selected = mentionSuggestions[mentionSelectedIndex];
                    if (selected) handleMentionSelect(selected);
                    return true;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeMentionFlyout();
                    return true;
                }
            }

            return false;
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
        ],
    );

    return {
        // Cooldown
        everyoneCooldownSeconds,
        // Flyout state
        mentionQuery,
        emojiQuery,
        commandQuery,
        mentionSelectedIndex,
        emojiSelectedIndex,
        commandSelectedIndex,
        mentionSuggestions,
        emojiSuggestions,
        commandSuggestions,
        isMentionFlyoutOpen,
        isEmojiFlyoutOpen,
        isCommandFlyoutOpen,
        // Handlers
        handleAutocompleteChange,
        handleAutocompleteKeyDown,
        handleMentionSelect,
        handleEmojiSelect,
        handleCommandSelect,
        closeMentionFlyout,
        closeEmojiFlyout,
        closeCommandFlyout,
    };
}
