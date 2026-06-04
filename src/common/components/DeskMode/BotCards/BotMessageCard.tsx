import React from "react";
import type { ChatV2Message } from "@/communication/chatV2/_types";
import { SearchingCard } from "./SearchingCard";
import { NowPlayingCard } from "./NowPlayingCard";
import { QueuedCard } from "./QueuedCard";
import { QueueListCard } from "./QueueListCard";
import { NowPlayingInfoCard } from "./NowPlayingInfoCard";
import { ErrorCard } from "./ErrorCard";
import { SessionEndedCard } from "./SessionEndedCard";
import { GenericInfoCard } from "./GenericInfoCard";
import { RollCard } from "./RollCard";
import ReadyCheckBotCard from "../ReadyCheck/ReadyCheckBotCard";

interface BotMessageCardProps {
    message: ChatV2Message;
}

export function BotMessageCard({ message }: BotMessageCardProps) {
    const card = message.botCard;
    if (!card) return null;

    try {
        switch (card.type) {
            case "searching":
                return <SearchingCard card={card} />;
            case "now_playing":
                return <NowPlayingCard card={card} />;
            case "queued":
                return <QueuedCard card={card} />;
            case "queue_list":
                return <QueueListCard card={card} />;
            case "now_playing_info":
                return <NowPlayingInfoCard card={card} />;
            case "error":
                return <ErrorCard card={card} />;
            case "session_ended":
                return <SessionEndedCard />;
            case "generic_info":
                return <GenericInfoCard card={card} />;
            case "roll":
                return <RollCard card={card} />;
            case "ready-check":
                return (
                    <ReadyCheckBotCard
                        checkId={card.checkId}
                        channelId={card.channelId}
                    />
                );
            default:
                return null;
        }
    } catch {
        return null;
    }
}
