import React, { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { usePZStore } from "@/common/store/pzStore";
import CollapsibleSection from "./CollapsibleSection";
import PZServerStatus from "./PZServerStatus";
import PZLeaderboard from "./PZLeaderboard";
import PZDeathLog from "./PZDeathLog";
import PZActivityFeed from "./PZActivityFeed";
import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";

interface PZSidebarProps {
  workspaceId: string;
  integrationId: string;
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-2.5 rounded bg-[var(--wd-surface-elevated)] animate-[wd-pz-skeleton_1.5s_ease-in-out_infinite]"
      style={{ width }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-3 py-4">
      {/* Status skeleton */}
      <div className="space-y-2">
        <SkeletonLine width="40%" />
        <div className="space-y-1.5 rounded-lg bg-[var(--wd-surface-base)] p-2 ring-1 ring-[var(--wd-border-subtle)]">
          <SkeletonLine width="70%" />
          <SkeletonLine width="55%" />
        </div>
      </div>
      {/* Leaderboard skeleton */}
      <div className="space-y-2">
        <SkeletonLine width="35%" />
        <div className="space-y-1.5">
          <SkeletonLine width="80%" />
          <SkeletonLine width="65%" />
          <SkeletonLine width="50%" />
        </div>
      </div>
      {/* Activity skeleton */}
      <div className="space-y-2">
        <SkeletonLine width="30%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="75%" />
      </div>
    </div>
  );
}

function PZSidebar({ workspaceId }: PZSidebarProps) {
  const isSidebarOpen = usePZStore((s) => s.isSidebarOpen);
  const toggleSidebar = usePZStore((s) => s.toggleSidebar);
  const sectionStates = usePZStore((s) => s.sectionStates);
  const toggleSection = usePZStore((s) => s.toggleSection);
  const isLoading = usePZStore((s) => s.isLoading);

  const isServerOnline = usePZStore((s) => s.isServerOnline);
  const onlinePlayers = usePZStore((s) => s.onlinePlayers);
  const allPlayerStats = usePZStore((s) => s.allPlayerStats);
  const leaderboardTab = usePZStore((s) => s.leaderboardTab);
  const setLeaderboardTab = usePZStore((s) => s.setLeaderboardTab);
  const recentDeaths = usePZStore((s) => s.recentDeaths);
  const recentActivity = usePZStore((s) => s.recentActivity);
  const fetchAllData = usePZStore((s) => s.fetchAllData);
  const addDeathEvent = usePZStore((s) => s.addDeathEvent);
  const addActivityEvent = usePZStore((s) => s.addActivityEvent);
  const updateOnlinePlayer = usePZStore((s) => s.updateOnlinePlayer);
  const setServerData = usePZStore((s) => s.setServerData);

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!isSidebarOpen) {
      prevOpenRef.current = false;
      return;
    }
    if (prevOpenRef.current) return;
    prevOpenRef.current = true;
    void fetchAllData(workspaceId);
  }, [isSidebarOpen, workspaceId, fetchAllData]);

  const handlePZEvent = useCallback(
    (payload: Record<string, unknown>) => {
      const eventType = payload.eventType as string;
      const steamId = payload.steamId as string;
      const pzUsername = payload.pzUsername as string;
      const content = payload.content as string;
      const createdAt = payload.createdAt as string;
      const messageId = payload.messageId as string;

      const event = {
        id: messageId,
        type: eventType,
        username: pzUsername,
        action: content,
        timestamp: createdAt,
        workdashUser: null,
      };

      if (eventType === "player_connect") {
        updateOnlinePlayer(steamId, true, {
          steamId,
          pzUsername,
          workdashUser: null,
          kills: 0,
          deaths: 0,
          survivalTime: 0,
        });
        setServerData({ isServerOnline: true, lastEventAt: createdAt });
      } else if (eventType === "player_disconnect") {
        updateOnlinePlayer(steamId, false, {
          steamId,
          pzUsername,
          workdashUser: null,
          kills: 0,
          deaths: 0,
          survivalTime: 0,
        });
      }

      if (eventType === "player_death" || eventType === "pvp_kill") {
        addDeathEvent({
          ...event,
          isPvp: eventType === "pvp_kill",
        });
      }

      addActivityEvent(event);
      setServerData({ lastEventAt: createdAt });
    },
    [updateOnlinePlayer, addDeathEvent, addActivityEvent, setServerData],
  );

  useEffect(() => {
    if (!isSidebarOpen) return;

    let transport: MediaTransportService;
    try {
      transport = MediaTransportService.getInstance();
    } catch {
      return;
    }
    const socket = transport.socket;
    if (!socket) return;

    socket.on("pz:event", handlePZEvent);
    return () => {
      socket.off("pz:event", handlePZEvent);
    };
  }, [isSidebarOpen, handlePZEvent]);

  /* ── Collapsed rail ────────────────────────────────────────────── */
  if (!isSidebarOpen) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col items-center border-l border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)] py-3">
        {/* Server icon with live indicator */}
        <div className="relative">
          <span className="text-base" title="PZ Server">
            🧟
          </span>
          {isServerOnline && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--wd-success)] ring-1 ring-[var(--wd-surface-panel)] animate-[wd-pz-pulse_2.5s_ease-in-out_infinite]" />
          )}
        </div>

        {/* Player count */}
        <span className="mt-1.5 flex h-4 w-4 items-center justify-center rounded bg-[var(--wd-surface-elevated)] text-[0.55rem] font-bold wd-text-muted">
          {onlinePlayers.length}
        </span>

        {/* Death count indicator */}
        {recentDeaths.length > 0 && (
          <span className="mt-1.5 text-[0.5rem] text-[var(--wd-danger)]" title={`${recentDeaths.length} deaths`}>
            💀
          </span>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          className="mt-auto h-6 w-6 inline-flex items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] transition-colors"
          aria-label="Expand PZ sidebar"
          title="Expand PZ sidebar"
        >
          <ChevronLeft size={14} />
        </button>
      </div>
    );
  }

  /* ── Expanded sidebar ──────────────────────────────────────────── */
  return (
    <div className="flex h-full w-[272px] shrink-0 flex-col border-l border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)]">
      {/* Header */}
      <div className="flex h-11 items-center justify-between border-b border-[var(--wd-border-subtle)] px-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio size={14} className="wd-text-accent" />
            {isServerOnline && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--wd-success)] animate-[wd-pz-pulse_2.5s_ease-in-out_infinite]" />
            )}
          </div>
          <span className="text-xs font-semibold wd-text-primary tracking-wide">
            PZ Server
          </span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isServerOnline
                ? "bg-[var(--wd-success)]"
                : "bg-[var(--wd-danger)]"
            }`}
          />
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="h-6 w-6 inline-flex items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)] transition-colors"
          aria-label="Collapse PZ sidebar"
          title="Collapse PZ sidebar"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <CollapsibleSection
            title="Status"
            icon={<span>📡</span>}
            isOpen={sectionStates.status}
            onToggle={() => toggleSection("status")}
            badge={`${onlinePlayers.length}`}
            badgeColor={onlinePlayers.length > 0 ? "success" : "muted"}
          >
            <PZServerStatus
              isOnline={isServerOnline}
              players={onlinePlayers}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Leaderboard"
            icon={<span>🏆</span>}
            isOpen={sectionStates.leaderboard}
            onToggle={() => toggleSection("leaderboard")}
          >
            <PZLeaderboard
              players={allPlayerStats}
              activeTab={leaderboardTab}
              onTabChange={setLeaderboardTab}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Death Log"
            icon={<span>💀</span>}
            isOpen={sectionStates.deaths}
            onToggle={() => toggleSection("deaths")}
            badge={
              recentDeaths.length > 0
                ? `${recentDeaths.length}`
                : undefined
            }
            badgeColor="danger"
          >
            <PZDeathLog deaths={recentDeaths} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Activity"
            icon={<span>⚡</span>}
            isOpen={sectionStates.activity}
            onToggle={() => toggleSection("activity")}
          >
            <PZActivityFeed events={recentActivity} />
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

export default PZSidebar;
