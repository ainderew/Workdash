import React from "react";
import { Loader2 } from "lucide-react";
import type { BotCardSearching } from "@/communication/chatV2/_types";

interface SearchingCardProps {
    card: BotCardSearching;
}

function sanitizeQuery(query: string): string {
    try {
        const url = new URL(query);
        const host = url.hostname.replace(/^www\./, "");
        if (host.includes("youtube") || host === "youtu.be") return "a YouTube link";
        if (host.includes("soundcloud")) return "a SoundCloud link";
        return `a link on ${host}`;
    } catch {
        return query;
    }
}

export function SearchingCard({ card }: SearchingCardProps) {
    const displayQuery = sanitizeQuery(card.query);

    return (
        <div className="wd-bot-card wd-bot-card--searching flex items-center gap-2.5 rounded-lg px-3.5 py-2.5">
            <Loader2
                size={15}
                className="shrink-0 animate-spin wd-text-muted"
            />
            <div className="min-w-0">
                <span className="text-xs font-medium wd-text-muted">
                    Searching
                </span>
                <p className="truncate text-[13px] italic wd-text-secondary">
                    &ldquo;{displayQuery}&rdquo;
                </p>
            </div>
        </div>
    );
}
