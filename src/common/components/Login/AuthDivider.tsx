import React from "react";

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div
          className="w-full"
          style={{
            borderTop: "1px solid var(--wd-login-border)",
            opacity: 0.5,
          }}
        />
      </div>
      <div className="relative flex justify-center">
        <span
          className="px-4 text-xs uppercase tracking-widest"
          style={{
            backgroundColor: "var(--wd-login-surface)",
            color: "var(--wd-login-text-muted)",
          }}
        >
          or
        </span>
      </div>
    </div>
  );
}
