import React, { useEffect } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { useDotaChartTheme } from "./useDotaChartTheme";
import { WARD_CHART_PALETTE } from "./chartColors";
import { DotaChartTooltip } from "./DotaChartTooltip";
import type { WardStatsData } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

export function WardStatsWidget({ workspaceId, channelId }: Props) {
  const theme = useDotaChartTheme();
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_ward_stats`],
  ) as WardStatsData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_ward_stats");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="No ward stats data yet" />;

  const chartData = data.players.map((p) => ({
    player: p.displayName,
    "Obs Placed": Math.round(p.obsPlaced / (p.gamesPlayed || 1)),
    "Sen Placed": Math.round(p.senPlaced / (p.gamesPlayed || 1)),
    "Obs Killed": Math.round(p.obsKills / (p.gamesPlayed || 1)),
    "Sen Killed": Math.round(p.senKills / (p.gamesPlayed || 1)),
  }));

  return (
    <div className="h-[200px]">
      <ResponsiveBar
        data={chartData}
        keys={["Obs Placed", "Sen Placed", "Obs Killed", "Sen Killed"]}
        indexBy="player"
        layout="horizontal"
        groupMode="grouped"
        margin={{ top: 4, right: 12, bottom: 48, left: 80 }}
        padding={0.2}
        colors={[...WARD_CHART_PALETTE]}
        axisBottom={{
          legend: "Per Game Avg",
          legendPosition: "middle",
          legendOffset: 20,
          tickSize: 0,
          tickPadding: 4,
        }}
        axisLeft={{ tickSize: 0, tickPadding: 6 }}
        enableGridX={false}
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
            items={[{ label: String(id), value: String(value), color }]}
          />
        )}
      />
    </div>
  );
}
