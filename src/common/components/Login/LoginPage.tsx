import React, { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { signOutWithCleanup } from "@/common/utils/signOutWithCleanup";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LoginCard } from "./LoginCard";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { AuthDivider } from "./AuthDivider";
import { MagicLinkForm } from "./MagicLinkForm";
import { MagicLinkSent } from "./MagicLinkSent";
import { useMagicLink } from "@/common/hooks/useMagicLink";
import { trackEvent } from "@/common/utils/trackEvent";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";

type View = "options" | "email-sent";

const easeOutQuart: [number, number, number, number] = [0.25, 1, 0.5, 1];

function LoginBackground() {
  return (
    <>
      {/* Ambient gradient orbs */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="wd-login-glow wd-login-glow--1 -left-48 top-[10%] h-[600px] w-[600px]"
          style={{ backgroundColor: "var(--wd-login-accent)", opacity: 0.1 }}
        />
        <div
          className="wd-login-glow wd-login-glow--2 -right-40 bottom-[5%] h-[500px] w-[500px]"
          style={{ backgroundColor: "var(--wd-login-accent)", opacity: 0.07 }}
        />
        <div
          className="wd-login-glow wd-login-glow--3 left-[40%] -top-32 h-[400px] w-[400px]"
          style={{ backgroundColor: "var(--wd-login-accent)", opacity: 0.05 }}
        />
      </div>

      {/* Presence dots — life inside */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="wd-login-presence-dot left-[12%] top-[28%] h-1.5 w-1.5"
          style={{
            backgroundColor: "var(--wd-login-accent)",
            animationDelay: "0s",
          }}
        />
        <div
          className="wd-login-presence-dot right-[18%] top-[22%] h-1 w-1"
          style={{
            backgroundColor: "var(--wd-login-accent)",
            animationDelay: "2.5s",
          }}
        />
        <div
          className="wd-login-presence-dot left-[22%] bottom-[32%] h-1 w-1"
          style={{
            backgroundColor: "var(--wd-login-accent)",
            animationDelay: "5s",
          }}
        />
        <div
          className="wd-login-presence-dot right-[25%] bottom-[18%] h-1.5 w-1.5"
          style={{
            backgroundColor: "var(--wd-login-accent)",
            animationDelay: "7.5s",
          }}
        />
        <div
          className="wd-login-presence-dot left-[45%] top-[15%] h-1 w-1"
          style={{
            backgroundColor: "var(--wd-login-accent)",
            animationDelay: "4s",
          }}
        />
      </div>
    </>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
    trackEvent("sign_in_started", { method: "magic_link" });
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
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
        style={{ backgroundColor: "var(--wd-login-surface-input)" }}
      >
        <LoginBackground />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 flex flex-col items-center gap-3"
        >
          <Loader2Icon
            className="h-5 w-5 animate-spin"
            style={{ color: "var(--wd-login-accent)" }}
          />
          <p
            className="text-sm"
            style={{ color: "var(--wd-login-text-muted)" }}
          >
            Stepping in...
          </p>
        </motion.div>
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
        style={{ backgroundColor: "var(--wd-login-surface-input)" }}
      >
        <LoginBackground />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutQuart }}
          className="relative z-10 w-full max-w-[420px] rounded-3xl px-10 py-12"
          style={{
            backgroundColor: "var(--wd-login-surface)",
            boxShadow:
              "0 25px 60px -15px rgb(0 0 0 / 0.3), 0 0 80px -20px var(--wd-login-accent-soft)",
          }}
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <div>
              <p
                className="text-xl font-semibold"
                style={{ color: "var(--wd-login-text)" }}
              >
                {getGreeting()}
              </p>
              <p
                className="mt-1.5 text-sm"
                style={{ color: "var(--wd-login-text-muted)" }}
              >
                Your team is waiting
              </p>
            </div>
            <div className="flex w-full flex-col gap-3">
              <Link
                href="/app"
                className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-center text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0 active:shadow-none"
                style={{ backgroundColor: "var(--wd-login-accent)" }}
              >
                Enter WorkDash
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <button
                onClick={() => signOutWithCleanup({ callbackUrl: "/login" })}
                className="py-2.5 text-sm transition-opacity duration-150 hover:opacity-70"
                style={{ color: "var(--wd-login-text-muted)" }}
              >
                Sign out
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: "var(--wd-login-surface-input)" }}
    >
      <LoginBackground />
      <LoginCard>
        <AnimatePresence mode="wait" initial={false}>
          {view === "options" && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: easeOutQuart }}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: easeOutQuart }}
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
