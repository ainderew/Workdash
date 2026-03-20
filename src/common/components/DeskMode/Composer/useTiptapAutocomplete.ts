import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { MentionSuggestion } from '../MentionSuggestionFlyout';
import type { CustomEmoji } from '@/common/store/customEmojiStore';
import type { BotCommandEntry } from '../BotCommandAutocomplete';
import { useBotCommandSearch } from '../BotCommandAutocomplete';
import { useCustomEmojiSearch } from '@/common/hooks/useCustomEmojiSearch';
import { getDisplayName, getNameAliases } from '@/common/utils/displayName';
import type { ChatV2RoomMember } from '@/communication/chatV2/_types';
import {
  getEveryoneCooldownRemaining,
  subscribeEveryoneCooldown,
} from '@/communication/chatV2/everyoneCooldown';

const MAX_MENTION_SUGGESTIONS = 25;
const EVERYONE_SENTINEL_ID = -1;

interface UseTiptapAutocompleteArgs {
  editor: Editor | null;
  members?: ChatV2RoomMember[];
  selectedWorkspaceId: string | null;
  localBackendUserId?: number;
  roomId?: string | null;
}

/**
 * Bridges Tiptap editor updates to the existing flyout autocomplete system.
 * Detects @mention, :emoji:, and /command triggers from the editor's text content.
 */
export function useTiptapAutocomplete({
  editor,
  members,
  selectedWorkspaceId,
  localBackendUserId,
  roomId,
}: UseTiptapAutocompleteArgs) {
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

    if ('everyone'.startsWith(queryLower)) {
      results.push({
        userId: EVERYONE_SENTINEL_ID,
        name: 'everyone',
        fullName: 'Notify all members in this channel',
        nickname: null,
        image: null,
        cooldownSeconds:
          everyoneCooldownSeconds > 0 ? everyoneCooldownSeconds : undefined,
      });
    }

    const memberResults = members
      .filter((member) => {
        if (member.status !== 'ACTIVE') return false;
        if (
          typeof localBackendUserId === 'number' &&
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
    emojiQuery?.query ?? '',
  );

  const commandSuggestions = useBotCommandSearch(commandQuery ?? '');

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

  // Listen to editor updates and detect autocomplete triggers
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      // Get the text of the current text block
      const $pos = state.doc.resolve(from);
      const textBefore = $pos.parent.textBetween(
        0,
        $pos.parentOffset,
        undefined,
        '\ufffc',
      );

      // Check for /command at start
      const slashMatch = textBefore.match(/^\/([a-z0-9]*)$/);
      if (slashMatch && $pos.parentOffset <= slashMatch[0].length) {
        setCommandQuery(slashMatch[1]);
        setCommandSelectedIndex(0);
        closeMentionFlyout();
        closeEmojiFlyout();
        return;
      }
      closeCommandFlyout();

      // Check for @mention
      const atMatch = textBefore.match(/(^|\s)@([^\s@]*)$/);
      if (atMatch) {
        const atIndex = textBefore.length - atMatch[2].length - 1; // position of @
        setMentionQuery({ query: atMatch[2], atIndex });
        setMentionSelectedIndex(0);
        closeEmojiFlyout();
        return;
      }
      closeMentionFlyout();

      // Check for :emoji:
      const colonMatch = textBefore.match(/:([a-z0-9_]{2,32})$/);
      if (colonMatch) {
        const colonIndex = textBefore.length - colonMatch[0].length;
        const charBefore = colonIndex > 0 ? textBefore[colonIndex - 1] : '';
        if (charBefore !== '<') {
          setEmojiQuery({ query: colonMatch[1], colonIndex });
          setEmojiSelectedIndex(0);
          return;
        }
      }
      closeEmojiFlyout();
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor, closeMentionFlyout, closeEmojiFlyout, closeCommandFlyout]);

  /** Replace the trigger text + query with the selected mention */
  const handleMentionSelect = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!mentionQuery || !editor) return;
      if (suggestion.cooldownSeconds && suggestion.cooldownSeconds > 0) return;

      const { state } = editor;
      const { from } = state.selection;
      const $pos = state.doc.resolve(from);
      const textBefore = $pos.parent.textBetween(
        0,
        $pos.parentOffset,
        undefined,
        '\ufffc',
      );

      // Find the @ trigger position in the document
      const atMatch = textBefore.match(/(^|\s)@([^\s@]*)$/);
      if (!atMatch) return;

      const startInParent = textBefore.length - atMatch[2].length - 1; // @ position
      const startInDoc = from - $pos.parentOffset + startInParent;
      const endInDoc = from;

      const mentionText = `@${suggestion.name} `;
      editor
        .chain()
        .focus()
        .deleteRange({ from: startInDoc, to: endInDoc })
        .insertContent(mentionText)
        .run();

      closeMentionFlyout();
    },
    [editor, mentionQuery, closeMentionFlyout],
  );

  /** Replace the trigger text + query with the selected emoji shortcode */
  const handleEmojiSelect = useCallback(
    (emoji: CustomEmoji) => {
      if (!emojiQuery || !editor) return;

      const { state } = editor;
      const { from } = state.selection;
      const $pos = state.doc.resolve(from);
      const textBefore = $pos.parent.textBetween(
        0,
        $pos.parentOffset,
        undefined,
        '\ufffc',
      );

      const colonMatch = textBefore.match(/:([a-z0-9_]{2,32})$/);
      if (!colonMatch) return;

      const startInParent = textBefore.length - colonMatch[0].length;
      const startInDoc = from - $pos.parentOffset + startInParent;
      const endInDoc = from;

      const shortcode = `:${emoji.name}: `;
      editor
        .chain()
        .focus()
        .deleteRange({ from: startInDoc, to: endInDoc })
        .insertContent(shortcode)
        .run();

      closeEmojiFlyout();
    },
    [editor, emojiQuery, closeEmojiFlyout],
  );

  /** Replace the /command text with the selected command */
  const handleCommandSelect = useCallback(
    (entry: BotCommandEntry) => {
      if (!editor) return;

      const commandText = `/${entry.command} `;
      editor.chain().focus().setContent(commandText).run();
      // Move cursor to end
      editor.commands.focus('end');
      closeCommandFlyout();
    },
    [editor, closeCommandFlyout],
  );

  /** Handle keyboard navigation within flyouts. Returns true if consumed. */
  const handleAutocompleteKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      if (isCommandFlyoutOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setCommandSelectedIndex((c) =>
            c < commandSuggestions.length - 1 ? c + 1 : 0,
          );
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setCommandSelectedIndex((c) =>
            c > 0 ? c - 1 : commandSuggestions.length - 1,
          );
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const selected = commandSuggestions[commandSelectedIndex];
          if (selected) handleCommandSelect(selected);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeCommandFlyout();
          return true;
        }
      }

      if (isEmojiFlyoutOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setEmojiSelectedIndex((c) =>
            c < emojiSuggestions.length - 1 ? c + 1 : 0,
          );
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setEmojiSelectedIndex((c) =>
            c > 0 ? c - 1 : emojiSuggestions.length - 1,
          );
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const selected = emojiSuggestions[emojiSelectedIndex];
          if (selected) handleEmojiSelect(selected);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeEmojiFlyout();
          return true;
        }
      }

      if (isMentionFlyoutOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setMentionSelectedIndex((c) =>
            c < mentionSuggestions.length - 1 ? c + 1 : 0,
          );
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setMentionSelectedIndex((c) =>
            c > 0 ? c - 1 : mentionSuggestions.length - 1,
          );
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const selected = mentionSuggestions[mentionSelectedIndex];
          if (selected) handleMentionSelect(selected);
          return true;
        }
        if (event.key === 'Escape') {
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

  // Register keyboard handler on the editor's DOM element
  useEffect(() => {
    if (!editor) return;
    const editorElement = editor.view.dom;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (handleAutocompleteKeyDown(event)) {
        event.stopPropagation();
      }
    };

    editorElement.addEventListener('keydown', handleKeyDown, true);
    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [editor, handleAutocompleteKeyDown]);

  return {
    everyoneCooldownSeconds,
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
    handleMentionSelect,
    handleEmojiSelect,
    handleCommandSelect,
    closeMentionFlyout,
    closeEmojiFlyout,
    closeCommandFlyout,
  };
}
