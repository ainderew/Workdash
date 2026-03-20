import React from 'react';
import { Bold, Italic, Underline, Link2, List } from 'lucide-react';
import type { Editor } from '@tiptap/react';

interface FormattingToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
  onLinkClick?: () => void;
}

const TOOLBAR_BTN =
  'inline-flex h-6 w-6 items-center justify-center rounded text-[var(--wd-text-muted)] motion-safe:transition-all motion-safe:duration-150 hover:text-[var(--wd-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed';

const ACTIVE_CLASS =
  'text-[var(--wd-accent)] bg-[var(--wd-accent-soft)]';

function FormattingToolbar({ editor, disabled, onLinkClick }: FormattingToolbarProps) {
  if (!editor) return null;

  const buttons = [
    {
      label: 'Bold',
      icon: Bold,
      shortcut: '⌘B',
      isActive: editor.isActive('bold'),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      shortcut: '⌘I',
      isActive: editor.isActive('italic'),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      icon: Underline,
      shortcut: '⌘U',
      isActive: editor.isActive('underline'),
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Link',
      icon: Link2,
      shortcut: '⌘K',
      isActive: editor.isActive('link'),
      action: () => onLinkClick?.(),
    },
    {
      label: 'Bullet list',
      icon: List,
      shortcut: undefined as string | undefined,
      isActive: editor.isActive('bulletList'),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
  ];

  return (
    <div
      className="wd-formatting-toolbar hidden shrink-0 items-center gap-px pr-2 pt-2 wd-composer-shell-focus-visible"
      role="toolbar"
      aria-label="Text formatting"
    >
      {buttons.map(({ label, icon: Icon, shortcut, isActive, action }) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          aria-label={shortcut ? `${label} (${shortcut})` : label}
          aria-pressed={isActive}
          title={shortcut ? `${label} (${shortcut})` : label}
          className={`${TOOLBAR_BTN} ${isActive ? ACTIVE_CLASS : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={action}
        >
          <Icon size={13} strokeWidth={2.2} />
        </button>
      ))}
    </div>
  );
}

export default FormattingToolbar;
