import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Lock, Pin, Plus, Trophy, X } from 'lucide-react';
import useAchievementStore from '@/common/store/achievementStore';
import useUserStore from '@/common/store/useStore';
import { SettingsSection } from '../settings-primitives';
import type {
  AchievementCategory,
  AchievementRarity,
  AchievementWithStatus,
  DisplayAchievement,
} from '@/communication/chatV2/_types';

const FILTER_CATEGORIES: Array<{
  key: AchievementCategory | 'all';
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'chat', label: 'Chat' },
  { key: 'social', label: 'Social' },
  { key: 'profile', label: 'Profile' },
  { key: 'game', label: 'Game' },
];

const MAX_DISPLAY_SLOTS = 5;

const RARITY_LABELS: Record<AchievementRarity, string> = {
  legendary: 'LEGENDARY',
  epic: 'EPIC',
  rare: 'RARE',
  uncommon: 'UNCOMMON',
  common: 'COMMON',
};

const RARITY_COLORS: Record<AchievementRarity, string> = {
  legendary: 'var(--wd-warning)',
  epic: '#a855f7',
  rare: 'var(--wd-info)',
  uncommon: 'var(--wd-success)',
  common: 'var(--wd-text-muted)',
};

/* ── Badge image with PNG fallback to emoji ── */

function BadgeImage({
  achievementKey,
  icon,
  name,
  isUnlocked,
  isHiddenLocked,
  className = '',
}: {
  achievementKey: string;
  icon: string;
  name: string;
  isUnlocked: boolean;
  isHiddenLocked: boolean;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

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
        src={`/assets/achievements/${achievementKey}.png`}
        alt={name}
        className={`w-full h-full object-cover ${!isUnlocked ? 'grayscale' : ''} ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={!isUnlocked ? 'grayscale' : ''}
      role="img"
      aria-label={name}
    >
      {icon}
    </span>
  );
}

/* ── Rich tooltip content shown on badge hover ── */

function BadgeTooltipContent({
  achievement,
}: {
  achievement: AchievementWithStatus;
}) {
  const isUnlocked = achievement.unlockedAt !== null;
  const isHiddenLocked = achievement.hidden && !isUnlocked;
  const progressPct =
    achievement.type === 'counter' && !isUnlocked
      ? Math.min(
          100,
          (achievement.currentCount / achievement.threshold) * 100,
        )
      : 0;
  const rarityColor = RARITY_COLORS[achievement.rarity];

  return (
    <div className="w-52">
      {/* Achievement image — prominent display */}
      <div
        className="wd-achievement-base rounded-lg p-3 mb-2.5 flex items-center justify-center"
        data-rarity={isUnlocked ? achievement.rarity : undefined}
      >
        <div className="wd-achievement-icon-badge w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden text-2xl">
          <BadgeImage
            achievementKey={achievement.key}
            icon={achievement.icon}
            name={achievement.name}
            isUnlocked={isUnlocked}
            isHiddenLocked={isHiddenLocked}
          />
        </div>
      </div>

      {/* Name & rarity */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-bold wd-text-primary truncate">
          {isHiddenLocked ? '???' : achievement.name}
        </span>
        <span
          className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
          style={{
            color: rarityColor,
            background: `color-mix(in srgb, ${rarityColor} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${rarityColor} 20%, transparent)`,
          }}
        >
          {RARITY_LABELS[achievement.rarity]}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs wd-text-secondary leading-relaxed mb-1.5">
        {isHiddenLocked ? 'Hidden achievement' : achievement.description}
      </p>

      {/* Status — unlocked date / progress / locked */}
      {isUnlocked && achievement.unlockedAt && (
        <span className="text-[10px] wd-text-muted flex items-center gap-1">
          <span className="text-[var(--wd-success)]">✓</span> Unlocked{' '}
          {new Date(achievement.unlockedAt).toLocaleDateString()}
        </span>
      )}

      {!isUnlocked && achievement.type === 'counter' && !isHiddenLocked && (
        <div>
          <div className="flex justify-between text-[10px] wd-text-muted mb-0.5">
            <span>
              {achievement.currentCount}/{achievement.threshold}
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

      {!isUnlocked && achievement.type === 'one-shot' && !isHiddenLocked && (
        <span className="text-[10px] wd-text-muted flex items-center gap-1">
          <Lock size={10} /> Locked
        </span>
      )}
    </div>
  );
}

/* ── Single badge in the collection grid ── */

function AchievementBadge({
  achievement,
  isPinned,
  canPin,
  onTogglePin,
}: {
  achievement: AchievementWithStatus;
  isPinned: boolean;
  canPin: boolean;
  onTogglePin: (key: string) => void;
}) {
  const isUnlocked = achievement.unlockedAt !== null;
  const isHiddenLocked = achievement.hidden && !isUnlocked;
  const canInteract = isUnlocked && (isPinned || canPin);

  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={() => canInteract && onTogglePin(achievement.key)}
            disabled={!canInteract && isUnlocked}
            className={`wd-ach-badge relative wd-achievement-base w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden transition-all text-base ${
              isUnlocked
                ? 'hover:scale-110 hover:shadow-lg'
                : 'opacity-40 cursor-default'
            } ${isPinned ? 'ring-2 ring-[var(--wd-accent)] ring-offset-1 ring-offset-[var(--wd-surface-panel)]' : ''}`}
            data-rarity={isUnlocked ? achievement.rarity : undefined}
            aria-label={isHiddenLocked ? 'Hidden achievement' : achievement.name}
          >
            <BadgeImage
              achievementKey={achievement.key}
              icon={achievement.icon}
              name={achievement.name}
              isUnlocked={isUnlocked}
              isHiddenLocked={isHiddenLocked}
            />
            {isPinned && (
              <span className="absolute -top-px -right-px w-3.5 h-3.5 rounded-bl-md rounded-tr-[5px] bg-[var(--wd-accent)] flex items-center justify-center">
                <Pin size={7} className="text-white rotate-45" />
              </span>
            )}
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
            <BadgeTooltipContent achievement={achievement} />
            <Tooltip.Arrow className="fill-[var(--wd-surface-panel)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/* ── Pinned display slot ── */

function DisplaySlot({
  achievement,
  onRemove,
}: {
  achievement?: AchievementWithStatus;
  onRemove?: () => void;
}) {
  if (!achievement) {
    return (
      <div className="w-11 h-11 rounded-lg border-2 border-dashed wd-border-subtle flex items-center justify-center transition-colors">
        <Plus size={12} className="wd-text-muted opacity-40" />
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={onRemove}
            className="wd-ach-badge relative wd-achievement-base w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden group hover:scale-105 transition-all text-base"
            data-rarity={achievement.rarity}
            aria-label={`Remove ${achievement.name} from display`}
          >
            <BadgeImage
              achievementKey={achievement.key}
              icon={achievement.icon}
              name={achievement.name}
              isUnlocked={true}
              isHiddenLocked={false}
            />
            <span className="absolute inset-0 rounded-lg bg-[var(--wd-danger)]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <X size={12} className="text-white drop-shadow-sm" />
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-[300] rounded-lg wd-bg-panel border wd-border-subtle px-2.5 py-1.5 shadow-lg text-xs wd-text-secondary"
            sideOffset={4}
          >
            Click to remove
            <Tooltip.Arrow className="fill-[var(--wd-surface-panel)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/* ── Main panel ── */

export default function AchievementsPanel() {
  const { achievements, isLoaded, isLoading, loadAchievements, updateMyDisplay } =
    useAchievementStore();
  const backendUser = useUserStore((s) => s.backendUser);
  const userId = backendUser?.id;

  const [selectedCategory, setSelectedCategory] = useState<
    AchievementCategory | 'all'
  >('all');
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [initialPinnedKeys, setInitialPinnedKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load achievements on mount
  useEffect(() => {
    if (!isLoaded) void loadAchievements();
  }, [isLoaded, loadAchievements]);

  // Load current pinned display
  useEffect(() => {
    if (typeof userId !== 'number') return;
    let cancelled = false;

    const load = async () => {
      const display = await useAchievementStore
        .getState()
        .loadUserDisplay(userId);
      if (cancelled) return;
      const keys = display
        .sort((a, b) => a.position - b.position)
        .map((d) => d.achievementKey);
      setPinnedKeys(keys);
      setInitialPinnedKeys(keys);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const hasChanges = useMemo(() => {
    if (pinnedKeys.length !== initialPinnedKeys.length) return true;
    return pinnedKeys.some((k, i) => k !== initialPinnedKeys[i]);
  }, [pinnedKeys, initialPinnedKeys]);

  const handleTogglePin = useCallback((key: string) => {
    setPinnedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_DISPLAY_SLOTS) return prev;
      return [...prev, key];
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (typeof userId !== 'number') return;
    setIsSaving(true);
    try {
      const items = pinnedKeys.map((key, i) => ({
        achievementKey: key,
        position: i,
      }));
      await updateMyDisplay(items);

      // Update cache so profile popover reflects changes immediately
      const newDisplay: DisplayAchievement[] = pinnedKeys
        .map((key, i) => {
          const ach = achievements.find((a) => a.key === key);
          if (!ach) return null;
          return {
            achievementKey: key,
            position: i,
            name: ach.name,
            description: ach.description,
            icon: ach.icon,
            rarity: ach.rarity,
          };
        })
        .filter(Boolean) as DisplayAchievement[];

      useAchievementStore.setState((state) => ({
        displayByUserId: {
          ...state.displayByUserId,
          [userId]: newDisplay,
        },
      }));

      setInitialPinnedKeys([...pinnedKeys]);
    } catch {
      // Error handled in store
    } finally {
      setIsSaving(false);
    }
  }, [pinnedKeys, updateMyDisplay, userId, achievements]);

  // Filter & sort: unlocked first (newest first), then locked
  const sorted = useMemo(() => {
    const filtered =
      selectedCategory === 'all'
        ? achievements
        : achievements.filter((a) => a.category === selectedCategory);

    return [...filtered].sort((a, b) => {
      if (a.unlockedAt && !b.unlockedAt) return -1;
      if (!a.unlockedAt && b.unlockedAt) return 1;
      if (a.unlockedAt && b.unlockedAt) {
        return (
          new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
        );
      }
      return 0;
    });
  }, [achievements, selectedCategory]);

  const unlockedCount = achievements.filter(
    (a) => a.unlockedAt !== null,
  ).length;

  // Map pinned keys to achievement objects
  const pinnedAchievements = useMemo(
    () =>
      pinnedKeys
        .map((key) => achievements.find((a) => a.key === key))
        .filter(Boolean) as AchievementWithStatus[],
    [pinnedKeys, achievements],
  );

  const canPinMore = pinnedKeys.length < MAX_DISPLAY_SLOTS;

  return (
    <div className="space-y-4">
      {/* Display badges — pinning manager */}
      <SettingsSection
        label="Display Badges"
        description="Choose up to 5 achievements to showcase on your profile"
      >
        <div className="flex items-center gap-2.5">
          {Array.from({ length: MAX_DISPLAY_SLOTS }).map((_, i) => (
            <DisplaySlot
              key={i}
              achievement={pinnedAchievements[i]}
              onRemove={
                pinnedAchievements[i]
                  ? () => handleTogglePin(pinnedAchievements[i].key)
                  : undefined
              }
            />
          ))}
        </div>

        {hasChanges && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="mt-3 wd-btn-primary text-xs px-4 py-1.5 rounded-md font-medium transition-opacity disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </SettingsSection>

      {/* Achievement collection */}
      <SettingsSection
        label="Collection"
        description={`${unlockedCount}/${achievements.length} unlocked`}
      >
        {/* Category filter pills */}
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors shrink-0 ${
                selectedCategory === cat.key
                  ? 'bg-[var(--wd-accent-soft)] text-[var(--wd-accent)]'
                  : 'wd-text-muted hover:wd-text-secondary hover:bg-[var(--wd-surface-elevated)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Badge grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-5 w-5 rounded-full border-2 border-[var(--wd-accent)] border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-6">
            <Trophy size={24} className="mx-auto mb-2 wd-text-muted" />
            <p className="text-sm wd-text-muted">No achievements yet</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sorted.map((achievement) => (
              <AchievementBadge
                key={achievement.key}
                achievement={achievement}
                isPinned={pinnedKeys.includes(achievement.key)}
                canPin={canPinMore}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
