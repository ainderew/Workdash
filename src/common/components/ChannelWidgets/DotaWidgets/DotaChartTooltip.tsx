import React from "react";

interface TooltipItem {
  label: string;
  value: string | number;
  color?: string;
}

interface DotaChartTooltipProps {
  title?: string;
  items: TooltipItem[];
}

/** Themed tooltip for Nivo charts. Matches the wd-widget-card visual language. */
export function DotaChartTooltip({ title, items }: DotaChartTooltipProps) {
  const accentColor = items[0]?.color;

  return (
    <div className="wd-chart-tooltip">
      {accentColor && (
        <div
          className="h-0.5 rounded-full -mx-1 mb-1.5"
          style={{ backgroundColor: accentColor, opacity: 0.4 }}
        />
      )}
      {title && (
        <div className="text-[10px] font-semibold wd-text-primary mb-1">
          {title}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 text-[10px]"
          >
            {item.color && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="wd-text-muted">{item.label}</span>
            <span className="ml-auto font-semibold wd-text-primary tabular-nums">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
