import React from "react";
import type { ChatV2Room } from "@/communication/chatV2/_types";

interface RoomHeaderProps {
    room: ChatV2Room | null;
}

function RoomHeader({ room }: RoomHeaderProps) {
    return (
        <header className="h-14 border-b wd-border-subtle px-5 flex items-center wd-bg-panel-2 backdrop-blur">
            <div>
                <div className="text-sm font-semibold wd-text-primary">
                    {room ? `# ${room.name}` : "Select a room"}
                </div>
                <div className="text-xs wd-text-muted">
                    {room?.topic || "Persistent room chat"}
                </div>
            </div>
        </header>
    );
}

export default RoomHeader;
