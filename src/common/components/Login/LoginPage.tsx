import React, { useState, useCallback, useMemo } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LoginCard } from "./LoginCard";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { AuthDivider } from "./AuthDivider";
import { MagicLinkForm } from "./MagicLinkForm";
import { MagicLinkSent } from "./MagicLinkSent";
import { useMagicLink } from "@/common/hooks/useMagicLink";
import { Loader2Icon, ShieldCheckIcon } from "lucide-react";

type View = "options" | "email-sent";

export function LoginPage() {
  const { status } = useSession();
  const [view, setView] = useState<View>("options");
  const {
    email,
    setEmail,
    status: magicStatus,
    errorMessage,
    sendMagicLink,
    reset,
  } = useMagicLink();

  const inviteCode = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("invite");
  }, []);

  const callbackUrl = inviteCode ? `/invite/${inviteCode}` : undefined;

  const handleSendMagicLink = useCallback(async () => {
    await sendMagicLink(email, callbackUrl);
    setView("email-sent");
  }, [email, callbackUrl, sendMagicLink]);

  const handleResend = useCallback(async () => {
    await sendMagicLink(email, callbackUrl);
  }, [email, callbackUrl, sendMagicLink]);

  const handleBack = useCallback(() => {
    reset();
    setView("options");
  }, [reset]);

  if (status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--wd-surface-base)" }}
      >
        <Loader2Icon
          className="h-6 w-6 animate-spin"
          style={{ color: "var(--wd-accent)" }}
        />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ backgroundColor: "var(--wd-surface-base)" }}
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              backgroundColor: "var(--wd-accent-soft)",
              color: "var(--wd-accent)",
            }}
          >
            <ShieldCheckIcon className="h-7 w-7" />
          </div>
          <p
            className="text-lg font-semibold"
            style={{ color: "var(--wd-text-primary)" }}
          >
            You&rsquo;re signed in
          </p>
          <div className="flex w-60 flex-col gap-3">
            <Link
              href="/app"
              className="wd-btn-primary block rounded-lg py-2.5 text-center text-sm font-medium"
            >
              Continue to office
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="wd-btn-ghost rounded-lg py-2.5 text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "var(--wd-surface-base)" }}
    >
      <LoginCard>
        <AnimatePresence mode="wait" initial={false}>
          {view === "options" && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <GoogleSignInButton callbackUrl={callbackUrl} />
              <AuthDivider />
              <MagicLinkForm
                email={email}
                onEmailChange={setEmail}
                onSubmit={handleSendMagicLink}
                isSending={magicStatus === "sending"}
                errorMessage={errorMessage}
              />
            </motion.div>
          )}

          {view === "email-sent" && (
            <motion.div
              key="email-sent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <MagicLinkSent
                email={email}
                onResend={handleResend}
                onBack={handleBack}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </LoginCard>
    </div>
  );
}
