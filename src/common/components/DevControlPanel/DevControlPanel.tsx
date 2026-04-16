import React, { useEffect, useState } from "react";
import { CONFIG } from "@/common/utils/config";
import useUserStore from "@/common/store/useStore";
import useChatV2Store from "@/common/store/chatV2Store";
import { useActivityStore } from "@/common/store/activityStore";

const IS_DEV = process.env.NODE_ENV !== "production";

type ApiResult = { ok: boolean; cleared?: boolean; title?: string } | null;

export default function DevControlPanel() {
    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState("Dota 2");
    const [lastResult, setLastResult] = useState<ApiResult>(null);
    const [busy, setBusy] = useState(false);

    const userId = useUserStore((s) => s.backendUser?.id ?? null);
    const selectedWorkspaceId = useChatV2Store((s) => s.selectedWorkspaceId);
    const dotaActivity = useActivityStore((s) => {
        if (userId === null) return undefined;
        // Prefer the currently-selected workspace, but fall back to any
        // workspace the user has a Dota slot in — the backend fans out to
        // every membership, so ACTIVE should reflect that reality.
        if (selectedWorkspaceId) {
            const direct = s.activityMap[selectedWorkspaceId]?.[userId]?.["dota"];
            if (direct) return direct;
        }
        for (const wsId of Object.keys(s.activityMap)) {
            const fallback = s.activityMap[wsId]?.[userId]?.["dota"];
            if (fallback) return fallback;
        }
        return undefined;
    });

    useEffect(() => {
        if (!IS_DEV) return;
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
                setExpanded((v) => !v);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    if (!IS_DEV) return null;
    if (userId === null) return null;

    const simulateDota = async (on: boolean) => {
        setBusy(true);
        try {
            const params = new URLSearchParams({
                userId: String(userId),
                on: on ? "1" : "0",
            });
            if (on && title) params.set("title", title);
            const res = await fetch(
                `${CONFIG.SFU_SERVER_URL}/api/dev/dota-activity?${params.toString()}`,
            );
            const data = (await res.json()) as ApiResult;
            setLastResult(data);
        } catch (err) {
            setLastResult({ ok: false });
            console.error("[dev-panel] simulate failed", err);
        } finally {
            setBusy(false);
        }
    };

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                title="Dev controls (Ctrl+Shift+D)"
                aria-label="Open dev control panel"
                className="fixed bottom-4 left-4 z-[9999] h-8 w-8 rounded-full bg-[var(--wd-surface-panel)] border border-[var(--wd-border-subtle)] wd-text-muted hover:wd-text-primary flex items-center justify-center text-xs font-mono shadow-lg"
            >
                {"{}"}
            </button>
        );
    }

    const isActive = Boolean(dotaActivity);

    return (
        <div className="fixed bottom-4 left-4 z-[9999] w-72 rounded-md bg-[var(--wd-surface-panel)] border border-[var(--wd-border-subtle)] shadow-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wide wd-text-muted">
                        Dev Controls
                    </span>
                    <span className="text-[10px] wd-text-muted">
                        user #{userId}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    aria-label="Close dev panel"
                    className="wd-text-muted hover:wd-text-primary text-xs"
                >
                    ×
                </button>
            </div>

            <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium wd-text-secondary">
                        Dota 2 activity
                    </span>
                    <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isActive
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-white/5 wd-text-muted"
                        }`}
                    >
                        {isActive ? "ACTIVE" : "off"}
                    </span>
                </div>

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Dota 2"
                    className="w-full px-2 py-1 text-xs rounded border border-[var(--wd-border-subtle)] bg-[var(--wd-surface-base)] wd-text-primary focus:outline-none focus:border-[var(--wd-accent)]"
                />

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => simulateDota(true)}
                        disabled={busy}
                        className="flex-1 px-2 py-1.5 text-xs rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 transition-colors"
                    >
                        Start match
                    </button>
                    <button
                        type="button"
                        onClick={() => simulateDota(false)}
                        disabled={busy}
                        className="flex-1 px-2 py-1.5 text-xs rounded bg-white/5 wd-text-secondary hover:bg-white/10 disabled:opacity-40 transition-colors"
                    >
                        End match
                    </button>
                </div>

                {lastResult && (
                    <p className="text-[10px] font-mono wd-text-muted">
                        last: {lastResult.ok ? "ok" : "failed"}
                        {lastResult.cleared
                            ? " → cleared"
                            : lastResult.title
                              ? ` → ${lastResult.title}`
                              : ""}
                    </p>
                )}
            </section>

            <p className="text-[10px] wd-text-muted">
                Toggle panel with Ctrl+Shift+D. Hidden in production.
            </p>
        </div>
    );
}
