import React from "react";
import { Code2, SendHorizontal, Sticker } from "lucide-react";
import { toast } from "sonner";

function PlusSolidIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path
                fill="currentColor"
                d="M10.9 4.2h2.2v5.7h5.7v2.2h-5.7v5.7h-2.2v-5.7H5.2V9.9h5.7V4.2Z"
            />
        </svg>
    );
}

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

export const INLINE_ACTION_BUTTON_CLASS =
    "group/inline relative z-[99] h-9 w-9 shrink-0 rounded-full overflow-hidden text-[var(--wd-text-muted)] motion-safe:transition-colors motion-safe:duration-300 hover:text-[var(--wd-text-primary)] focus-visible:text-[var(--wd-text-primary)] disabled:opacity-55 disabled:cursor-not-allowed";

export const HOVER_GLOW =
    "pointer-events-none absolute inset-0 rounded-full scale-50 opacity-0 motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out bg-[radial-gradient(circle_at_30%_25%,var(--wd-accent-hover),var(--wd-accent))] group-hover/inline:scale-100 group-hover/inline:opacity-100 group-focus-visible/inline:scale-100 group-focus-visible/inline:opacity-100";

interface ComposerActionsProps {
    disabled?: boolean;
    isSending?: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    value: string;
    selectedFile: File | null;
    setShowGifPicker: React.Dispatch<React.SetStateAction<boolean>>;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: () => void;
    onToggleCodeBlock: () => void;
    children: React.ReactNode;
}

function ComposerActions({
    disabled,
    isSending,
    fileInputRef,
    value,
    selectedFile,
    setShowGifPicker,
    onFileSelect,
    onSubmit,
    onToggleCodeBlock,
    children,
}: ComposerActionsProps) {
    const isDisabled = disabled || isSending;

    return (
        <div className="flex items-start gap-3">
            <div className="flex flex-1 items-start">
                <div className="flex min-h-[54px] w-full items-start gap-1.5 rounded-2xl border wd-border-subtle wd-bg-panel-2 px-2 py-1">
                    <button
                        type="button"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isDisabled}
                        title="Attach file"
                        className={`${INLINE_ACTION_BUTTON_CLASS} mt-2`}
                    >
                        <span className={HOVER_GLOW} />
                        <PlusSolidIcon className="relative z-10 h-5 w-5 fill-current mx-auto" />
                    </button>

                    {children}

                    <div
                        className="relative z-[99] mt-2 flex shrink-0 items-center gap-0.5 px-0.5"
                        onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                    >
                        <button
                            type="button"
                            onClick={onToggleCodeBlock}
                            disabled={isDisabled}
                            title="Toggle code block"
                            className={INLINE_ACTION_BUTTON_CLASS}
                        >
                            <span className={HOVER_GLOW} />
                            <Code2 className="relative z-10 h-4.5 w-4.5 mx-auto" />
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setShowGifPicker((previous) => !previous)
                            }
                            disabled={isDisabled}
                            title="Send GIF"
                            className={INLINE_ACTION_BUTTON_CLASS}
                        >
                            <span className={HOVER_GLOW} />
                            <GifBadgeIcon className="relative z-10 h-4.5 w-4.5 mx-auto" />
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                toast("Stickers are coming soon", {
                                    description:
                                        "This action is a placeholder for now.",
                                })
                            }
                            disabled={isDisabled}
                            title="Stickers (coming soon)"
                            className={INLINE_ACTION_BUTTON_CLASS}
                        >
                            <span className={HOVER_GLOW} />
                            <Sticker className="relative z-10 h-4.5 w-4.5 mx-auto" />
                        </button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={onFileSelect}
                />
            </div>

            <button
                type="button"
                disabled={isDisabled || (!value.trim() && !selectedFile)}
                onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                onClick={onSubmit}
                title={isSending ? "Sending..." : "Send message"}
                aria-label={isSending ? "Sending..." : "Send message"}
                className={`${INLINE_ACTION_BUTTON_CLASS} mt-3`}
            >
                <span className={HOVER_GLOW} />
                <SendHorizontal className="relative z-10 h-4.5 w-4.5 mx-auto" />
            </button>
        </div>
    );
}

export default ComposerActions;
