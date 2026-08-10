import React, { useEffect, useRef, useState } from 'react';
import { Smile, X } from 'lucide-react';
import { toast } from 'sonner';
import DeskModalShell from '@/common/components/DeskMode/modals/DeskModalShell';
import EmojiPicker from '@/common/components/DeskMode/EmojiPicker';
import {
    StatusClientService,
    CUSTOM_STATUS_TEXT_MAX_LENGTH,
} from '@/communication/status/statusService';
import CustomStatusEmoji from './CustomStatusEmoji';
import { CUSTOM_STATUS_SUGGESTIONS } from './suggestions';
import type { CustomStatus } from '@/common/store/presenceStore';

interface CustomStatusModalProps {
    isOpen: boolean;
    current: CustomStatus | null;
    onClose: () => void;
}

const DEFAULT_EMOJI = '💬';

function CustomStatusModal({
    isOpen,
    current,
    onClose,
}: CustomStatusModalProps) {
    const [emoji, setEmoji] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset the draft each time the modal opens so a cancelled edit doesn't
    // leak into the next one.
    useEffect(() => {
        if (!isOpen) return;
        setEmoji(current?.emoji ?? null);
        setText(current?.text ?? '');
        setIsPickerOpen(false);
    }, [isOpen, current]);

    const hasValue = !!emoji || text.trim().length > 0;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const service = StatusClientService.getInstance();
            const ok = hasValue
                ? await service.setCustomStatus({
                      // An emoji-less status still needs a glyph for the feed,
                      // where text can't be shown.
                      emoji: emoji ?? DEFAULT_EMOJI,
                      text: text.trim() || null,
                  })
                : await service.clearCustomStatus();

            if (!ok) {
                toast('Failed to save status');
                return;
            }
            onClose();
        } catch (err) {
            console.error('[CustomStatusModal] Failed to save status:', err);
            toast('Failed to save status');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = async () => {
        setIsSaving(true);
        try {
            const ok =
                await StatusClientService.getInstance().clearCustomStatus();
            if (!ok) {
                toast('Failed to clear status');
                return;
            }
            onClose();
        } catch (err) {
            console.error('[CustomStatusModal] Failed to clear status:', err);
            toast('Failed to clear status');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DeskModalShell
            isOpen={isOpen}
            title="Set a status"
            subtitle="Let your workspace know what you're up to."
            onClose={onClose}
        >
            <div className="space-y-4">
                <div className="relative">
                    <div className="flex items-center gap-2 rounded-lg border wd-border-subtle wd-bg-elevated px-2 py-1.5 focus-within:ring-1 focus-within:ring-[var(--wd-accent)]/50">
                        <button
                            type="button"
                            aria-label="Choose status emoji"
                            data-emoji-picker-trigger="true"
                            onClick={() => setIsPickerOpen((v) => !v)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06]"
                        >
                            {emoji ? (
                                <CustomStatusEmoji emoji={emoji} size={18} />
                            ) : (
                                <Smile size={18} className="wd-text-muted" />
                            )}
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={text}
                            maxLength={CUSTOM_STATUS_TEXT_MAX_LENGTH}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSave();
                            }}
                            placeholder="What's your status?"
                            aria-label="Status text"
                            className="flex-1 bg-transparent text-sm wd-text-primary placeholder:wd-text-muted focus:outline-none"
                        />
                        {hasValue && (
                            <button
                                type="button"
                                aria-label="Clear status draft"
                                onClick={() => {
                                    setEmoji(null);
                                    setText('');
                                    inputRef.current?.focus();
                                }}
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded wd-text-muted transition-colors hover:bg-white/[0.06] hover:text-[var(--wd-text-primary)]"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {isPickerOpen && (
                        <div className="absolute left-0 top-[calc(100%+6px)] z-50">
                            <EmojiPicker
                                onSelect={(selected) => {
                                    setEmoji(selected);
                                    setIsPickerOpen(false);
                                    inputRef.current?.focus();
                                }}
                                onClose={() => setIsPickerOpen(false)}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider wd-text-muted">
                        Suggestions
                    </p>
                    <div className="space-y-0.5">
                        {CUSTOM_STATUS_SUGGESTIONS.map((suggestion) => (
                            <button
                                key={suggestion.text}
                                type="button"
                                onClick={() => {
                                    setEmoji(suggestion.emoji);
                                    setText(suggestion.text);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm wd-text-secondary transition-colors hover:bg-white/[0.06] hover:text-[var(--wd-text-primary)]"
                            >
                                <CustomStatusEmoji
                                    emoji={suggestion.emoji}
                                    size={16}
                                />
                                <span className="truncate">
                                    {suggestion.text}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                    {current && (
                        <button
                            type="button"
                            onClick={() => void handleClear()}
                            disabled={isSaving}
                            className="mr-auto rounded-md px-3 py-1.5 text-sm wd-text-muted transition-colors hover:bg-white/[0.06] hover:text-[var(--wd-text-primary)] disabled:opacity-50"
                        >
                            Clear status
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-md px-3 py-1.5 text-sm wd-text-secondary transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="wd-btn-primary rounded-md px-3.5 py-1.5 text-sm disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </DeskModalShell>
    );
}

export default CustomStatusModal;
