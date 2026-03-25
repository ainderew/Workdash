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
import type { TrendsData } from "../_types";

interface Props {
  workspaceId: string;
  channelId: string;
}

type MetricTab = "winRate" | "mmr" | "heroDiversity";

export function TrendsDashboardWidget({ workspaceId, channelId }: Props) {
  const [metric, setMetric] = useState<MetricTab>("winRate");
  const theme = useDotaChartTheme();
  const fetchWidgetData = useWidgetStore((s) => s.fetchWidgetData);
  const data = useWidgetStore(
    (s) => s.widgetDataByKey[`${channelId}:dota_trends`],
  ) as TrendsData | undefined;

  useEffect(() => {
    void fetchWidgetData(workspaceId, channelId, "dota_trends");
  }, [workspaceId, channelId, fetchWidgetData]);

  if (!data) return <WidgetSkeleton />;
  if (data.players.length === 0)
    return <WidgetEmpty message="No trend data yet" />;

  const series = data.players
    .map((p) => {
      const points =
        metric === "winRate"
          ? p.winRateOverTime
          : metric === "mmr"
            ? p.mmrOverTime
            : p.heroDiversity;

      return {
        id: p.displayName,
        data: points.map((pt) => ({
          x: pt.date,
          y:
            "winRate" in pt
              ? pt.winRate
              : "mmr" in pt
                ? pt.mmr
                : pt.score,
        })),
      };
    })
    .filter((s) => s.data.length > 0);

  const yLegend =
    metric === "winRate"
      ? "Win Rate %"
      : metric === "mmr"
        ? "MMR"
        : "Diversity %";

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {(["winRate", "mmr", "heroDiversity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMetric(tab)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              metric === tab
                ? "wd-bg-accent-soft text-[var(--wd-accent)]"
                : "wd-text-muted hover:wd-text-primary"
            }`}
          >
            {tab === "winRate"
              ? "Win Rate"
              : tab === "mmr"
                ? "MMR"
                : "Hero Diversity"}
          </button>
        ))}
      </div>

      {series.length === 0 ? (
        <WidgetEmpty
          message={`No ${yLegend.toLowerCase()} data available`}
        />
      ) : (
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
              legend: yLegend,
              legendPosition: "middle",
              legendOffset: -36,
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
                    value: `${point.data.y}${metric === "mmr" ? "" : "%"}`,
                    color: point.color,
                  },
                ]}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}
