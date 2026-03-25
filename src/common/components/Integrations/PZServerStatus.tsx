import React from "react";
import Image from "next/image";
import type { PZPlayer } from "@/common/store/pzStore";
import { Radio, Wifi, WifiOff } from "lucide-react";

interface PZServerStatusProps {
  isOnline: boolean;
  players: PZPlayer[];
}

function SignalBars({ isOnline }: { isOnline: boolean }) {
  const bars = [1, 2, 3, 4];
  return (
    <div className="flex items-end gap-px">
      {bars.map((level) => (
        <div
          key={level}
          className={`w-[3px] rounded-sm transition-all duration-300 ${
            isOnline
              ? "bg-[var(--wd-success)]"
              : level <= 1
                ? "bg-[var(--wd-danger)]"
                : "bg-[var(--wd-surface-elevated)]"
          }`}
          style={{
            height: `${level * 3 + 2}px`,
            opacity: isOnline ? 1 : level <= 1 ? 0.7 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

function PlayerRow({ player, index }: { player: PZPlayer; index: number }) {
  const name = player.workdashUser?.displayName ?? player.pzUsername;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="group/player flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-[var(--wd-surface-elevated)] animate-[wd-pz-player-in_250ms_ease_both] [animation-delay:var(--delay)]"
      style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}
    >
      {/* Compact avatar */}
      <div className="relative shrink-0">
        {player.workdashUser?.avatarUrl ? (
          <Image
            src={player.workdashUser.avatarUrl}
            alt={name}
            width={20}
            height={20}
            className="h-5 w-5 rounded-full object-cover ring-1 ring-[var(--wd-border-subtle)]"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wd-accent-soft)] text-[0.5rem] font-bold text-[var(--wd-accent)] ring-1 ring-[rgb(var(--wd-accent-rgb)/0.2)]">
            {initial}
          </div>
        )}
        <span className="absolute -bottom-px -right-px h-1.5 w-1.5 rounded-full bg-[var(--wd-success)] ring-[1.5px] ring-[var(--wd-surface-panel)]" />
      </div>

      {/* Name */}
      <span className="truncate text-[11px] font-medium wd-text-primary">
        {name}
      </span>

      {/* Online indicator — revealed on hover */}
      <span className="ml-auto flex items-center gap-1 text-[9px] wd-text-muted opacity-0 transition-opacity group-hover/player:opacity-100">
        <Radio size={8} strokeWidth={2.5} className="text-[var(--wd-success)]" />
        live
      </span>
    </div>
  );
}

function PZServerStatus({ isOnline, players }: PZServerStatusProps) {
  return (
    <div className="space-y-2">
      {/* Signal status bar — compact like NowPlayingBar status line */}
      <div className="flex items-center gap-2">
        <SignalBars isOnline={isOnline} />
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi size={10} strokeWidth={2.5} className="text-[var(--wd-success)]" />
          ) : (
            <WifiOff size={10} strokeWidth={2.5} className="text-[var(--wd-danger)]" />
          )}
          <span
            className={`text-[10px] font-semibold ${
              isOnline ? "text-[var(--wd-success)]" : "text-[var(--wd-danger)]"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <span className="text-[9px] wd-text-muted">&middot;</span>
        <span className="text-[9px] font-medium wd-text-muted tabular-nums">
          {players.length} player{players.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Player list — compact card */}
      {players.length > 0 ? (
        <div className="space-y-px rounded-md bg-[var(--wd-surface-base)] p-1 ring-1 ring-[var(--wd-border-subtle)]">
          {players.map((player, i) => (
            <PlayerRow key={player.steamId} player={player} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-md bg-[var(--wd-surface-base)] py-3 ring-1 ring-[var(--wd-border-subtle)]">
          <span className="text-xs opacity-30">👻</span>
          <p className="text-[10px] wd-text-muted">
            No survivors online
          </p>
        </div>
      )}
    </div>
  );
}

export default PZServerStatus;
