import React from "react";
import type { AdminAnalytics } from "../_types";
import { displayName, formatBytes, formatCompact, formatCount } from "../format";
import { AnalyticsSection, ChartCard } from "./AnalyticsSection";
import { StatTile, StatTileGrid } from "./StatTile";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { LeaderboardList } from "./LeaderboardList";

interface EngagementSectionProps {
  engagement: AdminAnalytics["engagement"];
  days: number;
}

export function EngagementSection({
  engagement,
  days,
}: EngagementSectionProps) {
  return (
    <AnalyticsSection
      title="Engagement"
      description="Deleted messages are excluded throughout."
    >
      <StatTileGrid>
        <StatTile
          label={`Messages (${days}d)`}
          value={formatCompact(engagement.totalMessages)}
        />
        <StatTile
          label="Per day"
          value={formatCompact(Math.round(engagement.messagesPerDay))}
          hint="average over the window"
        />
        <StatTile
          label="Active channels"
          value={formatCompact(engagement.activeChannels)}
          hint="at least one message"
        />
        <StatTile
          label="Attachments"
          value={formatCompact(engagement.attachments.count)}
          hint={formatBytes(engagement.attachments.totalBytes)}
        />
      </StatTileGrid>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ChartCard title={`Messages per day · last ${days} days`}>
          <TimeSeriesChart
            buckets={engagement.messagesByDay}
            seriesLabel="Messages"
            color="var(--wd-dota-2)"
          />
        </ChartCard>

        <ChartCard title="Top posters">
          <LeaderboardList
            entries={engagement.topPosters.map((poster) => ({
              key: String(poster.userId),
              title: poster.user
                ? displayName(poster.user)
                : `User #${poster.userId}`,
              subtitle: poster.user?.email,
              value: formatCount(poster.messageCount),
            }))}
          />
        </ChartCard>
      </div>
    </AnalyticsSection>
  );
}
