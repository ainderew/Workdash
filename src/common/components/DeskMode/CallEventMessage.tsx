import React from "react";
import { PhoneOff } from "lucide-react";
import type { ChatV2Message } from "@/communication/chatV2/_types";

interface CallEventMessageProps {
    message: ChatV2Message;
}

export function CallEventMessage({ message }: CallEventMessageProps) {
    const displayName =
        (message.metadata?.displayName as string) ?? "Someone";

    return (
        <div className="my-1.5 flex items-center gap-3 px-1 select-none">
            <div className="flex-1 border-t wd-border-subtle" />
            <span className="inline-flex items-center gap-1.5 text-[11px] wd-text-muted">
                <PhoneOff className="h-3 w-3" />
                <span>
                    <span className="font-medium">{displayName}</span> left the
                    call
                </span>
            </span>
            <div className="flex-1 border-t wd-border-subtle" />
        </div>
    );
}
