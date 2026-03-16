import React from "react";

export function AuthDivider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div
          className="w-full border-t"
          style={{ borderColor: "var(--wd-border-subtle)" }}
        />
      </div>
      <div className="relative flex justify-center text-xs">
        <span
          className="px-3"
          style={{
            backgroundColor: "var(--wd-surface-panel)",
            color: "var(--wd-text-muted)",
          }}
        >
          or
        </span>
      </div>
    </div>
  );
}
