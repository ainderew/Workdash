import React, { type FormEvent } from "react";
import { MailIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";

interface Props {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  errorMessage: string | null;
}

export function MagicLinkForm({
  email,
  onEmailChange,
  onSubmit,
  isSending,
  errorMessage,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSending) return;
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <MailIcon
          className="pointer-events-none absolute left-3 top-3 h-5 w-5"
          style={{ color: "var(--wd-text-muted)" }}
        />
        <input
          type="email"
          placeholder="name@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          autoComplete="email"
          className="wd-input pl-10"
        />
      </div>

      {errorMessage && (
        <p className="text-sm" style={{ color: "var(--wd-danger)" }}>
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!email.trim() || isSending}
        className="wd-btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium"
      >
        {isSending ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            Continue with email
            <ArrowRightIcon className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
