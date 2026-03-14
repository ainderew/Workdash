import React, { useEffect, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { DisplayAchievement, AchievementRarity } from "@/communication/chatV2/_types";
import { ChatV2Service } from "@/communication/chatV2/chatV2Service";

interface AchievementBadgesProps {
    userId: number;
}

const RARITY_LABELS: Record<AchievementRarity, string> = {
    legendary: "LEGENDARY",
    epic: "EPIC",
    rare: "RARE",
    uncommon: "UNCOMMON",
    common: "COMMON",
};

const RARITY_COLORS: Record<AchievementRarity, string> = {
    legendary: "var(--wd-warning)",
    epic: "#a855f7",
    rare: "var(--wd-info)",
    uncommon: "var(--wd-success)",
    common: "var(--wd-text-muted)",
};

function BadgeImage({
    achievementKey,
    icon,
    name,
}: {
    achievementKey: string;
    icon: string;
    name: string;
}) {
    const [imgFailed, setImgFailed] = useState(false);

    if (!imgFailed) {
        return (
            <img
                src={`/assets/achievements/${achievementKey}.png`}
                alt={name}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
            />
        );
    }

    return (
        <span role="img" aria-label={name}>
            {icon}
        </span>
    );
}

function BadgeTooltipContent({ badge }: { badge: DisplayAchievement }) {
    const rarityColor = RARITY_COLORS[badge.rarity];

    return (
        <div className="w-52">
            {/* Achievement image — prominent display */}
            <div
                className="wd-achievement-base rounded-lg p-3 mb-2.5 flex items-center justify-center"
                data-rarity={badge.rarity}
            >
                <div className="wd-achievement-icon-badge w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden text-2xl">
                    <BadgeImage
                        achievementKey={badge.achievementKey}
                        icon={badge.icon}
                        name={badge.name}
                    />
                </div>
            </div>

            {/* Name & rarity */}
            <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-bold wd-text-primary truncate">
                    {badge.name}
                </span>
                <span
                    className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                    style={{
                        color: rarityColor,
                        background: `color-mix(in srgb, ${rarityColor} 12%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${rarityColor} 20%, transparent)`,
                    }}
                >
                    {RARITY_LABELS[badge.rarity]}
                </span>
            </div>

            {/* Description */}
            <p className="text-xs wd-text-secondary leading-relaxed">
                {badge.description}
            </p>
        </div>
    );
}

export function AchievementBadges({ userId }: AchievementBadgesProps) {
    const [badges, setBadges] = useState<DisplayAchievement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetchBadges = async () => {
            try {
                const chatService = ChatV2Service.getInstance();
                const result =
                    await chatService.getUserAchievementDisplay(userId);
                if (!cancelled) setBadges(result);
            } catch {
                // No badges available
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        void fetchBadges();
        return () => {
            cancelled = true;
        };
    }, [userId]);

    if (isLoading) return null;
    if (badges.length === 0) return null;

    return (
        <div className="rounded-lg wd-neo px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider wd-text-muted mb-1.5">
                Achievements
            </p>
            <div className="flex flex-wrap gap-1.5">
                {badges.map((badge) => (
                    <Tooltip.Provider key={badge.achievementKey} delayDuration={250}>
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <button
                                    type="button"
                                    className="wd-achievement-base w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden transition-all hover:scale-110 hover:shadow-lg text-sm"
                                    data-rarity={badge.rarity}
                                    aria-label={badge.name}
                                >
                                    <BadgeImage
                                        achievementKey={badge.achievementKey}
                                        icon={badge.icon}
                                        name={badge.name}
                                    />
                                </button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content
                                    className="z-[300] rounded-xl wd-bg-panel border wd-border-subtle p-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
                                    sideOffset={8}
                                    side="top"
                                    align="center"
                                    collisionPadding={12}
                                >
                                    <BadgeTooltipContent badge={badge} />
                                    <Tooltip.Arrow className="fill-[var(--wd-surface-panel)]" />
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                ))}
            </div>
        </div>
    );
}
