import React from "react";
import { Loader2, Monitor } from "lucide-react";

interface ScreenShareLoadingIndicatorProps {
  size?: "sm" | "md";
}

export function ScreenShareLoadingIndicator({
  size = "md",
}: ScreenShareLoadingIndicatorProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
      <Loader2
        size={size === "md" ? 32 : 20}
        className="animate-spin wd-text-muted"
      />
      <span className="text-xs wd-text-muted">
        <Monitor size={12} className="inline mr-1" />
        Connecting...
      </span>
    </div>
  );
}
