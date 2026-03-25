import React, { useEffect, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useWidgetStore } from "@/common/store/widgetStore";
import { WidgetSkeleton, WidgetEmpty } from "../WidgetShell";
import { useDotaChartTheme } from "./useDotaChartTheme";
import {
  DOTA_CHART_PALETTE,
  LINE_CHART_GRADIENT_DEFS,
  buildGradientFills,
} from "./chartColors";
import { DotaChartTooltip } from "./DotaChartTooltip";
import type { AvgMatchLengthData } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
}

export function AvgMatchLengthWidget({ workspaceId, channelId }: Props) {
  const [showAggregate, setShowAggregate] = useState(true);
  const theme = useDotaChartTheme();
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_avg_match_length`],
  ) as AvgMatchLengthData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_avg_match_length");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;

  const series = showAggregate
    ? [
        {
          id: "Team Average",
          data: data.aggregate.map((pt) => ({
            x: pt.date,
            y: Math.round(pt.avgDuration / 60),
          })),
        },
      ]
    : data.players
        .filter((p) => p.dataPoints.length > 0)
        .map((p) => ({
          id: p.displayName,
          data: p.dataPoints.map((pt) => ({
            x: pt.date,
            y: Math.round(pt.avgDuration / 60),
          })),
        }));

  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return <WidgetEmpty message="No match duration data yet" />;
  }

  return (
    <div>
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setShowAggregate(true)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            showAggregate
              ? "wd-bg-accent-soft text-[var(--wd-accent)]"
              : "wd-text-muted hover:wd-text-primary"
          }`}
        >
          Team
        </button>
        <button
          onClick={() => setShowAggregate(false)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            !showAggregate
              ? "wd-bg-accent-soft text-[var(--wd-accent)]"
              : "wd-text-muted hover:wd-text-primary"
          }`}
        >
          Per Player
        </button>
      </div>

      <div className="h-[180px]">
        <ResponsiveLine
          data={series}
          margin={{ top: 8, right: 12, bottom: 48, left: 44 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", stacked: false }}
          axisBottom={{
            tickRotation: -30,
            tickSize: 0,
            tickPadding: 4,
          }}
          axisLeft={{
            legend: "Duration (min)",
            legendPosition: "middle",
            legendOffset: -36,
            format: (v) => formatDuration(Number(v) * 60),
            tickSize: 0,
            tickPadding: 4,
          }}
          colors={[...DOTA_CHART_PALETTE]}
          pointSize={3}
          enableArea
          areaOpacity={1}
          defs={LINE_CHART_GRADIENT_DEFS}
          fill={buildGradientFills(series.map((s) => s.id))}
          useMesh
          enableGridX={false}
          legends={[
            {
              anchor: "bottom",
              direction: "row",
              translateY: 44,
              itemWidth: 80,
              itemHeight: 14,
              itemTextColor: "var(--wd-text-secondary)",
              symbolSize: 8,
            },
          ]}
          theme={theme}
          tooltip={({ point }) => (
            <DotaChartTooltip
              title={point.data.xFormatted as string}
              items={[
                {
                  label: point.seriesId as string,
                  value: `${point.data.y}m`,
                  color: point.color,
                },
              ]}
            />
          )}
        />
      </div>
    </div>
  );
}
