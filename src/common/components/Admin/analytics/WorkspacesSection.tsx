import React from "react";
import type { AdminAnalytics } from "../_types";
import { formatCompact, formatCount } from "../format";
import { AnalyticsSection, ChartCard } from "./AnalyticsSection";
import { StatTile, StatTileGrid } from "./StatTile";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { BreakdownBars } from "./BreakdownBars";
import { LeaderboardList } from "./LeaderboardList";

interface WorkspacesSectionProps {
  workspaces: AdminAnalytics["workspaces"];
  days: number;
}

const titleCase = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase();

export function WorkspacesSection({
  workspaces,
  days,
}: WorkspacesSectionProps) {
  const { invites } = workspaces;

  return (
    <AnalyticsSection title="Workspaces">
      <StatTileGrid>
        <StatTile
          label="Total workspaces"
          value={formatCompact(workspaces.total)}
        />
        <StatTile
          label={`Created (${days}d)`}
          value={formatCompact(workspaces.created)}
        />
        <StatTile
          label="Invites created"
          value={formatCompact(invites.created)}
          hint={`${formatCount(invites.uses)} uses`}
        />
        <StatTile
          // A ratio, not a percentage: one invite link can be redeemed many
          // times, so this routinely exceeds 1 and "234%" would read as a bug.
          label="Uses per invite"
          value={
            invites.created > 0
              ? `${(Math.round((invites.uses / invites.created) * 10) / 10).toFixed(1)}×`
              : "—"
          }
          hint="redemptions per invite created"
        />
      </StatTileGrid>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ChartCard title={`Workspaces created · last ${days} days`}>
          <TimeSeriesChart
            buckets={workspaces.createdByDay}
            seriesLabel="Workspaces"
            color="var(--wd-dota-3)"
          />
        </ChartCard>

        <div className="space-y-4">
          <ChartCard title="Visibility">
            <BreakdownBars
              rows={workspaces.visibilitySplit.map((entry) => ({
                label: titleCase(entry.visibility),
                value: entry.count,
              }))}
            />
          </ChartCard>

          <ChartCard title={`Join requests (${days}d)`}>
            <BreakdownBars
              rows={workspaces.joinRequests.map((entry) => ({
                label: titleCase(entry.status),
                value: entry.count,
              }))}
            />
          </ChartCard>
        </div>
      </div>

      <ChartCard title="Largest workspaces">
        <LeaderboardList
          entries={workspaces.topWorkspaces.map((workspace) => ({
            key: workspace.id,
            title: workspace.name,
            subtitle: `${formatCount(workspace.roomCount)} channels · owned by ${
              workspace.owner.name ?? workspace.owner.email
            }`,
            value: `${formatCount(workspace.memberCount)} members`,
          }))}
        />
      </ChartCard>
    </AnalyticsSection>
  );
}
