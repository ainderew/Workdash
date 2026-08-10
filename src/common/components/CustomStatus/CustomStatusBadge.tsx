import React from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import CustomStatusEmoji from './CustomStatusEmoji';
import { useCustomStatus, formatCustomStatus } from './useCustomStatus';

interface CustomStatusBadgeProps {
    userId: number;
    size?: number;
}

/**
 * Message-feed presentation: emoji only, sitting beside the sender name.
 * Hovering reveals the full status (emoji + text).
 */
function CustomStatusBadge({ userId, size = 14 }: CustomStatusBadgeProps) {
    const status = useCustomStatus(userId);
    if (!status?.emoji) return null;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className="inline-flex shrink-0 cursor-default items-center align-middle"
                    aria-label={formatCustomStatus(status)}
                >
                    <CustomStatusEmoji emoji={status.emoji} size={size} />
                </span>
            </TooltipTrigger>
            <TooltipContent side="top">
                <span className="flex items-center gap-1.5">
                    <CustomStatusEmoji emoji={status.emoji} size={14} />
                    {status.text && <span>{status.text}</span>}
                </span>
            </TooltipContent>
        </Tooltip>
    );
}

export default CustomStatusBadge;
