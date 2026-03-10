import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import type { ChatV2MessageReaction } from '@/communication/chatV2/_types';
import { useLongPress } from '@/common/hooks/useLongPress';
import { useSuperReactionAnimation } from '@/common/hooks/useSuperReactionAnimation';
import SuperReactionBurst from './SuperReactionBurst';
import TwemojiSpan from './TwemojiSpan';

function SparkleIcon() {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
            className="wd-text-accent shrink-0"
            aria-hidden="true"
        >
            <path d="M5 0l1.12 3.38L10 5 6.12 6.62 5 10 3.88 6.62 0 5l3.88-1.62z" />
        </svg>
    );
}

type ReactionChipButtonProps = {
    reaction: ChatV2MessageReaction;
    messageId: string;
    roomId: string;
    onToggle: (emoji: string) => void;
    onSuperReaction?: (emoji: string) => void;
    onMouseEnter: (event: React.MouseEvent<HTMLButtonElement>, emoji: string) => void;
    onMouseLeave: () => void;
    dismissTooltip: () => void;
};

function ReactionChipButton({
    reaction,
    messageId,
    roomId,
    onToggle,
    onSuperReaction,
    onMouseEnter,
    onMouseLeave,
    dismissTooltip,
}: ReactionChipButtonProps) {
    const [burstId, setBurstId] = useState<string | null>(null);
    const [isPulsing, setIsPulsing] = useState(false);
    const { preload, getAnimationData } = useSuperReactionAnimation(reaction.emoji);

    const handleLongPress = useCallback(() => {
        if (!reaction.viewerReacted || !onSuperReaction) return;
        onSuperReaction(reaction.emoji);
        setBurstId(`${Date.now()}`);
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 300);
    }, [reaction.viewerReacted, reaction.emoji, onSuperReaction]);

    const longPress = useLongPress(handleLongPress, {
        delay: 500,
        onLongPressStart: () => {
            dismissTooltip();
            preload();
        },
    });

    const handleClick = useCallback(() => {
        if (longPress.shouldSuppressClick()) return;
        onToggle(reaction.emoji);
    }, [longPress, onToggle, reaction.emoji]);

    const handleBurstComplete = useCallback(() => {
        setBurstId(null);
    }, []);

    const hasSuper = (reaction.superCount ?? 0) > 0;
    const isViewerSuper = !!reaction.viewerSuperReacted;

    const chipClasses = [
        'relative inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-all duration-150',
        'hover:-translate-y-[1px] hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] hover:shadow-[0_6px_14px_rgba(0,0,0,0.28)] active:translate-y-0',
        reaction.viewerReacted
            ? 'border-[var(--wd-accent)] bg-[var(--wd-accent)]/10 wd-text-primary'
            : 'wd-border-subtle wd-bg-elevated wd-text-secondary',
        hasSuper ? 'wd-super-reaction-glow' : '',
        isViewerSuper ? 'bg-[var(--wd-accent)]/20' : '',
    ].filter(Boolean).join(' ');

    const pointerHandlers = reaction.viewerReacted
        ? {
            onPointerDown: longPress.onPointerDown,
            onPointerUp: longPress.onPointerUp,
            onPointerLeave: () => {
                longPress.onPointerLeave();
                onMouseLeave();
            },
            onPointerCancel: longPress.onPointerCancel,
            onPointerMove: longPress.onPointerMove,
            onContextMenu: longPress.onContextMenu,
        }
        : {};

    return (
        <motion.div
            className="relative"
            style={{ overflow: 'visible' }}
            animate={isPulsing ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.3 }}
        >
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
                title={`${reaction.count} reacted with ${reaction.emoji}${hasSuper ? ` (${reaction.superCount} super)` : ''}`}
                style={reaction.viewerReacted ? { touchAction: 'none' } : undefined}
                {...pointerHandlers}
            >
                <TwemojiSpan emoji={reaction.emoji} size={18} />
                <span className="text-sm font-semibold">
                    {reaction.count}
                </span>
                {hasSuper ? <SparkleIcon /> : null}
            </button>
            <SuperReactionBurst
                animationData={getAnimationData()}
                burstId={burstId}
                onComplete={handleBurstComplete}
            />
        </motion.div>
    );
}

export default React.memo(ReactionChipButton);
