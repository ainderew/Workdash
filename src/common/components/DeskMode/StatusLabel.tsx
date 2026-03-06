import React from "react";
import { usePresenceStore } from "@/common/store/presenceStore";

export default function StatusLabel() {
    const myStatus = usePresenceStore((s) => s.myStatus);

    return (
        <p className="text-xs wd-text-muted truncate text-left leading-tight">
            {myStatus.label}
        </p>
    );
}
