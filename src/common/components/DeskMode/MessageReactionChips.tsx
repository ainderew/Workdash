import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChatV2MessageReaction } from "@/communication/chatV2/_types";
import useChatV2Store from "@/common/store/chatV2Store";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { getDisplayName } from "@/common/utils/displayName";
import ReactionPickerFlyout from "./ReactionPickerFlyout";
import TwemojiSpan from "./TwemojiSpan";

type MessageReactionChipsProps = {
    roomId: string;
    messageId: string;
    reactions?: ChatV2MessageReaction[];
    onToggleReaction?: (emoji: string) => void;
    className?: string;
};

type TooltipState = {
    emoji: string;
    x: number;
    y: number;
    reactors: Array<{
        id: number;
        name: string | null;
        nickname?: string | null;
        image: string | null;
    }>;
    totalCount: number;
    loading: boolean;
};

function SmileyFaceIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[20px] w-[20px]"
            aria-hidden="true"
        >
            <path d="M8.5 9v1" />
            <path d="M15.5 9v1" />
            <path d="M7.5 14c1.2 1.4 2.7 2 4.5 2s3.3-.6 4.5-2" />
        </svg>
    );
}

function ReactionAddIcon() {
    return (
        <span className="relative inline-flex h-[20px] w-[20px] items-center justify-center">
            <SmileyFaceIcon />
            <Plus size={15} className="absolute -right-[6px] -top-[6px]" />
        </span>
    );
}

function MessageReactionChips({
    roomId,
    messageId,
    reactions = [],
    onToggleReaction,
    className,
}: MessageReactionChipsProps) {
    const listReactionReactors = useChatV2Store(
        (state) => state.listReactionReactors,
    );
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const hideTimeoutRef = useRef<number | null>(null);

    const orderedReactions = useMemo(
        () =>
            [...reactions]
                .filter((reaction) => reaction.count > 0)
                .sort((a, b) => {
                    const aTime = new Date(a.firstReactedAt).getTime();
                    const bTime = new Date(b.firstReactedAt).getTime();
                    if (aTime !== bTime) return aTime - bTime;
                    return a.emoji.localeCompare(b.emoji);
                }),
        [reactions],
    );

    useEffect(
        () => () => {
            if (hideTimeoutRef.current) {
                window.clearTimeout(hideTimeoutRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        if (!tooltip) return;

        const close = () => setTooltip(null);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);

        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [tooltip]);

    useEffect(() => {
        if (!isPickerOpen) return;

        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-reaction-add-picker='true']")) return;
            if (target?.closest("[data-message-reaction-picker='true']"))
                return;
            setIsPickerOpen(false);
        };

        window.addEventListener("mousedown", onMouseDown);
        return () => window.removeEventListener("mousedown", onMouseDown);
    }, [isPickerOpen]);

    const closeTooltipSoon = () => {
        if (hideTimeoutRef.current) {
            window.clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = window.setTimeout(() => {
            setTooltip(null);
        }, 120);
    };

    const keepTooltipOpen = () => {
        if (hideTimeoutRef.current) {
            window.clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    };

    const openTooltip = (
        event: React.MouseEvent<HTMLButtonElement>,
        emoji: string,
    ) => {
        keepTooltipOpen();
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltip({
            emoji,
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            reactors: [],
            totalCount: 0,
            loading: true,
        });

        void listReactionReactors(roomId, messageId, emoji, {
            limit: 20,
        })
            .then((result) => {
                setTooltip((current) => {
                    if (!current || current.emoji !== emoji) {
                        return current;
                    }
                    return {
                        ...current,
                        reactors: result.reactors,
                        totalCount: result.totalCount,
                        loading: false,
                    };
                });
            })
            .catch(() => {
                setTooltip((current) => {
                    if (!current || current.emoji !== emoji) {
                        return current;
                    }
                    return {
                        ...current,
                        reactors: [],
                        totalCount: 0,
                        loading: false,
                    };
                });
            });
    };

    if (orderedReactions.length === 0) {
        return null;
    }

    return (
        <div
            className={`mt-2 ml-2 flex flex-wrap items-center gap-1 ${className || ""}`}
        >
            {orderedReactions.map((reaction) => (
                <button
                    key={`${messageId}-${reaction.emoji}`}
                    type="button"
                    data-reaction-chip="true"
                    data-reaction-room-id={roomId}
                    data-reaction-message-id={messageId}
                    data-reaction-emoji={reaction.emoji}
                    onClick={() => onToggleReaction?.(reaction.emoji)}
                    onMouseEnter={(event) => openTooltip(event, reaction.emoji)}
                    onMouseLeave={closeTooltipSoon}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-all duration-150 hover:-translate-y-[1px] hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] hover:shadow-[0_6px_14px_rgba(0,0,0,0.28)] active:translate-y-0 ${
                        reaction.viewerReacted
                            ? "border-[var(--wd-accent)] bg-[var(--wd-accent)]/10 wd-text-primary"
                            : "wd-border-subtle wd-bg-elevated wd-text-secondary"
                    }`}
                    title={`${reaction.count} reacted with ${reaction.emoji}`}
                >
                    <TwemojiSpan emoji={reaction.emoji} size={18} />
                    <span className="text-sm font-semibold">
                        {reaction.count}
                    </span>
                </button>
            ))}

            <div className="relative" data-reaction-add-picker="true">
                <button
                    type="button"
                    onClick={() => setIsPickerOpen((current) => !current)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border wd-border-subtle wd-bg-elevated px-2.5 py-1 text-xs wd-text-secondary transition-all duration-150 hover:-translate-y-[1px] hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] hover:shadow-[0_6px_14px_rgba(0,0,0,0.28)] active:translate-y-0"
                    title="Add emoji reaction"
                    aria-label="Add emoji reaction"
                >
                    <ReactionAddIcon />
                </button>

                {isPickerOpen ? (
                    <ReactionPickerFlyout
                        className="absolute left-0 top-[calc(100%+8px)] z-[190]"
                        onSelectEmoji={(emoji) => {
                            onToggleReaction?.(emoji);
                            setIsPickerOpen(false);
                        }}
                        onClose={() => setIsPickerOpen(false)}
                    />
                ) : null}
            </div>

            {tooltip && typeof window !== "undefined"
                ? createPortal(
                      <div
                          className="fixed z-[230]"
                          style={{
                              left: tooltip.x,
                              top: tooltip.y,
                              transform: "translate(-50%, -100%)",
                          }}
                          onMouseEnter={keepTooltipOpen}
                          onMouseLeave={closeTooltipSoon}
                      >
                          <div className="min-w-[240px] max-w-[320px] rounded-xl border wd-border-strong wd-bg-panel p-3 shadow-[0_20px_45px_rgba(0,0,0,0.55)]">
                              <div className="flex items-center justify-center pb-2">
                                  <TwemojiSpan
                                      emoji={tooltip.emoji}
                                      size={32}
                                  />
                              </div>

                              {tooltip.loading ? (
                                  <p className="text-xs wd-text-muted">
                                      Loading reactors...
                                  </p>
                              ) : tooltip.reactors.length === 0 ? (
                                  <p className="text-xs wd-text-muted">
                                      No reactors yet.
                                  </p>
                              ) : (
                                  <div className="space-y-1">
                                      {tooltip.reactors
                                          .slice(0, 20)
                                          .map((reactor) => {
                                              const reactorName =
                                                  getDisplayName(
                                                      reactor,
                                                      `User ${reactor.id}`,
                                                  );
                                              return (
                                                  <div
                                                      key={`${tooltip.emoji}-${reactor.id}`}
                                                      className="flex items-center gap-2 rounded-md px-1.5 py-1 wd-bg-panel-2"
                                                  >
                                                      <span className="h-6 w-6 shrink-0 rounded-full overflow-hidden border wd-border-subtle wd-bg-elevated inline-flex items-center justify-center text-[10px] font-semibold wd-text-primary">
                                                          {reactor.image ? (
                                                              <img
                                                                  src={
                                                                      reactor.image
                                                                  }
                                                                  alt={
                                                                      reactorName
                                                                  }
                                                                  className="h-full w-full object-cover"
                                                              />
                                                          ) : (
                                                              reactorName
                                                                  .charAt(0)
                                                                  .toUpperCase()
                                                          )}
                                                      </span>
                                                      <span className="text-xs wd-text-primary truncate">
                                                          {reactorName}
                                                      </span>
                                                  </div>
                                              );
                                          })}

                                      {tooltip.totalCount >
                                      tooltip.reactors.length ? (
                                          <p className="pt-1 text-xs font-medium wd-text-muted">
                                              +
                                              {tooltip.totalCount -
                                                  tooltip.reactors.length}{" "}
                                              others
                                          </p>
                                      ) : null}
                                  </div>
                              )}
                          </div>
                      </div>,
                      window.document.body,
                  )
                : null}
        </div>
    );
}

export default MessageReactionChips;
