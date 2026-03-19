import React, { useEffect, useMemo } from "react";
import { Code2 } from "lucide-react";

const MAX_HEIGHT = 240; // ~12 lines of text, scrollable beyond this
const CODE_BLOCK_REGEX = /```[\s\S]*?```/;

interface ComposerInputProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    inputElementId: string;
    value: string;
    disabled?: boolean;
    isSending?: boolean;
    placeholder: string;
    isMentionFlyoutOpen: boolean;
    handleChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    handlePaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}

function ComposerInput({
    textareaRef,
    inputElementId,
    value,
    disabled,
    isSending,
    placeholder,
    isMentionFlyoutOpen,
    handleChange,
    handleKeyDown,
    handlePaste,
}: ComposerInputProps) {
    const hasCodeBlock = useMemo(() => CODE_BLOCK_REGEX.test(value), [value]);

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, MAX_HEIGHT)}px`;
    }, [value, textareaRef]);

    return (
        <div className="min-w-0 flex flex-1 flex-col">
            {hasCodeBlock && (
                <div className="flex items-center gap-1 px-2 pt-1.5 pb-0">
                    <Code2 size={14} className="wd-text-muted shrink-0" />
                    <span className="text-xs wd-text-muted">
                        Contains code block
                    </span>
                </div>
            )}
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
                aria-autocomplete={isMentionFlyoutOpen ? "list" : undefined}
                className={`min-h-[44px] text-sm max-h-[240px] w-full overflow-y-auto border-0 px-2 py-[11px] leading-5 shadow-none resize-none wd-text-primary outline-none focus:outline-none ${
                    hasCodeBlock
                        ? "font-mono text-[13px] rounded-md bg-[var(--wd-surface-base)]"
                        : "bg-transparent"
                }`}
            />
        </div>
    );
}

export default ComposerInput;
