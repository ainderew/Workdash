import React from 'react';
import TwemojiSpan from '@/common/components/DeskMode/TwemojiSpan';
import CustomEmojiInline from '@/common/components/DeskMode/CustomEmojiInline';
import { parseCustomEmojiToken } from '@/common/utils/customEmojiParser';

interface CustomStatusEmojiProps {
    emoji: string;
    size?: number;
    className?: string;
}

/**
 * Renders a single status emoji — either a workspace custom emoji token
 * (`<:name:uuid>`) or a native unicode emoji.
 */
function CustomStatusEmoji({
    emoji,
    size = 16,
    className,
}: CustomStatusEmojiProps) {
    const custom = parseCustomEmojiToken(emoji);

    if (custom) {
        return (
            <span
                className={className}
                style={{ display: 'inline-flex', alignItems: 'center' }}
            >
                <CustomEmojiInline emojiId={custom.id} name={custom.name} />
            </span>
        );
    }

    return <TwemojiSpan emoji={emoji} size={size} className={className} />;
}

export default React.memo(CustomStatusEmoji);
