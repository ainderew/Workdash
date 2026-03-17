import React, { useState, useCallback, useEffect } from "react";
import { MailIcon, Loader2Icon } from "lucide-react";

interface Props {
  email: string;
  onResend: () => Promise<void>;
  onBack: () => void;
}

export function MagicLinkSent({ email, onResend, onBack }: Props) {
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (resendState === "sending" || cooldown > 0) return;
    setResendState("sending");
    await onResend();
    setResendState("sent");
    setCooldown(60);
  }, [onResend, resendState, cooldown]);

  const masked =
    email.length > 4
      ? email.slice(0, 3) + "***" + email.slice(email.indexOf("@"))
      : email;

  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      <div
        className="wd-login-icon-pop flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--wd-login-accent-soft)",
          color: "var(--wd-login-accent)",
        }}
      >
        <MailIcon className="h-6 w-6" />
      </div>

      <div>
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--wd-login-text)" }}
        >
          Check your inbox
        </h3>
        <p
          className="mt-1.5 text-sm"
          style={{ color: "var(--wd-login-text-sub)" }}
        >
          We sent a magic link to{" "}
          <span
            className="font-medium"
            style={{ color: "var(--wd-login-text)" }}
          >
            {masked}
          </span>
        </p>
      </div>

      <button
        onClick={handleResend}
        disabled={resendState === "sending" || cooldown > 0}
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wd-login-accent)]"
        style={{
          backgroundColor: "var(--wd-login-accent-soft)",
          color: "var(--wd-login-accent)",
        }}
      >
        {resendState === "sending" ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : cooldown > 0 ? (
          `Resend in ${cooldown}s`
        ) : (
          "Resend email"
        )}
      </button>

      <button
        onClick={onBack}
        className="text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: "var(--wd-login-accent)" }}
      >
        Use a different email
      </button>
    </div>
  );
}
