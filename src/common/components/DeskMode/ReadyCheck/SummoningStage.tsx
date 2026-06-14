import React from "react";
import { motion } from "framer-motion";
import type { ChatV2CharacterCustomization } from "@/communication/chatV2/_types";
import type { ReadyCheckSnapshot } from "@/communication/readyCheck/_types";
import HearthSeat from "./HearthSeat";
import {
    RING_SEAT_LIMIT,
    resolutionCopy,
    seatPositions,
    titleFor,
    type RitualPhase,
} from "./_ritual";

interface SummoningStageProps {
    snapshot: ReadyCheckSnapshot;
    localUserId: number | null | undefined;
    avatarById: Map<
        number,
        { image?: string | null; characterCustomization?: ChatV2CharacterCustomization | null }
    >;
    phase: RitualPhase;
    remaining: number;
    /** True once the local user has responded (optimistic), to hide the choice. */
    hasLocalResponse: boolean;
    onRespond: (ready: boolean) => void;
    onCancel: () => void;
    onDismiss: () => void;
}

const BOX = 380;
const CENTER = BOX / 2;
const SEAT_RADIUS = 124;
const RING_R = 156;
const CIRC = 2 * Math.PI * RING_R;

function SummoningStage({
    snapshot,
    localUserId,
    avatarById,
    phase,
    remaining,
    hasLocalResponse,
    onRespond,
    onCancel,
    onDismiss,
}: SummoningStageProps) {
    const targets = snapshot.targets;
    const total = targets.length;
    const readyCount = targets.filter((t) => t.state === "ready").length;
    const pendingCount = targets.filter((t) => t.state === "pending").length;
    const fraction = total ? readyCount / total : 0;

    const localTarget = targets.find((t) => t.userId === localUserId);
    const isInvoker = snapshot.invokerUserId === localUserId;
    const isPendingLocal =
        localTarget?.state === "pending" && !snapshot.resolved && !hasLocalResponse;
    const canCancel = isInvoker && !snapshot.resolved;
    const res = resolutionCopy(snapshot.resolvedReason);
    const igniting = phase === "igniting";
    const useRing = total <= RING_SEAT_LIMIT;
    const positions = useRing ? seatPositions(total, SEAT_RADIUS) : [];

    return (
        <motion.div
            // Default state is fully visible; the entrance only adds a gentle
            // settle, so the panel never depends on JS to become visible.
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full max-w-[440px] flex-col items-center px-6"
        >
            <header className="mb-4 text-center">
                <motion.h2
                    id="ready-check-title"
                    key={res.locked ? "locked" : "active"}
                    initial={res.locked ? { scale: 0.84 } : false}
                    animate={res.locked ? { scale: 1 } : undefined}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className={`font-bold wd-text-primary text-balance ${
                        res.locked ? "text-2xl uppercase tracking-wide" : "text-lg"
                    }`}
                    style={
                        res.locked
                            ? { textShadow: "0 0 22px rgb(var(--wd-accent-rgb) / 0.7)" }
                            : undefined
                    }
                >
                    {snapshot.resolved ? res.heading : titleFor(snapshot.invokerDisplayName, isInvoker)}
                </motion.h2>
                <p className="mt-0.5 text-xs wd-text-muted">
                    {snapshot.resolved
                        ? `${readyCount} of ${total} ready`
                        : `Gather round · ${readyCount}/${total} in · ${remaining}s`}
                </p>
            </header>

            {/* ── The hearth ring ───────────────────────────────────── */}
            <div
                className="relative"
                style={{
                    width: useRing ? BOX : "100%",
                    height: useRing ? BOX : "auto",
                    // fill drives fire brightness + ring stroke
                    ["--wd-summon-fill" as string]: fraction,
                }}
            >
                {/* progress ring */}
                {useRing && (
                    <svg
                        className="absolute inset-0"
                        width={BOX}
                        height={BOX}
                        viewBox={`0 0 ${BOX} ${BOX}`}
                        aria-hidden
                    >
                        <circle
                            className="wd-summon-ring-track"
                            cx={CENTER}
                            cy={CENTER}
                            r={RING_R}
                            fill="none"
                            strokeWidth={2}
                        />
                        <circle
                            className="wd-summon-ring-fill"
                            cx={CENTER}
                            cy={CENTER}
                            r={RING_R}
                            fill="none"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeDasharray={CIRC}
                            strokeDashoffset={CIRC * (1 - fraction)}
                            transform={`rotate(-90 ${CENTER} ${CENTER})`}
                        />
                    </svg>
                )}

                {/* the fire */}
                <div className={`wd-summon-hearth${igniting ? " wd-summon-hearth--locked" : ""}`} />
                <div className={`wd-summon-embers${igniting ? " wd-summon-embers--burst" : ""}`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} />
                    ))}
                </div>

                {/* seats */}
                {useRing ? (
                    targets.map((t, i) => (
                        <HearthSeat
                            key={t.userId}
                            target={t}
                            image={avatarById.get(t.userId)?.image}
                            characterCustomization={avatarById.get(t.userId)?.characterCustomization}
                            isLocal={t.userId === localUserId}
                            offset={positions[i]}
                        />
                    ))
                ) : (
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-4 py-6">
                        {targets.map((t) => (
                            <HearthSeat
                                key={t.userId}
                                target={t}
                                image={avatarById.get(t.userId)?.image}
                                characterCustomization={avatarById.get(t.userId)?.characterCustomization}
                                isLocal={t.userId === localUserId}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Actions ───────────────────────────────────────────── */}
            <div className="mt-5 flex min-h-[44px] flex-col items-center gap-2">
                {isPendingLocal ? (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            data-autofocus
                            onClick={() => onRespond(true)}
                            className="h-11 rounded-xl px-7 text-sm font-bold transition-transform active:translate-y-px"
                            style={{
                                background:
                                    "linear-gradient(180deg, var(--wd-den-ember), var(--wd-accent))",
                                color: "color-mix(in srgb, var(--wd-accent) 22%, black)",
                                boxShadow:
                                    "0 2px 0 color-mix(in srgb, var(--wd-accent) 60%, black), 0 6px 18px rgb(var(--wd-accent-rgb) / 0.4)",
                            }}
                        >
                            I&apos;m in
                        </button>
                        <button
                            type="button"
                            onClick={() => onRespond(false)}
                            className="wd-btn-ghost h-11 rounded-xl border wd-border-strong px-6 text-sm font-semibold"
                        >
                            Not tonight
                        </button>
                    </div>
                ) : !snapshot.resolved ? (
                    <>
                        <p className="text-xs wd-text-muted">
                            {pendingCount > 0
                                ? `Waiting on ${pendingCount} more…`
                                : "Everyone's responded"}
                        </p>
                        <button
                            type="button"
                            onClick={canCancel ? onCancel : onDismiss}
                            className="text-xs wd-text-muted hover:wd-text-primary transition-colors"
                        >
                            {canCancel ? "Cancel ready check" : "Dismiss"}
                        </button>
                    </>
                ) : null}
            </div>
        </motion.div>
    );
}

export default SummoningStage;
