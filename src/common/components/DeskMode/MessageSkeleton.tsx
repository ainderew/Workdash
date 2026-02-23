import React from "react";

const SKELETON_WIDTHS = [
    ["w-20", "w-full"],
    ["w-16", "w-3/4"],
    ["w-24", "w-5/6"],
    ["w-14", "w-2/3"],
    ["w-20", "w-4/5"],
];

function MessageSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4 px-1">
            {Array.from({ length: count }, (_, i) => {
                const [nameWidth, contentWidth] =
                    SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]!;
                return (
                    <div key={i} className="flex items-start gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full animate-pulse wd-bg-elevated" />
                        <div className="flex-1 space-y-2 pt-0.5">
                            <div
                                className={`h-3 ${nameWidth} rounded animate-pulse wd-bg-elevated`}
                            />
                            <div
                                className={`h-3 ${contentWidth} rounded animate-pulse wd-bg-elevated`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default MessageSkeleton;
