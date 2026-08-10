import React from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import CustomStatusEmoji from './CustomStatusEmoji';
import { useCustomStatus, formatCustomStatus } from './useCustomStatus';

interface CustomStatusInlineProps {
    userId: number;
    className?: string;
}

/**
 * Member-list presentation: emoji + status text on one line. The text
 * truncates, so the tooltip carries the full thing.
 */
function CustomStatusInline({ userId, className }: CustomStatusInlineProps) {
    const status = useCustomStatus(userId);
    if (!status) return null;

    const label = formatCustomStatus(status);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className={`flex items-center gap-1 min-w-0 text-[11px] wd-text-muted ${className ?? ''}`}
                >
                    {status.emoji && (
                        <CustomStatusEmoji
                            emoji={status.emoji}
                            size={12}
                            className="shrink-0"
                        />
                    )}
                    {status.text && (
                        <span className="truncate">{status.text}</span>
                    )}
                </span>
            </TooltipTrigger>
            <TooltipContent side="left">
                <span className="flex items-center gap-1.5">
                    {status.emoji && (
                        <CustomStatusEmoji emoji={status.emoji} size={14} />
                    )}
                    <span>{status.text ?? label}</span>
                </span>
            </TooltipContent>
        </Tooltip>
    );
}

export default CustomStatusInline;
