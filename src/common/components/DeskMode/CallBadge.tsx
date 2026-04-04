import React from "react";
import { Phone } from "lucide-react";

interface CallBadgeProps {
  size?: "xs" | "sm";
}

export function CallBadge({ size = "xs" }: CallBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-[3px] bg-[var(--wd-call-badge-bg)] font-semibold uppercase tracking-wide text-[var(--wd-call-badge-text)] ${
        size === "xs"
          ? "px-[5px] py-px text-[0.5625rem]"
          : "px-1.5 py-0.5 text-[0.625rem]"
      }`}
    >
      <Phone
        size={size === "xs" ? 9 : 10}
        fill="currentColor"
        strokeWidth={0}
      />
    </span>
  );
}
