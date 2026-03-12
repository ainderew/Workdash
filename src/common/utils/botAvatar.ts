import { useState, useEffect } from "react";
import lottie from "lottie-web";

const MUSIC_BOT_LOTTIE_PATH = "/assets/bot-avatars/musicbot.json";
let cachedDataUri: string | null = null;
let pending: Promise<string> | null = null;

export async function getMusicBotAvatarDataUri(): Promise<string> {
  if (cachedDataUri) return cachedDataUri;
  if (pending) return pending;

  pending = new Promise<string>((resolve) => {
    const container = document.createElement("div");
    container.style.width = "128px";
    container.style.height = "128px";
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    const anim = lottie.loadAnimation({
      container,
      path: MUSIC_BOT_LOTTIE_PATH,
      renderer: "canvas",
      loop: false,
      autoplay: false,
      rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
    });

    anim.addEventListener("DOMLoaded", () => {
      anim.goToAndStop(0, true);
      const canvas = container.querySelector("canvas");
      if (canvas) {
        const uri = canvas.toDataURL("image/png");
        if (uri) cachedDataUri = uri;
      }
      anim.destroy();
      container.remove();
      pending = null;
      resolve(cachedDataUri || "");
    });
  });

  return pending;
}

export function getMusicBotAvatarSync(): string | null {
  return cachedDataUri;
}

export function useMusicBotAvatar(): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(cachedDataUri);

  useEffect(() => {
    if (cachedDataUri) {
      setDataUrl(cachedDataUri);
      return;
    }

    let cancelled = false;
    void getMusicBotAvatarDataUri().then((url) => {
      if (!cancelled) setDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return dataUrl;
}
