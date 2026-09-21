import React from "react";
import { ResponsiveLine } from "@nivo/line";
import type { DailyBucket } from "../_types";
import { formatCount, formatDayLabel } from "../format";
import { useAdminChartTheme } from "./useAdminChartTheme";
import { DotaChartTooltip } from "../../ChannelWidgets/DotaWidgets/DotaChartTooltip";

interface TimeSeriesChartProps {
  buckets: DailyBucket[];
  seriesLabel: string;
  color?: string;
}

/**
 * Single-series daily line. The series is always gap-filled server-side, so a
 * flat run of zeros is real data — not a hole in the chart.
 */
export function TimeSeriesChart({
  buckets,
  seriesLabel,
  color = "var(--wd-dota-1)",
}: TimeSeriesChartProps) {
  const theme = useAdminChartTheme();

  if (buckets.length === 0) {
    return (
      <p className="h-[180px] grid place-items-center text-sm wd-text-muted">
        No data in this range.
      </p>
    );
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) {
    return (
      <p className="h-[180px] grid place-items-center text-sm wd-text-muted">
        Nothing recorded in this range.
      </p>
    );
  }

  // Keep roughly 8 labels regardless of range so a 1y view stays readable.
  const tickStep = Math.max(1, Math.ceil(buckets.length / 8));

  return (
    <div className="h-[180px]">
      <ResponsiveLine
        data={[
          {
            id: seriesLabel,
            data: buckets.map((bucket) => ({
              x: bucket.day,
              y: bucket.count,
            })),
          },
        ]}
        theme={theme}
        margin={{ top: 8, right: 12, bottom: 28, left: 40 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: 0, max: "auto" }}
        colors={[color]}
        curve="monotoneX"
        enableArea
        areaOpacity={0.12}
        enablePoints={false}
        enableGridX={false}
        axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 4 }}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickValues: buckets
            .filter((_, index) => index % tickStep === 0)
            .map((bucket) => bucket.day),
          format: (value: string) => formatDayLabel(value),
        }}
        useMesh
        tooltip={({ point }) => (
          <DotaChartTooltip
            title={formatDayLabel(String(point.data.x))}
            items={[
              {
                label: seriesLabel,
                value: formatCount(Number(point.data.y)),
                color,
              },
            ]}
          />
        )}
      />
    </div>
  );
}
