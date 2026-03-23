import React from "react";
import type { PZPlayer } from "@/common/store/pzStore";

interface PZServerStatusProps {
  isOnline: boolean;
  players: PZPlayer[];
}

function PlayerRow({ player }: { player: PZPlayer }) {
  const name = player.workdashUser?.displayName ?? player.pzUsername;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 py-1">
      {player.workdashUser?.avatarUrl ? (
        <img
          src={player.workdashUser.avatarUrl}
          alt={name}
          className="h-5 w-5 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--wd-accent-soft)] text-[0.6rem] font-bold text-[var(--wd-accent)]">
          {initial}
        </div>
      )}
      <span className="truncate text-xs wd-text-primary">{name}</span>
      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--wd-success)]" />
    </div>
  );
}

function PZServerStatus({ isOnline, players }: PZServerStatusProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
            isOnline
              ? "bg-[var(--wd-success)]/15 text-[var(--wd-success)]"
              : "bg-[var(--wd-danger)]/15 text-[var(--wd-danger)]"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
        <span className="text-xs wd-text-muted">
          {players.length} player{players.length !== 1 ? "s" : ""}
        </span>
      </div>

      {players.length > 0 ? (
        <div className="space-y-0.5">
          {players.map((player) => (
            <PlayerRow key={player.steamId} player={player} />
          ))}
        </div>
      ) : (
        <p className="text-xs wd-text-muted">No players online</p>
      )}
    </div>
  );
}

export default PZServerStatus;
