import React, { type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MailIcon, Loader2Icon } from "lucide-react";

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
      <div className="group relative">
        <MailIcon
          className="pointer-events-none absolute left-3.5 top-3.5 h-[18px] w-[18px] transition-colors group-focus-within:![color:var(--wd-login-accent)]"
          style={{ color: "var(--wd-login-text-muted)" }}
        />
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          autoComplete="email"
          className="h-12 w-full rounded-xl border border-[var(--wd-login-border)] pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-[var(--wd-login-accent)] focus:ring-3 focus:ring-[var(--wd-login-accent-soft)]"
          style={{
            backgroundColor: "var(--wd-login-surface-input)",
            color: "var(--wd-login-text)",
          }}
        />
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
            className="text-sm"
            style={{ color: "var(--wd-danger)" }}
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={!email.trim() || isSending}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wd-login-accent)]"
        style={{
          backgroundColor: "var(--wd-login-accent-soft)",
          color: "var(--wd-login-accent)",
        }}
      >
        {isSending ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send magic link"
        )}
      </button>
    </form>
  );
}
