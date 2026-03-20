import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatV2RoomMember } from '@/communication/chatV2/_types';
import {
  buildMemberNameMap,
  deserializeMentionContent,
  serializeMentionContentForSend,
} from '@/communication/chatV2/mentionUtils';
import useUserStore from '@/common/store/useStore';
import useChatV2Store from '@/common/store/chatV2Store';
import useCustomEmojiStore from '@/common/store/customEmojiStore';
import MentionSuggestionFlyout from './MentionSuggestionFlyout';
import EmojiAutocompleteFlyout from './EmojiAutocompleteFlyout';
import { useTiptapEditor } from './Composer/useTiptapEditor';
import { useTiptapAutocomplete } from './Composer/useTiptapAutocomplete';
import TiptapEditorContent from './Composer/TiptapEditorContent';
import FormattingToolbar from './Composer/FormattingToolbar';
import LinkPopover from './Composer/LinkPopover';
import {
  serializeTiptapToMarkdown,
  deserializeMarkdownToTiptap,
} from '@/common/utils/richTextSerializer';
import { Check, Pencil, X } from 'lucide-react';

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
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);

  const memberNameMap = useMemo(
    () => buildMemberNameMap(members || []),
    [members],
  );

  const deserializedContent = useMemo(
    () => deserializeMentionContent(initialContent, memberNameMap),
    [initialContent, memberNameMap],
  );

  const serializeCustomEmojis = useCallback(
    (text: string): string => {
      const emojis =
        useCustomEmojiStore.getState().emojisByWorkspace[
          selectedWorkspaceId ?? ''
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

  // Ref for save handler so keyboard shortcut can call it
  const saveRef = React.useRef<() => void>(() => {});

  const tiptap = useTiptapEditor({
    placeholder: 'Edit message...',
    disabled: isSaving,
    onSubmit: () => saveRef.current(),
    onLinkShortcut: () => setShowLinkPopover((prev) => !prev),
  });

  const autocomplete = useTiptapAutocomplete({
    editor: tiptap.editor,
    members,
    selectedWorkspaceId,
    localBackendUserId,
  });

  // Initialize editor content from deserialized markdown
  useEffect(() => {
    if (tiptap.editor && deserializedContent) {
      const json = deserializeMarkdownToTiptap(deserializedContent);
      tiptap.editor.commands.setContent(json);
      // Move cursor to end
      tiptap.editor.commands.focus('end');
    }
  }, [tiptap.editor, deserializedContent]);

  const handleSave = useCallback(async () => {
    if (!tiptap.editor) return;

    const rawContent = serializeTiptapToMarkdown(tiptap.editor.getJSON());
    const trimmed = rawContent.trim();
    if (!trimmed) {
      setValidationError('Message cannot be empty');
      return;
    }

    const serialized = serializeMentionContentForSend(
      rawContent,
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
    tiptap.editor,
    memberNameMap,
    serializeCustomEmojis,
    initialContent,
    onCancel,
    onSave,
  ]);

  saveRef.current = () => void handleSave();

  // Register Escape to cancel — use editor keydown handler
  useEffect(() => {
    if (!tiptap.editor) return;
    const editorElement = tiptap.editor.view.dom;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    editorElement.addEventListener('keydown', handleKeyDown);
    return () => editorElement.removeEventListener('keydown', handleKeyDown);
  }, [tiptap.editor, onCancel]);

  return (
    <div className="relative">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[var(--wd-accent)]">
        <Pencil size={11} />
        Editing message
      </div>

      {autocomplete.isEmojiFlyoutOpen && (
        <EmojiAutocompleteFlyout
          emojis={autocomplete.emojiSuggestions}
          query={autocomplete.emojiQuery?.query ?? ''}
          selectedIndex={autocomplete.emojiSelectedIndex}
          onSelect={autocomplete.handleEmojiSelect}
          onClose={autocomplete.closeEmojiFlyout}
        />
      )}

      {autocomplete.isMentionFlyoutOpen && (
        <MentionSuggestionFlyout
          suggestions={autocomplete.mentionSuggestions}
          query={autocomplete.mentionQuery?.query ?? ''}
          selectedIndex={autocomplete.mentionSelectedIndex}
          onSelect={autocomplete.handleMentionSelect}
          onClose={autocomplete.closeMentionFlyout}
        />
      )}

      {showLinkPopover && tiptap.editor && (
        <LinkPopover
          editor={tiptap.editor}
          onClose={() => setShowLinkPopover(false)}
        />
      )}

      <FormattingToolbar
        editor={tiptap.editor}
        disabled={isSaving}
        onLinkClick={() => setShowLinkPopover((prev) => !prev)}
      />

      <div className="rounded-md border wd-border-subtle bg-[var(--wd-surface-panel-2)] focus-within:border-[var(--wd-accent)]">
        <TiptapEditorContent editor={tiptap.editor} />
      </div>

      {validationError && (
        <div className="text-[11px] text-red-400 mt-0.5">
          {validationError}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] wd-text-muted">
          escape to cancel · enter to save
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            title="Cancel (Escape)"
            className="inline-flex h-7 w-7 items-center justify-center rounded wd-text-muted transition-colors hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] disabled:opacity-50"
          >
            <X size={15} />
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            title="Save (Enter)"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-green-400 transition-colors hover:text-green-300 hover:bg-[rgba(74,222,128,0.1)] disabled:opacity-50"
          >
            <Check size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default InlineMessageEditor;
