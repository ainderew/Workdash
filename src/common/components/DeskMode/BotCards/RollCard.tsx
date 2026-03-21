import React, { useEffect, useState } from "react";
import { Dices } from "lucide-react";
import type { BotCardRoll } from "@/communication/chatV2/_types";

interface RollCardProps {
  card: BotCardRoll;
}

const REEL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function DigitReel({ digit, variant, animate }: { digit: number; variant: "left" | "mid" | "right"; animate: boolean }) {
  const stripClass = [
    animate ? "wd-roll-strip" : "",
    animate && variant === "mid" ? "wd-roll-strip--mid" : "",
    animate && variant === "right" ? "wd-roll-strip--right" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const stopPosition = 20 + digit;

  return (
    <span className="wd-roll-reel inline-block w-[0.65em] text-center">
      <span
        className={stripClass}
        style={{ "--wd-roll-stop": `calc(-${stopPosition} * 1em)` } as React.CSSProperties}
      >
        {REEL_DIGITS.map((d, i) => (
          <span key={i} className="block h-[1em] leading-[1em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export function RollCard({ card }: RollCardProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Double rAF: first ensures the browser paints the element at position 0,
    // second adds the animation class so the transition is visible.
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(() => {
        setAnimate(true);
      });
      return () => cancelAnimationFrame(inner);
    });
    return () => cancelAnimationFrame(outer);
  }, []);

  const padded = String(card.value).padStart(3, "0");
  const [d0, d1, d2] = [
    Number(padded[0]),
    Number(padded[1]),
    Number(padded[2]),
  ];

  return (
    <div className="wd-bot-card rounded-lg px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <Dices size={18} className="shrink-0 wd-text-accent" />
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-bold tracking-wider wd-text-primary">
            <DigitReel digit={d0} variant="left" animate={animate} />
            <DigitReel digit={d1} variant="mid" animate={animate} />
            <DigitReel digit={d2} variant="right" animate={animate} />
          </span>
          <span className="text-[13px] wd-text-muted">
            / {String(card.max).padStart(3, "0")}
          </span>
        </div>
      </div>
      <p className="mt-1 text-[12px] wd-text-muted">
        {card.rolledBy} rolled
      </p>
    </div>
  );
}
