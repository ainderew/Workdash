import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import Head from "next/head";
import { Loader2Icon, AlertCircleIcon } from "lucide-react";
import Link from "next/link";

type VerifyState = "verifying" | "success" | "error";

export default function MagicLinkVerifyPage() {
  const router = useRouter();
  const { token, callbackUrl } = router.query;
  const [state, setState] = useState<VerifyState>("verifying");
  const attempted = useRef(false);

  useEffect(() => {
    if (!router.isReady || !token || typeof token !== "string") return;
    if (attempted.current) return;
    attempted.current = true;

    const verify = async () => {
      const result = await signIn("magic-link", {
        token,
        redirect: false,
      });

      if (result?.ok) {
        setState("success");
        const redirect =
          typeof callbackUrl === "string" ? callbackUrl : "/app";
        void router.replace(redirect);
      } else {
        setState("error");
      }
    };

    void verify();
  }, [router.isReady, token, callbackUrl, router]);

  return (
    <>
      <Head>
        <title>Verifying — WorkDash</title>
      </Head>
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ backgroundColor: "var(--wd-surface-base)" }}
      >
        <div className="w-full max-w-sm text-center">
          {state === "verifying" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2Icon
                className="h-8 w-8 animate-spin"
                style={{ color: "var(--wd-accent)" }}
              />
              <p style={{ color: "var(--wd-text-secondary)" }}>
                Verifying your magic link...
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2Icon
                className="h-8 w-8 animate-spin"
                style={{ color: "var(--wd-accent)" }}
              />
              <p style={{ color: "var(--wd-text-secondary)" }}>
                Signed in! Redirecting...
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-4">
              <AlertCircleIcon
                className="h-8 w-8"
                style={{ color: "var(--wd-danger)" }}
              />
              <p
                className="text-lg font-semibold"
                style={{ color: "var(--wd-text-primary)" }}
              >
                Link expired or invalid
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--wd-text-muted)" }}
              >
                Magic links are single-use and expire after 15 minutes.
              </p>
              <Link
                href="/login"
                className="wd-btn-primary mt-2 inline-block rounded-lg px-6 py-2.5 text-sm font-medium"
              >
                Send a new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
