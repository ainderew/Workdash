import React, { useEffect } from "react";
import { Settings } from "lucide-react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { TrackedPlayerManager } from "./TrackedPlayerManager";
import { WidgetToggleList } from "./WidgetToggleList";

interface Props {
  workspaceId: string;
  channelId: string;
  onClose: () => void;
}

export function WidgetChannelSettings({ workspaceId, channelId, onClose }: Props) {
  const fetchWidgetConfigs = useWidgetStore((s) => s.fetchWidgetConfigs);
  const fetchTrackedPlayers = useWidgetStore((s) => s.fetchTrackedPlayers);

  useEffect(() => {
    void fetchWidgetConfigs(workspaceId, channelId);
    void fetchTrackedPlayers(workspaceId, channelId);
  }, [workspaceId, channelId, fetchWidgetConfigs, fetchTrackedPlayers]);

  return (
    <div className="wd-bg-panel rounded-lg border wd-border-subtle p-4 space-y-4 w-[380px] max-h-[calc(100vh-80px)] overflow-y-auto shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={16} className="wd-text-muted" />
          <h3 className="text-sm font-semibold wd-text-primary">Channel Widgets</h3>
        </div>
        <button
          onClick={onClose}
          className="text-xs wd-text-muted hover:wd-text-primary"
        >
          Close
        </button>
      </div>

      <WidgetToggleList workspaceId={workspaceId} channelId={channelId} />

      <div className="border-t wd-border-subtle pt-4">
        <TrackedPlayerManager workspaceId={workspaceId} channelId={channelId} />
      </div>
    </div>
  );
}
