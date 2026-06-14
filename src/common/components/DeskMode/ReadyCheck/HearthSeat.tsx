import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, X, Moon } from "lucide-react";
import UserAvatar from "../UserAvatar";
import type {
    ReadyCheckResponseState,
    ReadyCheckTarget,
} from "@/communication/readyCheck/_types";
import type { ChatV2CharacterCustomization } from "@/communication/chatV2/_types";
import { SEAT_STATE } from "./_ritual";

interface HearthSeatProps {
    target: ReadyCheckTarget;
    image?: string | null;
    characterCustomization?: ChatV2CharacterCustomization | null;
    isLocal: boolean;
    /** px offset from the ring centre; omit for grid layout. */
    offset?: { x: number; y: number };
}

const BADGE_ICON: Partial<
    Record<ReadyCheckResponseState, React.ComponentType<{ size?: number }>>
> = {
    ready: Check,
    "not-ready": X,
    focused: Moon,
};

function HearthSeat({
    target,
    image,
    characterCustomization,
    isLocal,
    offset,
}: HearthSeatProps) {
    const reduce = useReducedMotion();
    const state = target.state;
    const isReady = state === "ready";
    const isPending = state === "pending";
    const { token, label } = SEAT_STATE[state];
    const Badge = BADGE_ICON[state];

    // One-shot flare when a seat transitions into "ready".
    const prev = useRef<ReadyCheckResponseState>(state);
    const [flareKey, setFlareKey] = useState(0);
    useEffect(() => {
        if (state === "ready" && prev.current !== "ready" && !reduce) {
            setFlareKey((k) => k + 1);
        }
        prev.current = state;
    }, [state, reduce]);

    const positioned = offset
        ? {
              position: "absolute" as const,
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          }
        : undefined;

    return (
        <div style={positioned} className="flex flex-col items-center gap-1.5 w-20">
            <motion.div
                className="relative"
                animate={
                    reduce
                        ? {}
                        : isReady
                          ? { y: -4, scale: 1.05 }
                          : state === "not-ready"
                            ? { y: 2, scale: 0.95, opacity: 0.72 }
                            : { y: 0, scale: 1 }
                }
                transition={{ type: "spring", stiffness: 360, damping: 22 }}
            >
                <div
                    className={isPending && !reduce ? "wd-summon-seat--idle" : undefined}
                    style={{
                        borderRadius: 9999,
                        padding: 2,
                        transition: "box-shadow 0.4s ease, filter 0.4s ease",
                        filter: isReady ? "none" : "brightness(0.6) saturate(0.7)",
                        boxShadow: isReady
                            ? "0 0 22px rgb(var(--wd-accent-rgb) / 0.55), 0 0 6px rgb(var(--wd-accent-rgb) / 0.7)"
                            : "none",
                    }}
                >
                    <div
                        style={{
                            borderRadius: 9999,
                            boxShadow: `0 0 0 2px ${
                                isReady ? "var(--wd-den-ember)" : token
                            }`,
                            opacity: isPending ? 0.6 : 1,
                        }}
                    >
                        <UserAvatar
                            name={target.displayName}
                            image={image}
                            characterCustomization={characterCustomization}
                            size="lg"
                        />
                    </div>
                </div>

                {Badge && (
                    <div
                        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                        style={{
                            background: token,
                            color: "color-mix(in srgb, var(--wd-surface-base) 78%, black)",
                            boxShadow: "0 0 0 2px rgb(var(--wd-surface-panel-rgb))",
                        }}
                    >
                        <Badge size={11} />
                    </div>
                )}

                <AnimatePresence>
                    {flareKey > 0 && (
                        <motion.span
                            key={flareKey}
                            className="pointer-events-none absolute inset-0 rounded-full"
                            style={{ boxShadow: "0 0 0 2px var(--wd-den-ember)" }}
                            initial={{ scale: 0.7, opacity: 0.9 }}
                            animate={{ scale: 1.9, opacity: 0 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                    )}
                </AnimatePresence>
            </motion.div>

            <div className="flex flex-col items-center gap-0.5 text-center">
                <span
                    className="max-w-full truncate text-xs font-semibold"
                    style={{
                        color: isReady
                            ? "var(--wd-text-primary)"
                            : isPending
                              ? "var(--wd-text-muted)"
                              : token,
                    }}
                >
                    {target.displayName}
                </span>
                <span className="text-[10px] font-medium" style={{ color: token }}>
                    {isLocal ? "you" : label}
                </span>
            </div>
        </div>
    );
}

export default HearthSeat;
