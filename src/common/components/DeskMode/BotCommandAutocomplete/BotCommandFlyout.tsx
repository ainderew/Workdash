import React, { useEffect, useRef } from "react";
import type { BotCommandEntry } from "./botCommandRegistry";
import { isMusicBotAvatarSentinel } from "./botCommandRegistry";
import { getMusicBotAvatarSync } from "@/common/utils/botAvatar";

interface BotCommandFlyoutProps {
  entries: BotCommandEntry[];
  query: string;
  selectedIndex: number;
  onSelect: (entry: BotCommandEntry) => void;
  onClose: () => void;
}

function BotAvatar({ avatar, name }: { avatar: string; name: string }) {
  const src = isMusicBotAvatarSentinel(avatar)
    ? getMusicBotAvatarSync() ?? undefined
    : avatar;

  if (!src) {
    return (
      <div className="h-6 w-6 shrink-0 rounded-full bg-[var(--wd-accent)] flex items-center justify-center text-[10px] font-bold text-white select-none">
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="h-6 w-6 shrink-0 rounded-full object-cover"
    />
  );
}

function BotCommandFlyout({
  entries,
  query,
  selectedIndex,
  onSelect,
  onClose,
}: BotCommandFlyoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onClose]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (entries.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Bot command suggestions"
      className="absolute bottom-full left-0 right-0 mb-1 z-50 max-h-72 overflow-y-auto rounded-lg border wd-border-strong wd-bg-panel shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide wd-text-muted">
        {query ? `Commands matching /${query}` : "Bot commands"}
      </div>

      {entries.map((entry, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={`${entry.botId}-${entry.command}`}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(entry);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              isSelected
                ? "wd-bg-accent-soft"
                : "hover:bg-[var(--wd-surface-elevated)]"
            }`}
          >
            <BotAvatar avatar={entry.botAvatar} name={entry.botName} />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "wd-text-accent" : "wd-text-primary"
                  }`}
                >
                  /{entry.command}
                </span>
                {entry.args && (
                  <span className="text-xs wd-text-muted">{entry.args}</span>
                )}
              </div>
              <div className="text-xs wd-text-muted truncate leading-snug mt-0.5">
                {entry.description}
              </div>
            </div>

            <span className="text-[10px] wd-text-muted shrink-0 hidden sm:block">
              {entry.botName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default BotCommandFlyout;
