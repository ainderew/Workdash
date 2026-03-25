import React, { useCallback, useEffect, useRef } from "react";
import { usePZStore } from "@/common/store/pzStore";
import CollapsibleSection from "./CollapsibleSection";
import PZServerStatus from "./PZServerStatus";
import PZLeaderboard from "./PZLeaderboard";
import PZDeathLog from "./PZDeathLog";
import PZActivityFeed from "./PZActivityFeed";
import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportService";
import { CONFIG } from "@/common/utils/config";
import { tokenStore } from "@/common/utils/tokenStore";
import { logger } from "@/common/utils/logger";

const IS_DEV = process.env.NODE_ENV !== "production";

const FAKE_NAMES = ["Ash", "Ripley", "Dutch", "Negan", "Joel", "Ellie"];
const FAKE_EVENT_TYPES = [
  "player_connect",
  "player_disconnect",
  "player_death",
  "pvp_kill",
  "player_craft",
  "base_build",
] as const;
const FAKE_ACTIONS: Record<string, string[]> = {
  player_connect: ["joined the server"],
  player_disconnect: ["left the server"],
  player_death: [
    "was eaten by zombies",
    "bled out in the woods",
    "died of infection",
    "fell from a rooftop",
  ],
  pvp_kill: ["was killed by another survivor"],
  player_craft: ["crafted a baseball bat", "built a rain collector", "made a molotov"],
  base_build: ["fortified their safehouse", "built a wall section", "placed a crate"],
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendSimulateEvent(workspaceId: string): Promise<void> {
  const eventType = pickRandom(FAKE_EVENT_TYPES);
  const username = pickRandom(FAKE_NAMES);
  const actions = FAKE_ACTIONS[eventType] ?? ["did something"];

  const res = await fetch(
    `${CONFIG.SFU_SERVER_URL}/api/workspaces/${workspaceId}/pz/simulate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenStore.getJwt()}`,
      },
      body: JSON.stringify({
        eventType,
        username,
        action: pickRandom(actions),
      }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Simulate failed: ${res.status} — ${JSON.stringify(body)}`);
  }
}

interface PZSidebarProps {
  workspaceId: string;
  isActive: boolean;
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
      <div className="space-y-2">
        <SkeletonLine width="40%" />
        <div className="space-y-1.5 rounded-lg bg-[var(--wd-surface-base)] p-2 ring-1 ring-[var(--wd-border-subtle)]">
          <SkeletonLine width="70%" />
          <SkeletonLine width="55%" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonLine width="35%" />
        <div className="space-y-1.5">
          <SkeletonLine width="80%" />
          <SkeletonLine width="65%" />
          <SkeletonLine width="50%" />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonLine width="30%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="75%" />
      </div>
    </div>
  );
}

function PZSidebar({ workspaceId, isActive }: PZSidebarProps) {
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

  const prevActiveRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      prevActiveRef.current = false;
      return;
    }
    if (prevActiveRef.current) return;
    prevActiveRef.current = true;
    void fetchAllData(workspaceId);
  }, [isActive, workspaceId, fetchAllData]);

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

  const handleServerStatus = useCallback(
    (payload: Record<string, unknown>) => {
      setServerData({ isServerOnline: payload.isOnline as boolean });
    },
    [setServerData],
  );

  useEffect(() => {
    if (!isActive) return;

    let transport: MediaTransportService;
    try {
      transport = MediaTransportService.getInstance();
    } catch {
      return;
    }
    const socket = transport.socket;
    if (!socket) return;

    socket.on("pz:event", handlePZEvent);
    socket.on("pz:server_status", handleServerStatus);
    return () => {
      socket.off("pz:event", handlePZEvent);
      socket.off("pz:server_status", handleServerStatus);
    };
  }, [isActive, handlePZEvent, handleServerStatus]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
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

      {IS_DEV && (
        <div className="mt-auto border-t border-[var(--wd-border-subtle)] px-3 py-2">
          <button
            type="button"
            onClick={() => void sendSimulateEvent(workspaceId).catch(logger.error)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--wd-surface-base)] px-2 py-1.5 text-[0.6rem] font-medium wd-text-muted ring-1 ring-[var(--wd-border-subtle)] transition-colors hover:wd-text-secondary hover:bg-[var(--wd-surface-elevated)]"
          >
            🧪 Simulate Event
          </button>
        </div>
      )}
    </div>
  );
}

export default PZSidebar;
