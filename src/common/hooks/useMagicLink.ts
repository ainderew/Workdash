import { useState, useCallback } from "react";
import { CONFIG } from "@/common/utils/config";

type MagicLinkStatus = "idle" | "sending" | "sent" | "error";

export function useMagicLink() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<MagicLinkStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendMagicLink = useCallback(
    async (targetEmail: string, callbackUrl?: string) => {
      setStatus("sending");
      setErrorMessage(null);

      try {
        const res = await fetch(
          `${CONFIG.SFU_SERVER_URL}/api/auth/magic-link/send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetEmail, callbackUrl }),
          },
        );

        if (res.status === 429) {
          setStatus("error");
          setErrorMessage("Too many requests. Please wait a few minutes.");
          return;
        }

        if (!res.ok) {
          setStatus("error");
          setErrorMessage("Something went wrong. Please try again.");
          return;
        }

        setStatus("sent");
      } catch {
        setStatus("error");
        setErrorMessage("Network error. Please check your connection.");
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setEmail("");
  }, []);

  return { email, setEmail, status, errorMessage, sendMagicLink, reset };
}
