import React, { useState } from 'react';
import { Smile, X } from 'lucide-react';
import { toast } from 'sonner';
import useUserStore from '@/common/store/useStore';
import { StatusClientService } from '@/communication/status/statusService';
import CustomStatusEmoji from './CustomStatusEmoji';
import CustomStatusModal from './CustomStatusModal';
import { useCustomStatus } from './useCustomStatus';

/**
 * The "set a status" affordance in the self profile popover. Shows the
 * current status with an inline clear button, mirroring Slack's menu.
 */
export function CustomStatusPickerRow() {
    const myUserId = useUserStore((s) => s.backendUser?.id);
    const status = useCustomStatus(myUserId ?? -1);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleClear = async (event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            const ok =
                await StatusClientService.getInstance().clearCustomStatus();
            if (!ok) toast('Failed to clear status');
        } catch (err) {
            console.error('[CustomStatusPickerRow] Failed to clear:', err);
            toast('Failed to clear status');
        }
    };

    return (
        <>
            <div className="mt-2 mb-1">
                <div className="flex w-full items-center gap-2 rounded-lg border wd-border-subtle wd-bg-elevated px-2.5 py-2 transition-colors hover:bg-white/[0.06]">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {status?.emoji ? (
                                <CustomStatusEmoji
                                    emoji={status.emoji}
                                    size={16}
                                />
                            ) : (
                                <Smile size={16} className="wd-text-muted" />
                            )}
                        </span>
                        <span
                            className={`truncate text-[13px] ${
                                status
                                    ? 'wd-text-primary'
                                    : 'wd-text-muted'
                            }`}
                        >
                            {status?.text ?? 'Set a status'}
                        </span>
                    </button>

                    {status && (
                        <button
                            type="button"
                            aria-label="Clear status"
                            onClick={(e) => void handleClear(e)}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full wd-text-muted transition-colors hover:bg-white/[0.08] hover:text-[var(--wd-text-primary)]"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            <CustomStatusModal
                isOpen={isModalOpen}
                current={status}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}

export default CustomStatusPickerRow;
