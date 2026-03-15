import React from "react";
import { Info } from "lucide-react";
import type { BotCardGenericInfo } from "@/communication/chatV2/_types";

interface GenericInfoCardProps {
    card: BotCardGenericInfo;
}

export function GenericInfoCard({ card }: GenericInfoCardProps) {
    return (
        <div className="wd-bot-card rounded-lg px-3.5 py-2.5">
            <div className="flex items-center gap-2">
                <Info size={15} className="shrink-0 wd-text-accent" />
                <p className="text-[13px] wd-text-secondary">
                    {card.message}
                </p>
            </div>
        </div>
    );
}
