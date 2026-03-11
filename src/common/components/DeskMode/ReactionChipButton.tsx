import React, { useCallback, useMemo, useRef } from 'react';
import type { ChatV2MessageReaction } from '@/communication/chatV2/_types';
import { useSuperReactionAnimation } from '@/common/hooks/useSuperReactionAnimation';
import { isSuperReactionEmoji, getSuperReactionColor, getSuperReactionPosition } from '@/common/config/superReactionAnimations';
import SuperReactionBurst from './SuperReactionBurst';
import type { SuperReactionBurstHandle } from './SuperReactionBurst';
import TwemojiSpan from './TwemojiSpan';
import { parseCustomEmojiToken } from '@/common/utils/customEmojiParser';
import useCustomEmojiStore from '@/common/store/customEmojiStore';

type ReactionChipButtonProps = {
    reaction: ChatV2MessageReaction;
    messageId: string;
    roomId: string;
    onToggle: (emoji: string) => void;
    onMouseEnter: (event: React.MouseEvent<HTMLButtonElement>, emoji: string) => void;
    onMouseLeave: () => void;
};

function ReactionChipButton({
    reaction,
    messageId,
    roomId,
    onToggle,
    onMouseEnter,
    onMouseLeave,
}: ReactionChipButtonProps) {
    const customEmojiParsed = useMemo(() => parseCustomEmojiToken(reaction.emoji), [reaction.emoji]);
    const customEmoji = useCustomEmojiStore((s) =>
        customEmojiParsed ? s.findEmojiById(customEmojiParsed.id) : undefined,
    );
    const isSuper = isSuperReactionEmoji(reaction.emoji);
    const animationData = useSuperReactionAnimation(reaction.emoji);
    const hasAnimation = animationData !== null;
    const glowColor = isSuper ? getSuperReactionColor(reaction.emoji) : null;
    const animationPosition = getSuperReactionPosition(reaction.emoji);
    const burstRef = useRef<SuperReactionBurstHandle>(null);

    const handleClick = useCallback(() => {
        if (!reaction.viewerReacted && isSuper) {
            burstRef.current?.replay();
        }
        onToggle(reaction.emoji);
    }, [onToggle, reaction.emoji, reaction.viewerReacted, isSuper]);

    const chipClasses = [
        'relative inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-all duration-150',
        'hover:-translate-y-[1px] hover:wd-text-primary hover:shadow-[0_6px_14px_rgba(0,0,0,0.28)] active:translate-y-0',
        reaction.viewerReacted
            ? isSuper
                ? 'border-[var(--wd-accent)] bg-[var(--wd-accent)]/10 wd-text-primary'
                : 'wd-border-subtle wd-bg-elevated wd-text-primary'
            : 'wd-border-subtle wd-bg-elevated wd-text-secondary',
    ].filter(Boolean).join(' ');

    const superStyle = useMemo((): React.CSSProperties => {
        if (!isSuper || !glowColor) {
            return { boxShadow: 'none', borderColor: '', backgroundColor: '' };
        }
        return {
            boxShadow: `0 0 6px 1px rgba(${glowColor}, 0.25), 0 0 14px 5px rgba(${glowColor}, 0.10)`,
            borderColor: `rgba(${glowColor}, 0.35)`,
            backgroundColor: `rgba(${glowColor}, 0.12)`,
        };
    }, [isSuper, glowColor]);

    return (
        <div className="relative" style={{ overflow: 'visible' }}>
            <button
                type="button"
                data-reaction-chip="true"
                data-reaction-room-id={roomId}
                data-reaction-message-id={messageId}
                data-reaction-emoji={reaction.emoji}
                onClick={handleClick}
                onMouseEnter={(event) => onMouseEnter(event, reaction.emoji)}
                onMouseLeave={onMouseLeave}
                className={chipClasses}
                style={superStyle}
                title={`${reaction.count} reacted with ${reaction.emoji}`}
            >
                {customEmoji ? (
                    <img
                        src={customEmoji.imageUrl}
                        alt={`:${customEmoji.name}:`}
                        className="inline-block h-[18px] w-[18px]"
                        loading="lazy"
                    />
                ) : (
                    <TwemojiSpan emoji={reaction.emoji} size={18} />
                )}
                <span className="text-sm font-semibold">
                    {reaction.count}
                </span>
            </button>
            {hasAnimation ? (
                <SuperReactionBurst ref={burstRef} animationData={animationData} position={animationPosition} />
            ) : null}
        </div>
    );
}

export default React.memo(ReactionChipButton);
