import React from "react";
import type { PZPlayer } from "@/common/store/pzStore";

interface PZServerStatusProps {
  isOnline: boolean;
  players: PZPlayer[];
}

function PlayerRow({ player, index }: { player: PZPlayer; index: number }) {
  const name = player.workdashUser?.displayName ?? player.pzUsername;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="group/player flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--wd-surface-elevated)] animate-[wd-pz-player-in_250ms_ease_both]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative shrink-0">
        {player.workdashUser?.avatarUrl ? (
          <img
            src={player.workdashUser.avatarUrl}
            alt={name}
            className="h-6 w-6 rounded-full object-cover ring-1 ring-[var(--wd-border-subtle)]"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--wd-accent-soft)] text-[0.6rem] font-bold text-[var(--wd-accent)] ring-1 ring-[rgb(var(--wd-accent-rgb)/0.2)]">
            {initial}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--wd-success)] ring-2 ring-[var(--wd-surface-panel)]" />
      </div>
      <span className="truncate text-xs font-medium wd-text-primary">
        {name}
      </span>
      <span className="ml-auto text-[0.55rem] wd-text-muted opacity-0 transition-opacity group-hover/player:opacity-100">
        in-game
      </span>
    </div>
  );
}

function PZServerStatus({ isOnline, players }: PZServerStatusProps) {
  return (
    <div className="space-y-2.5">
      {/* Status indicator */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline ? "bg-[var(--wd-success)]" : "bg-[var(--wd-danger)]"
            }`}
          />
          {isOnline && (
            <span className="absolute h-2 w-2 rounded-full bg-[var(--wd-success)] animate-[wd-pz-pulse_2s_ease-in-out_infinite]" />
          )}
        </div>
        <span
          className={`text-xs font-semibold ${
            isOnline ? "text-[var(--wd-success)]" : "text-[var(--wd-danger)]"
          }`}
        >
          {isOnline ? "Server Online" : "Server Offline"}
        </span>
        <span className="ml-auto text-[0.65rem] font-medium wd-text-muted">
          {players.length} player{players.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Player list */}
      {players.length > 0 ? (
        <div className="space-y-0.5 rounded-lg bg-[var(--wd-surface-base)] p-1.5 ring-1 ring-[var(--wd-border-subtle)]">
          {players.map((player, i) => (
            <PlayerRow key={player.steamId} player={player} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--wd-surface-base)] py-4 ring-1 ring-[var(--wd-border-subtle)]">
          <span className="text-lg opacity-40">👻</span>
          <p className="text-[0.65rem] wd-text-muted">
            No survivors online
          </p>
        </div>
      )}
    </div>
  );
}

export default PZServerStatus;
