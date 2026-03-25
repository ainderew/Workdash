import React from 'react';
import { Code2, Paperclip, SendHorizontal, Smile } from 'lucide-react';
import type { Editor } from '@tiptap/react';

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

const ACTION_BTN =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--wd-text-muted)] motion-safe:transition-all motion-safe:duration-150 hover:text-[var(--wd-text-primary)] hover:bg-[var(--wd-surface-elevated)] focus-visible:text-[var(--wd-text-primary)] focus-visible:bg-[var(--wd-surface-elevated)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent';

const SEND_BTN_ENABLED =
  'wd-dock-action-btn wd-dock-action-btn--accent active:scale-95';

const SEND_BTN_DISABLED =
  'wd-dock-action-btn wd-dock-action-btn--disabled';

export const INLINE_ACTION_BUTTON_CLASS = ACTION_BTN;

export const HOVER_GLOW = 'hidden';

interface ComposerActionsProps {
  disabled?: boolean;
  isSending?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  editor: Editor | null;
  selectedFile: File | null;
  setShowGifPicker: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleEmojiPicker: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onToggleCodeBlock: () => void;
  children: React.ReactNode;
}

function ComposerActions({
  disabled,
  isSending,
  fileInputRef,
  editor,
  selectedFile,
  setShowGifPicker,
  onToggleEmojiPicker,
  onFileSelect,
  onSubmit,
  onToggleCodeBlock,
  children,
}: ComposerActionsProps) {
  const isDisabled = disabled || isSending;
  const isEmpty = editor ? editor.isEmpty : true;
  const canSend = !isDisabled && (!isEmpty || !!selectedFile);

  return (
    <div className="wd-composer-shell rounded-xl border wd-border-subtle bg-[var(--wd-surface-panel)]">
      {/* Editor + formatting toolbar merged into one row */}
      <div className="flex items-start">
        {children}
      </div>

      {/* Single bottom bar: attach actions | divider | send */}
      <div
        className="flex items-center gap-1 px-2.5 pb-2"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          title="Attach file"
          className={ACTION_BTN}
        >
          <Paperclip size={15} />
        </button>

        <button
          type="button"
          onClick={onToggleCodeBlock}
          disabled={isDisabled}
          title="Toggle code block"
          className={ACTION_BTN}
        >
          <Code2 size={15} />
        </button>

        <button
          type="button"
          onClick={onToggleEmojiPicker}
          disabled={isDisabled}
          title="Emoji picker"
          data-emoji-picker-trigger="true"
          className={ACTION_BTN}
        >
          <Smile size={15} />
        </button>

        <button
          type="button"
          onClick={() => setShowGifPicker((previous) => !previous)}
          disabled={isDisabled}
          title="Send GIF"
          className={ACTION_BTN}
        >
          <GifBadgeIcon className="h-4 w-4" />
        </button>

        <div className="flex-1" />

        <button
          type="button"
          disabled={!canSend}
          onClick={onSubmit}
          title={isSending ? 'Sending...' : 'Send message'}
          aria-label={isSending ? 'Sending...' : 'Send message'}
          className={canSend ? SEND_BTN_ENABLED : SEND_BTN_DISABLED}
        >
          <SendHorizontal size={15} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onFileSelect}
      />
    </div>
  );
}

export default ComposerActions;
