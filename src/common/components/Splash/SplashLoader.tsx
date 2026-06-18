import React, { useEffect, useRef } from "react";
import Image from "next/image";

interface SplashLoaderProps {
  /** Friendly status line shown under the wordmark */
  step: string;
  /** Boot progress, 0..1 — drives the comet on the rail */
  progress: number;
  /** When set, the loader shows the error state with a retry action */
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Warm "Lamplight" boot screen shown while the app connects and sets up media.
 * Replaces the old plain "Initializing SFU…" text. All visuals live in
 * globals.css under `.wd-splash*`; the only JS here is the organic glow
 * flicker, which a static class can't express.
 */
export function SplashLoader({ step, progress, error, onRetry }: SplashLoaderProps) {
  const flickRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (error) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    // irregular, flame-like flicker (sum of incommensurate sines)
    const flicker = (t: number) =>
      0.5 + 0.5 * (0.6 * Math.sin(t * 7) + 0.3 * Math.sin(t * 13.3 + 1.1) + 0.1 * Math.sin(t * 23.7 + 2.3));
    const loop = (now: number) => {
      const el = flickRef.current;
      if (el) el.style.opacity = (0.06 + 0.2 * flicker(now / 1000)).toFixed(3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [error]);

  const pct = `${Math.min(Math.max(progress, 0), 1) * 100}%`;

  return (
    <div className={`wd-splash${error ? " wd-splash--error" : ""}`}>
      <div className="wd-splash__air" aria-hidden="true">
        <span className="wd-splash__mote" />
        <span className="wd-splash__mote" />
        <span className="wd-splash__mote" />
        <span className="wd-splash__mote" />
        <span className="wd-splash__mote" />
      </div>

      <div className="wd-splash__lamp">
        <span className="wd-splash__halo" />
        <span className="wd-splash__halo wd-splash__halo--soft" />
        <span ref={flickRef} className="wd-splash__halo wd-splash__halo--flick" />
        {!error && <span className="wd-splash__ignite" />}
        <Image
          src="/icon-512.png"
          alt="WorkDash"
          width={92}
          height={92}
          className="wd-splash__icon"
          priority
          unoptimized
        />
      </div>

      {error ? (
        <>
          <h1 className="wd-splash__error-title">{"Couldn't get you in"}</h1>
          <p className="wd-splash__error-msg">
            {"We couldn't reach the room. Check your connection and we'll try again."}
          </p>
          <p className="wd-splash__error-detail">{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="wd-btn-primary wd-splash__retry">
              Try again
            </button>
          )}
        </>
      ) : (
        <>
          <span className="wd-splash__reflect" />
          <div className="wd-splash__wordmark">WorkDash</div>
          <div className="wd-splash__status">
            <span key={step} className="wd-splash__status-line">
              {step}
            </span>
          </div>
          <div className="wd-splash__rail">
            <span className="wd-splash__fill" style={{ width: pct }} />
            <span className="wd-splash__trail" style={{ left: pct }} />
            <span className="wd-splash__comet" style={{ left: pct }} />
          </div>
        </>
      )}

      <div className="wd-splash__vignette" aria-hidden="true" />
      <div className="wd-splash__grain" aria-hidden="true" />
    </div>
  );
}
