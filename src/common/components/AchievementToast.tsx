import React, { useEffect, useState } from "react";
import type { AchievementRarity } from "@/communication/chatV2/_types";

interface AchievementToastProps {
    achievementKey: string;
    icon: string;
    name: string;
    description: string;
    rarity: AchievementRarity;
}

const RARITY_LABELS: Record<AchievementRarity, string> = {
    legendary: "LEGENDARY",
    epic: "EPIC",
    rare: "RARE",
    uncommon: "UNCOMMON",
    common: "COMMON",
};

export function AchievementToast({
    achievementKey,
    icon,
    name,
    description,
    rarity,
}: AchievementToastProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const [animate, setAnimate] = useState(false);
    const imgSrc = `/assets/achievements/${achievementKey}.png`;

    useEffect(() => {
        const raf = requestAnimationFrame(() => setAnimate(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <div
            className={`wd-achievement-base w-[360px] shadow-lg flex items-center gap-3 rounded-xl px-4 py-3 overflow-hidden${animate ? " wd-achievement-animate" : ""}`}
            data-rarity={rarity}
        >
            {animate && (
                <div className="wd-achievement-shimmer" aria-hidden="true" />
            )}

            <div className="wd-achievement-icon-badge flex items-center justify-center w-12 h-12 rounded-md shrink-0 overflow-hidden text-xl">
                {!imgFailed ? (
                    <img
                        src={imgSrc}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <span role="img" aria-label={name}>
                        {icon}
                    </span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center">
                    <p className="text-sm font-bold wd-text-primary truncate m-0">
                        {name}
                    </p>
                    <span className="ml-auto wd-achievement-rarity-pill text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {RARITY_LABELS[rarity]}
                    </span>
                </div>
                <p className="text-xs wd-text-secondary truncate mt-0.5 m-0">
                    {description}
                </p>
            </div>
        </div>
    );
}
