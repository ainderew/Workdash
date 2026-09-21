import React from "react";

interface AnalyticsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AnalyticsSection({
  title,
  description,
  children,
}: AnalyticsSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-xs wd-text-muted mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="wd-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide wd-text-muted mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
