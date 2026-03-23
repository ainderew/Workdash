import React, { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  if (!isSidebarOpen) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col items-center border-l border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)] py-3">
        <span className="text-lg" title="PZ Server">
          {"\uD83E\uDDDF"}
        </span>
        <span className="mt-1 text-[0.6rem] font-bold wd-text-muted">
          {onlinePlayers.length}
        </span>
        <button
          type="button"
          onClick={toggleSidebar}
          className="mt-auto h-6 w-6 inline-flex items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
          aria-label="Expand PZ sidebar"
          title="Expand PZ sidebar"
        >
          <ChevronLeft size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-l border-[var(--wd-border-subtle)] bg-[var(--wd-surface-panel)]">
      <div className="flex h-10 items-center justify-between border-b border-[var(--wd-border-subtle)] px-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{"\uD83E\uDDDF"}</span>
          <span className="text-xs font-semibold wd-text-primary">
            PZ Server
          </span>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="h-6 w-6 inline-flex items-center justify-center rounded wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-elevated)]"
          aria-label="Collapse PZ sidebar"
          title="Collapse PZ sidebar"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-xs wd-text-muted">Loading...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <CollapsibleSection
            title="Server Status"
            isOpen={sectionStates.status}
            onToggle={() => toggleSection("status")}
            badge={`${onlinePlayers.length} online`}
          >
            <PZServerStatus
              isOnline={isServerOnline}
              players={onlinePlayers}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Leaderboard"
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
            isOpen={sectionStates.deaths}
            onToggle={() => toggleSection("deaths")}
            badge={recentDeaths.length > 0 ? `${recentDeaths.length} deaths` : undefined}
          >
            <PZDeathLog deaths={recentDeaths} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Activity"
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
