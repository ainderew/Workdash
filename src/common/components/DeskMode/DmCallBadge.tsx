import React from "react";
import { Phone } from "lucide-react";
import useCallStore, { selectDmCallSummary } from "@/common/store/callStore";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

function DmCallBadge() {
    const totalParticipants = useCallStore(
        (s) => selectDmCallSummary(s).totalParticipants,
    );
    const callCount = useCallStore((s) => selectDmCallSummary(s).callCount);

    if (totalParticipants === 0) return null;

    const label =
        callCount === 1
            ? `${totalParticipants} in DM call`
            : `${totalParticipants} across ${callCount} DM calls`;

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

export default DmCallBadge;
