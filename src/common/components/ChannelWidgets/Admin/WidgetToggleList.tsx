import React from "react";
import { useWidgetStore } from "@/common/store/widgetStore";
import { AVAILABLE_WIDGETS } from "@/common/config/widgets";
import { CONFIG } from "@/common/utils/config";
import { tokenStore } from "@/common/utils/tokenStore";

interface Props {
  workspaceId: string;
  channelId: string;
}

export function WidgetToggleList({ workspaceId, channelId }: Props) {
  const configs = useWidgetStore((s) => s.configsByChannel[channelId]) ?? [];
  const fetchWidgetConfigs = useWidgetStore((s) => s.fetchWidgetConfigs);

  async function toggleWidget(widgetType: string, pluginType: string) {
    const existing = configs.find((c) => c.widgetType === widgetType);
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenStore.getJwt()}`,
    };
    const baseUrl = `${CONFIG.SFU_SERVER_URL}/api/workspaces/${workspaceId}/channels/${channelId}/widgets`;

    if (existing) {
      await fetch(`${baseUrl}/${existing.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isEnabled: !existing.isEnabled }),
      });
    } else {
      await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ widgetType, pluginType }),
      });
    }

    await fetchWidgetConfigs(workspaceId, channelId);
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium wd-text-muted mb-1.5">Enable Widgets</div>
      {AVAILABLE_WIDGETS.map((w) => {
        const config = configs.find((c) => c.widgetType === w.widgetType);
        const isEnabled = config?.isEnabled ?? false;

        return (
          <label
            key={w.widgetType}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:wd-bg-elevated cursor-pointer"
          >
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => void toggleWidget(w.widgetType, w.pluginType)}
              className="rounded accent-[var(--wd-accent)]"
            />
            <div className="flex-1">
              <div className="text-sm wd-text-primary">{w.label}</div>
              <div className="text-xs wd-text-muted">{w.description}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
