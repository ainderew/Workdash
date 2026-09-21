import React from "react";
import type { AdminAnalytics } from "../_types";
import { formatCompact, formatPercent } from "../format";
import { AnalyticsSection, ChartCard } from "./AnalyticsSection";
import { StatTile, StatTileGrid } from "./StatTile";
import { BreakdownBars } from "./BreakdownBars";

export function AuthSection({ auth }: { auth: AdminAnalytics["auth"] }) {
  const { integrations } = auth;

  return (
    <AnalyticsSection title="Auth & integrations">
      <StatTileGrid>
        <StatTile
          label="Email verified"
          value={formatPercent(auth.verifiedRate)}
          hint={`${formatCompact(auth.verified)} of ${formatCompact(auth.total)}`}
        />
        <StatTile
          label="Steam linked"
          value={formatCompact(integrations.steamLinks)}
        />
        <StatTile
          label="Betrayal linked"
          value={formatCompact(integrations.betrayalLinks)}
        />
        <StatTile
          label="Push subscribers"
          value={formatCompact(integrations.pushSubscribers)}
          hint={`${formatCompact(integrations.pushSubscriptions)} devices`}
        />
      </StatTileGrid>

      <ChartCard title="Sign-in method">
        <BreakdownBars
          rows={[
            { label: "Magic link", value: auth.magicLink },
            { label: "Google or unrecorded", value: auth.unrecorded },
          ]}
        />
        <p className="text-[11px] wd-text-muted mt-3 leading-relaxed">
          Only the magic-link flow writes to <code>User.authMethods</code>, so
          Google sign-ups and pre-migration accounts are indistinguishable here.
          Recording the method on Google sync would split this cleanly.
        </p>
      </ChartCard>
    </AnalyticsSection>
  );
}
