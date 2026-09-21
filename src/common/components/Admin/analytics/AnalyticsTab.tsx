import React, { useState } from "react";
import { useAdminResource } from "../useAdminApi";
import type { AdminAnalytics } from "../_types";
import { RangePicker, type RangeDays } from "./RangePicker";
import { GrowthSection } from "./GrowthSection";
import { EngagementSection } from "./EngagementSection";
import { WorkspacesSection } from "./WorkspacesSection";
import { AuthSection } from "./AuthSection";

export function AnalyticsTab({ jwt }: { jwt: string }) {
  const [days, setDays] = useState<RangeDays>(30);
  const { data, error, isLoading } = useAdminResource<AdminAnalytics>(
    `/analytics?days=${days}`,
    jwt,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm wd-text-muted">
          Derived from live application data — there is no separate analytics
          store, so every number is a roll-up of rows the product already writes.
        </p>
        <RangePicker days={days} onChange={setDays} />
      </div>

      {error && (
        <div className="wd-card p-6 text-sm" role="alert">
          <span className="wd-text-primary font-medium">
            Could not load analytics.
          </span>{" "}
          <span className="wd-text-muted">{error.message}</span>
        </div>
      )}

      {!data && isLoading && (
        <p className="text-sm wd-text-muted">Crunching numbers…</p>
      )}

      {data && (
        <div
          className={`space-y-6 transition-opacity ${isLoading ? "opacity-60" : ""}`}
        >
          <GrowthSection growth={data.growth} days={days} />
          <EngagementSection engagement={data.engagement} days={days} />
          <WorkspacesSection workspaces={data.workspaces} days={days} />
          <AuthSection auth={data.auth} />
        </div>
      )}
    </div>
  );
}
