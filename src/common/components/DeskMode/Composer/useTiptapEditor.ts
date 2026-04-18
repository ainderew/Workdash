import { useEffect } from 'react';
import { useEditor, Extension, type Editor } from '@tiptap/react';
import { textblockTypeInputRule } from '@tiptap/core';
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
  onFilesPaste?: (files: File[]) => void;
  onLinkShortcut?: () => void;
}

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const extensionFromMime = (mime: string): string => {
  if (IMAGE_MIME_TO_EXT[mime]) return IMAGE_MIME_TO_EXT[mime];
  const slash = mime.indexOf('/');
  return slash > 0 ? mime.slice(slash + 1) : 'bin';
};

/**
 * Custom extension for Enter-to-send behavior + code block helpers.
 *
 * Normal mode:  Enter → submit,  Shift+Enter → newline.
 * Code block:   Enter → newline, Shift+Enter → submit.
 *
 * Typing ``` at the start of a paragraph instantly creates a code block.
 * Typing ```lang + Enter also works (for language-tagged blocks).
 * ArrowRight at the end of a code block exits into a paragraph after it.
 */
function createKeyboardExtension(options: UseTiptapEditorOptions) {
  return Extension.create({
    name: 'keyboardShortcuts',

    addInputRules() {
      const codeBlockType = this.editor.schema.nodes.codeBlock;
      if (!codeBlockType) return [];
      return [
        // Typing ``` at the start of a paragraph instantly creates a code block
        textblockTypeInputRule({
          find: /^```$/,
          type: codeBlockType,
        }),
      ];
    },

    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          // If in a list, let default behavior continue (new list item)
          if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
            const { state } = editor;
            const { $from } = state.selection;
            const listItemNode = $from.node($from.depth - 1);
            if (
              listItemNode?.type.name === 'listItem' &&
              listItemNode.textContent === ''
            ) {
              return editor.chain().liftListItem('listItem').run();
            }
            return false;
          }

          // Detect ```lang at the start of a paragraph → code block with language
          const { state } = editor;
          const { $from } = state.selection;
          const currentNode = $from.parent;
          if (
            currentNode.type.name === 'paragraph' &&
            /^```(\w+)$/.test(currentNode.textContent)
          ) {
            const lang = currentNode.textContent.slice(3);
            editor
              .chain()
              .deleteRange({ from: $from.start(), to: $from.end() })
              .toggleCodeBlock({ language: lang })
              .run();
            return true;
          }

          options.onSubmit();
          return true;
        },

        'Shift-Enter': ({ editor }) => {
          if (editor.isActive('codeBlock')) {
            // HardBreak (<br>) isn't valid inside <pre>, so insert a \n directly
            return editor.commands.command(({ tr }) => {
              const { from, to } = tr.selection;
              tr.insertText('\n', from, to);
              return true;
            });
          }
          // Split into a new paragraph (not a <br> hard break) so that
          // bullet input rules ("- ") and the toggle button work per-line
          return editor.commands.splitBlock();
        },

        ArrowRight: ({ editor }) => {
          if (!editor.isActive('codeBlock')) return false;

          const { $from, empty } = editor.state.selection;
          if (!empty) return false;
          if ($from.parentOffset !== $from.parent.content.size) return false;

          // Cursor is at the very end of the code block — exit into next node
          const afterPos = $from.after();

          if (afterPos >= editor.state.doc.content.size) {
            // Code block is the last node — create an empty paragraph after it
            return editor
              .chain()
              .command(({ tr }) => {
                tr.insert(
                  afterPos,
                  editor.state.schema.nodes.paragraph.create(),
                );
                return true;
              })
              .setTextSelection(afterPos + 1)
              .run();
          }

          // Move cursor into the existing node after the code block
          editor.commands.setTextSelection(afterPos + 1);
          return true;
        },

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
    onFilesPaste,
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
        if (!onFilesPaste) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;

        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind !== 'file') continue;

          const blob = item.getAsFile();
          if (!blob) continue;

          if (blob.name && blob.name.trim().length > 0) {
            pastedFiles.push(blob);
            continue;
          }

          const ext = extensionFromMime(blob.type);
          const file = new File(
            [blob],
            `pasted-${Date.now()}-${i}.${ext}`,
            { type: blob.type },
          );
          pastedFiles.push(file);
        }

        if (pastedFiles.length === 0) return false;

        event.preventDefault();
        onFilesPaste(pastedFiles);
        return true;
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
