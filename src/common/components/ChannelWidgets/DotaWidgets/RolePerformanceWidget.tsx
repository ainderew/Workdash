import React, { useEffect } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { useDotaChartTheme } from "./useDotaChartTheme";
import { DOTA_CHART_PALETTE } from "./chartColors";
import { DotaChartTooltip } from "./DotaChartTooltip";
import type { RolePerformanceData } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

export function RolePerformanceWidget({ workspaceId, channelId }: Props) {
  const theme = useDotaChartTheme();
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_role_performance`],
  ) as RolePerformanceData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_role_performance");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="No role performance data yet" />;

  const chartData = data.players.map((p) => {
    const entry: Record<string, string | number> = { player: p.displayName };
    for (const r of p.roles) {
      entry[r.role] = r.winRate;
    }
    return entry;
  });

  const allRoles = [
    ...new Set(data.players.flatMap((p) => p.roles.map((r) => r.role))),
  ];

  return (
    <div className="h-[220px]">
      <ResponsiveBar
        data={chartData}
        keys={allRoles}
        indexBy="player"
        groupMode="grouped"
        margin={{ top: 10, right: 12, bottom: 48, left: 44 }}
        padding={0.2}
        valueScale={{ type: "linear" }}
        colors={[...DOTA_CHART_PALETTE]}
        axisLeft={{
          legend: "Win Rate %",
          legendPosition: "middle",
          legendOffset: -36,
          tickSize: 0,
          tickPadding: 4,
        }}
        axisBottom={{
          tickRotation: -15,
          tickSize: 0,
          tickPadding: 6,
        }}
        enableGridY={false}
        legends={[
          {
            dataFrom: "keys",
            anchor: "bottom",
            direction: "row",
            translateY: 44,
            itemWidth: 80,
            itemHeight: 16,
            itemTextColor: "var(--wd-text-secondary)",
            symbolSize: 8,
          },
        ]}
        theme={theme}
        borderRadius={6}
        tooltip={({ id, value, color }) => (
          <DotaChartTooltip
            items={[{ label: String(id), value: `${value}%`, color }]}
          />
        )}
      />
    </div>
  );
}
