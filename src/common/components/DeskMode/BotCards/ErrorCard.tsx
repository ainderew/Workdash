import React from "react";
import { AlertTriangle } from "lucide-react";
import type { BotCardError } from "@/communication/chatV2/_types";

interface ErrorCardProps {
    card: BotCardError;
}

export function ErrorCard({ card }: ErrorCardProps) {
    return (
        <div className="wd-bot-card wd-bot-card--danger rounded-lg px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={15} className="shrink-0 text-[var(--wd-danger)]" />
                <span className="text-xs font-medium text-[var(--wd-danger)]">
                    Error
                </span>
            </div>
            <p className="text-[13px] wd-text-secondary">
                {card.message}
            </p>
        </div>
    );
}
