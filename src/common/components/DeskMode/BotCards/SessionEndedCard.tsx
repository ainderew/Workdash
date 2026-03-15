import React from "react";
import { Square } from "lucide-react";

export function SessionEndedCard() {
    return (
        <div className="wd-bot-card wd-bot-card--muted rounded-lg px-3.5 py-2.5">
            <div className="flex items-center gap-2">
                <Square size={13} className="shrink-0 wd-text-muted" />
                <span className="text-xs wd-text-muted">
                    Music session ended
                </span>
            </div>
        </div>
    );
}
