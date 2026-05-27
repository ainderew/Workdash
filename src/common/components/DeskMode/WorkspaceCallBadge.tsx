import React from "react";
import { Phone } from "lucide-react";
import useCallStore, {
    selectWorkspaceCallSummary,
} from "@/common/store/callStore";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkspaceCallBadgeProps {
    workspaceId: string;
}

function WorkspaceCallBadge({ workspaceId }: WorkspaceCallBadgeProps) {
    const totalParticipants = useCallStore(
        (s) => selectWorkspaceCallSummary(s, workspaceId).totalParticipants,
    );
    const channelCount = useCallStore(
        (s) => selectWorkspaceCallSummary(s, workspaceId).channelCount,
    );

    if (totalParticipants === 0) return null;

    const label =
        channelCount === 1
            ? `${totalParticipants} in call`
            : `${totalParticipants} across ${channelCount} calls`;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className="absolute -top-1 -right-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-[var(--wd-success)] px-1 py-[1px] text-[9px] font-bold text-white shadow-[0_0_0_2px_var(--wd-bg-app)] motion-safe:animate-pulse"
                    aria-label={label}
                >
                    <Phone size={8} className="shrink-0" />
                    {totalParticipants > 99 ? "99+" : totalParticipants}
                </span>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
                <span>{label}</span>
            </TooltipContent>
        </Tooltip>
    );
}

export default WorkspaceCallBadge;
