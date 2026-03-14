import React, { useEffect, useState } from "react";
import { Trophy, Lock } from "lucide-react";
import DeskModalShell from "./DeskModalShell";
import useAchievementStore from "@/common/store/achievementStore";
import type {
    AchievementCategory,
    AchievementRarity,
    AchievementWithStatus,
} from "@/communication/chatV2/_types";

interface AchievementsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES: Array<{ key: AchievementCategory | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "chat", label: "Chat" },
    { key: "social", label: "Social" },
    { key: "profile", label: "Profile" },
    { key: "game", label: "Game" },
];

const RARITY_LABELS: Record<AchievementRarity, string> = {
    legendary: "LEGENDARY",
    epic: "EPIC",
    rare: "RARE",
    uncommon: "UNCOMMON",
    common: "COMMON",
};

function AchievementIcon({
    achievementKey,
    icon,
    name,
    isUnlocked,
    isHiddenLocked,
}: {
    achievementKey: string;
    icon: string;
    name: string;
    isUnlocked: boolean;
    isHiddenLocked: boolean;
}) {
    const [imgFailed, setImgFailed] = useState(false);
    const imgSrc = `/assets/achievements/${achievementKey}.png`;

    if (isHiddenLocked) {
        return (
            <span role="img" aria-label="Hidden">
                &#x2753;
            </span>
        );
    }

    if (!imgFailed) {
        return (
            <img
                src={imgSrc}
                alt={name}
                className={`w-full h-full object-cover${!isUnlocked ? " grayscale" : ""}`}
                onError={() => setImgFailed(true)}
            />
        );
    }

    return (
        <span
            className={!isUnlocked ? "grayscale" : ""}
            role="img"
            aria-label={name}
        >
            {icon}
        </span>
    );
}

function AchievementCard({ achievement }: { achievement: AchievementWithStatus }) {
    const isUnlocked = achievement.unlockedAt !== null;
    const isHiddenLocked = achievement.hidden && !isUnlocked;
    const progressPct =
        achievement.type === "counter" && !isUnlocked
            ? Math.min(
                  100,
                  (achievement.currentCount / achievement.threshold) * 100,
              )
            : 0;

    return (
        <div
            className={`wd-achievement-base flex items-start gap-3 rounded-xl px-3 py-2.5 shrink-0 overflow-hidden transition-opacity ${
                isUnlocked ? "opacity-100" : "opacity-60"
            }`}
            data-rarity={isUnlocked ? achievement.rarity : undefined}
        >
            <div className="wd-achievement-icon-badge flex items-center justify-center w-12 h-12 rounded-md shrink-0 overflow-hidden text-xl">
                <AchievementIcon
                    achievementKey={achievement.key}
                    icon={achievement.icon}
                    name={achievement.name}
                    isUnlocked={isUnlocked}
                    isHiddenLocked={isHiddenLocked}
                />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center">
                    <p className="text-sm font-bold wd-text-primary truncate m-0">
                        {isHiddenLocked ? "???" : achievement.name}
                    </p>
                    <span className="ml-auto wd-achievement-rarity-pill text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {RARITY_LABELS[achievement.rarity]}
                    </span>
                </div>
                <p className="text-xs wd-text-secondary truncate mt-0.5 m-0">
                    {isHiddenLocked
                        ? "Hidden achievement"
                        : achievement.description}
                </p>

                {isUnlocked && achievement.unlockedAt && (
                    <span className="text-[10px] wd-text-muted mt-0.5 block">
                        {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </span>
                )}

                {/* Progress bar for counter achievements */}
                {!isUnlocked &&
                    achievement.type === "counter" &&
                    !isHiddenLocked && (
                        <div className="mt-1.5">
                            <div className="flex justify-between text-[10px] wd-text-muted mb-0.5">
                                <span>
                                    {achievement.currentCount}/
                                    {achievement.threshold}
                                </span>
                                <span>{Math.floor(progressPct)}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-[var(--wd-surface-base)]">
                                <div
                                    className="wd-achievement-progress-bar h-full rounded-full transition-all"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>
                    )}

                {!isUnlocked && achievement.type === "one-shot" && !isHiddenLocked && (
                    <div className="flex items-center gap-1 mt-1">
                        <Lock size={10} className="wd-text-muted" />
                        <span className="text-[10px] wd-text-muted">Locked</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AchievementsModal({
    isOpen,
    onClose,
}: AchievementsModalProps) {
    const { achievements, isLoaded, isLoading, loadAchievements } =
        useAchievementStore();
    const [selectedCategory, setSelectedCategory] = useState<
        AchievementCategory | "all"
    >("all");

    useEffect(() => {
        if (isOpen && !isLoaded) {
            void loadAchievements();
        }
    }, [isOpen, isLoaded, loadAchievements]);

    const filtered =
        selectedCategory === "all"
            ? achievements
            : achievements.filter((a) => a.category === selectedCategory);

    // Sort: unlocked first (by date desc), then locked
    const sorted = [...filtered].sort((a, b) => {
        if (a.unlockedAt && !b.unlockedAt) return -1;
        if (!a.unlockedAt && b.unlockedAt) return 1;
        if (a.unlockedAt && b.unlockedAt) {
            return (
                new Date(b.unlockedAt).getTime() -
                new Date(a.unlockedAt).getTime()
            );
        }
        return 0;
    });

    const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;

    return (
        <DeskModalShell
            isOpen={isOpen}
            title="Achievements"
            subtitle={`${unlockedCount}/${achievements.length} unlocked`}
            onClose={onClose}
        >
            {/* Category tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors shrink-0 ${
                            selectedCategory === cat.key
                                ? "bg-[var(--wd-accent-soft)] text-[var(--wd-accent)]"
                                : "wd-text-muted hover:wd-text-secondary hover:bg-[var(--wd-surface-elevated)]"
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Achievement grid */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin h-5 w-5 rounded-full border-2 border-[var(--wd-accent)] border-t-transparent" />
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-8">
                    <Trophy size={24} className="mx-auto mb-2 wd-text-muted" />
                    <p className="text-sm wd-text-muted">No achievements yet</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                    {sorted.map((achievement) => (
                        <AchievementCard
                            key={achievement.key}
                            achievement={achievement}
                        />
                    ))}
                </div>
            )}
        </DeskModalShell>
    );
}
