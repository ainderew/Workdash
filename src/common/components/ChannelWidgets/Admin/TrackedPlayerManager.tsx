import React, { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, Users, Search, Gamepad2 } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import type { SteamLinkedMember } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

export function TrackedPlayerManager({ workspaceId, channelId }: Props) {
  const players = useWidgetStore((s) => s.trackedPlayersByChannel[channelId]) ?? [];
  const steamMembers = useWidgetStore((s) => s.steamLinkedMembers[workspaceId]) ?? [];
  const addTrackedPlayer = useWidgetStore((s) => s.addTrackedPlayer);
  const removeTrackedPlayer = useWidgetStore((s) => s.removeTrackedPlayer);
  const triggerSync = useWidgetStore((s) => s.triggerSync);
  const syncStatus = useWidgetStore((s) => s.syncStatus[channelId]) ?? "idle";
  const fetchSteamLinkedMembers = useWidgetStore((s) => s.fetchSteamLinkedMembers);

  const fetchTrackedPlayers = useWidgetStore((s) => s.fetchTrackedPlayers);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualSteamId, setManualSteamId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualAccountId, setManualAccountId] = useState("");

  useEffect(() => {
    void fetchTrackedPlayers(workspaceId, channelId);
    void fetchSteamLinkedMembers(workspaceId);
  }, [workspaceId, channelId, fetchTrackedPlayers, fetchSteamLinkedMembers]);

  const trackedAccountIds = useMemo(
    () => new Set(players.map((p) => p.dotaAccountId)),
    [players],
  );

  const availableMembers = useMemo(() => {
    const untracked = steamMembers.filter(
      (m) => !trackedAccountIds.has(m.dotaAccountId),
    );
    if (!search.trim()) return untracked;
    const q = search.toLowerCase();
    return untracked.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        (m.nickname?.toLowerCase().includes(q) ?? false) ||
        (m.personaName?.toLowerCase().includes(q) ?? false),
    );
  }, [steamMembers, trackedAccountIds, search]);

  async function handleAddMember(member: SteamLinkedMember) {
    setIsAdding(true);
    await addTrackedPlayer(workspaceId, channelId, {
      steamId64: member.steamId64,
      displayName: member.nickname ?? member.personaName ?? member.username,
      dotaAccountId: member.dotaAccountId,
      userId: member.userId,
    });
    setIsAdding(false);
  }

  async function handleAddManual() {
    const dotaAccountId = parseInt(manualAccountId, 10);
    if (!manualSteamId || !manualName || isNaN(dotaAccountId)) return;
    setIsAdding(true);
    await addTrackedPlayer(workspaceId, channelId, {
      steamId64: manualSteamId,
      displayName: manualName,
      dotaAccountId,
    });
    setManualSteamId("");
    setManualName("");
    setManualAccountId("");
    setIsAdding(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="wd-text-muted" />
          <span className="text-xs font-medium wd-text-primary">Tracked Players</span>
          <span className="text-xs wd-text-muted">({players.length})</span>
        </div>
        <button
          onClick={() => void triggerSync(workspaceId, channelId)}
          disabled={syncStatus === "syncing"}
          className="text-xs px-2 py-0.5 rounded wd-bg-accent-soft text-[var(--wd-accent)] hover:opacity-80 disabled:opacity-50"
        >
          {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {players.length > 0 && (
        <div className="space-y-1">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded wd-bg-elevated"
            >
              <div>
                <span className="text-sm wd-text-primary">{p.displayName}</span>
                <span className="text-xs wd-text-muted ml-2">ID: {p.dotaAccountId}</span>
              </div>
              <button
                onClick={() => void removeTrackedPlayer(workspaceId, channelId, p.id)}
                className="p-1 rounded text-[var(--wd-danger)] hover:bg-[var(--wd-danger)]/10"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
          />
          <input
            type="text"
            placeholder="Search linked members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1.5 rounded text-sm wd-bg-elevated wd-text-primary border wd-border-subtle placeholder:wd-text-muted"
          />
        </div>

        {availableMembers.length > 0 && (
          <div className="space-y-0.5 max-h-32 overflow-y-auto no-scrollbar">
            {availableMembers.map((m) => (
              <button
                key={m.userId}
                disabled={isAdding}
                onClick={() => void handleAddMember(m)}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-left hover:wd-bg-elevated transition-colors disabled:opacity-50"
              >
                <Gamepad2 size={12} className="wd-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm wd-text-primary truncate block">
                    {m.nickname ?? m.username}
                  </span>
                  <span className="text-[10px] wd-text-muted">
                    {m.personaName ? `${m.personaName} · ` : ""}
                    {m.mmrEstimate ? `~${m.mmrEstimate} MMR` : `ID: ${m.dotaAccountId}`}
                  </span>
                </div>
                <Plus size={12} className="text-[var(--wd-accent)] shrink-0" />
              </button>
            ))}
          </div>
        )}

        {availableMembers.length === 0 && steamMembers.length > 0 && search && (
          <div className="text-[11px] wd-text-muted text-center py-2">
            No matching linked members
          </div>
        )}

        {steamMembers.length === 0 && (
          <div className="text-[11px] wd-text-muted text-center py-2">
            No workspace members have linked Steam accounts
          </div>
        )}

        <button
          onClick={() => setShowManual(!showManual)}
          className="text-[11px] wd-text-muted hover:wd-text-primary transition-colors"
        >
          {showManual ? "Hide manual entry" : "Add manually by ID..."}
        </button>

        {showManual && (
          <div className="space-y-1.5 pt-1">
            <input
              type="text"
              placeholder="Display Name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded text-sm wd-bg-elevated wd-text-primary border wd-border-subtle placeholder:wd-text-muted"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Steam ID64"
                value={manualSteamId}
                onChange={(e) => setManualSteamId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded text-sm wd-bg-elevated wd-text-primary border wd-border-subtle placeholder:wd-text-muted"
              />
              <input
                type="text"
                placeholder="Dota Account ID"
                value={manualAccountId}
                onChange={(e) => setManualAccountId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded text-sm wd-bg-elevated wd-text-primary border wd-border-subtle placeholder:wd-text-muted"
              />
            </div>
            <button
              onClick={() => void handleAddManual()}
              disabled={isAdding || !manualSteamId || !manualName || !manualAccountId}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium wd-bg-accent-soft text-[var(--wd-accent)] hover:opacity-80 disabled:opacity-50"
            >
              <Plus size={12} />
              {isAdding ? "Adding..." : "Add Player"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
