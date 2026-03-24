import React, { useEffect } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { useDotaChartTheme } from "./useDotaChartTheme";
import { DOTA_CHART_PALETTE, LINE_CHART_GRADIENT_DEFS, buildGradientFills } from "./chartColors";
import { DotaChartTooltip } from "./DotaChartTooltip";
import type { PowerSpikeData } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

export function PowerSpikesWidget({ workspaceId, channelId }: Props) {
  const theme = useDotaChartTheme();
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_power_spikes`],
  ) as PowerSpikeData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_power_spikes");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="No match data for power spikes" />;

  const goldSeries = data.players
    .filter((p) => p.goldAdvantage.length > 0)
    .map((p) => ({
      id: `${p.displayName} (Gold)`,
      data: p.goldAdvantage.map((val, i) => ({ x: i, y: val })),
    }));

  const xpSeries = data.players
    .filter((p) => p.xpAdvantage.length > 0)
    .map((p) => ({
      id: `${p.displayName} (XP)`,
      data: p.xpAdvantage.map((val, i) => ({ x: i, y: val })),
    }));

  const allSeries = [...goldSeries, ...xpSeries];

  if (allSeries.length === 0)
    return <WidgetEmpty message="No timeline data available" />;

  return (
    <div className="h-[200px]">
      <ResponsiveLine
        data={allSeries}
        margin={{ top: 8, right: 100, bottom: 32, left: 44 }}
        xScale={{ type: "linear" }}
        yScale={{ type: "linear", stacked: false }}
        axisBottom={{
          legend: "Minute",
          legendPosition: "middle",
          legendOffset: 24,
          tickSize: 0,
          tickPadding: 4,
        }}
        axisLeft={{
          legend: "Advantage",
          legendPosition: "middle",
          legendOffset: -36,
          tickSize: 0,
          tickPadding: 4,
        }}
        colors={[...DOTA_CHART_PALETTE]}
        pointSize={2}
        enableArea
        areaOpacity={1}
        defs={LINE_CHART_GRADIENT_DEFS}
        fill={buildGradientFills(allSeries.map((s) => s.id))}
        enableGridX={false}
        useMesh
        legends={[
          {
            anchor: "bottom-right",
            direction: "column",
            translateX: 100,
            itemWidth: 90,
            itemHeight: 14,
            itemTextColor: "var(--wd-text-secondary)",
            symbolSize: 8,
          },
        ]}
        theme={theme}
        tooltip={({ point }) => (
          <DotaChartTooltip
            title={`Minute ${point.data.x}`}
            items={[
              {
                label: point.seriesId as string,
                value: String(point.data.y),
                color: point.color,
              },
            ]}
          />
        )}
      />
    </div>
  );
}
