import React from "react";
import type { AdminAnalytics } from "../_types";
import { formatCompact, formatPercent } from "../format";
import { AnalyticsSection, ChartCard } from "./AnalyticsSection";
import { StatTile, StatTileGrid } from "./StatTile";
import { TimeSeriesChart } from "./TimeSeriesChart";

interface GrowthSectionProps {
  growth: AdminAnalytics["growth"];
  days: number;
}

export function GrowthSection({ growth, days }: GrowthSectionProps) {
  const { dau, wau, mau } = growth.activeUsers;

  return (
    <AnalyticsSection
      title="Growth & activity"
      description="Active means signed in or seen by the presence service in the window."
    >
      <StatTileGrid>
        <StatTile label="Total users" value={formatCompact(growth.totalUsers)} />
        <StatTile
          label={`New (${days}d)`}
          value={formatCompact(growth.newUsers)}
          hint={
            growth.totalUsers > 0
              ? `${formatPercent(growth.newUsers / growth.totalUsers)} of all users`
              : undefined
          }
        />
        <StatTile
          label="Online now"
          value={formatCompact(growth.onlineNow)}
          accent
        />
        <StatTile
          label="Stickiness"
          value={mau > 0 ? formatPercent(dau / mau) : "—"}
          hint="DAU / MAU"
        />
      </StatTileGrid>

      <StatTileGrid>
        <StatTile label="DAU" value={formatCompact(dau)} hint="last 24 hours" />
        <StatTile label="WAU" value={formatCompact(wau)} hint="last 7 days" />
        <StatTile label="MAU" value={formatCompact(mau)} hint="last 30 days" />
        <StatTile
          label="Never signed in"
          value={formatCompact(Math.max(0, growth.totalUsers - mau))}
          hint="no activity in 30d"
        />
      </StatTileGrid>

      <ChartCard title={`Signups per day · last ${days} days`}>
        <TimeSeriesChart
          buckets={growth.signupsByDay}
          seriesLabel="Signups"
          color="var(--wd-dota-1)"
        />
      </ChartCard>
    </AnalyticsSection>
  );
}
