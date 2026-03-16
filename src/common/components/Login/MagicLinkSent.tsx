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
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--wd-accent-soft)",
          color: "var(--wd-accent)",
        }}
      >
        <MailIcon className="h-7 w-7" />
      </div>

      <div>
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--wd-text-primary)" }}
        >
          Check your email
        </h3>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--wd-text-secondary)" }}
        >
          We sent a sign-in link to{" "}
          <span
            className="font-medium"
            style={{ color: "var(--wd-text-primary)" }}
          >
            {masked}
          </span>
        </p>
      </div>

      <button
        onClick={handleResend}
        disabled={resendState === "sending" || cooldown > 0}
        className="wd-btn-ghost mt-1 flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
      >
        {resendState === "sending" ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : cooldown > 0 ? (
          `Resend in ${cooldown}s`
        ) : resendState === "sent" ? (
          "Resend email"
        ) : (
          "Resend email"
        )}
      </button>

      <button
        onClick={onBack}
        className="text-sm font-medium"
        style={{ color: "var(--wd-accent)" }}
      >
        Use a different email
      </button>
    </div>
  );
}
