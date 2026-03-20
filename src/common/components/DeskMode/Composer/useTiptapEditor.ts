import { useEffect } from 'react';
import { useEditor, Extension, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  serializeTiptapToMarkdown,
  deserializeMarkdownToTiptap,
} from '@/common/utils/richTextSerializer';

interface UseTiptapEditorOptions {
  placeholder?: string;
  disabled?: boolean;
  onSubmit: () => void;
  onEditLastMessage?: () => void;
  onTyping?: () => void;
  onImagePaste?: (file: File) => void;
  onLinkShortcut?: () => void;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Custom extension for Enter-to-send behavior.
 * Enter (no shift, not in list) → onSubmit.
 * Shift+Enter → hard break.
 * ArrowUp when empty → onEditLastMessage.
 */
function createKeyboardExtension(options: UseTiptapEditorOptions) {
  return Extension.create({
    name: 'keyboardShortcuts',
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          // If in a bullet list, let default behavior continue (new list item)
          if (editor.isActive('bulletList')) {
            // Check if current list item is empty — exit list
            const { state } = editor;
            const { $from } = state.selection;
            const listItemNode = $from.node($from.depth - 1);
            if (
              listItemNode?.type.name === 'listItem' &&
              listItemNode.textContent === ''
            ) {
              // Lift out of list (exit list on empty item)
              return editor.chain().liftListItem('listItem').run();
            }
            return false; // let Tiptap handle new list item
          }
          options.onSubmit();
          return true;
        },
        'Shift-Enter': () => false, // let default hardBreak behavior happen
        ArrowUp: ({ editor }) => {
          if (options.onEditLastMessage && editor.isEmpty) {
            options.onEditLastMessage();
            return true;
          }
          return false;
        },
        'Mod-k': () => {
          options.onLinkShortcut?.();
          return true;
        },
      };
    },
  });
}

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'A', 'UL', 'OL', 'LI',
  'CODE', 'PRE', 'BR', 'P',
]);

function sanitizePastedHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function walk(node: Node): void {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.parentNode?.removeChild(child);
        continue;
      }

      const el = child as Element;
      if (!ALLOWED_TAGS.has(el.tagName)) {
        // Replace disallowed element with its children
        while (el.firstChild) {
          el.parentNode?.insertBefore(el.firstChild, el);
        }
        el.parentNode?.removeChild(el);
        continue;
      }

      // Strip all attributes except href on anchors
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (el.tagName === 'A' && attr.name === 'href') continue;
        el.removeAttribute(attr.name);
      }

      walk(el);
    }
  }

  walk(doc.body);
  return doc.body.innerHTML;
}

export function useTiptapEditor(options: UseTiptapEditorOptions) {
  const {
    placeholder: placeholderText,
    disabled,
    onTyping,
    onImagePaste,
  } = options;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // Keep bold, italic, bulletList, listItem, code, codeBlock, history, hardBreak,
        // underline, link (included in StarterKit v3)
        // Disable heading, blockquote, horizontalRule — not needed for chat
        heading: false,
        blockquote: false,
        horizontalRule: false,
        orderedList: false,
        link: {
          openOnClick: false,
          autolink: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        },
      }),
      Placeholder.configure({
        placeholder: placeholderText ?? 'Message room',
      }),
      createKeyboardExtension(options),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': placeholderText ?? 'Message room',
      },
      transformPastedHTML: sanitizePastedHTML,
      handlePaste: (_view, event) => {
        if (!onImagePaste) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item.type.startsWith('image/')) continue;

          event.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return true;

          const ext = MIME_TO_EXT[blob.type] ?? 'png';
          const file = new File([blob], `screenshot-${Date.now()}.${ext}`, {
            type: blob.type,
          });
          onImagePaste(file);
          return true;
        }
        return false;
      },
    },
    onUpdate: () => {
      onTyping?.();
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  return {
    editor,
    getMarkdownContent: () => {
      if (!editor) return '';
      return serializeTiptapToMarkdown(editor.getJSON());
    },
    setContentFromMarkdown: (md: string) => {
      if (!editor) return;
      const json = deserializeMarkdownToTiptap(md);
      editor.commands.setContent(json);
    },
    isEmpty: () => {
      if (!editor) return true;
      return editor.isEmpty;
    },
    focus: () => {
      editor?.commands.focus();
    },
  };
}

export type { Editor };
