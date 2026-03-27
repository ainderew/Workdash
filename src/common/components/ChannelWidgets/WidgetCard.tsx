import React, { type ReactNode } from "react";

type WidgetVariant = "default" | "alert" | "ranking" | "chart";

interface Props {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  accentColor: string;
  index: number;
  variant?: WidgetVariant;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function WidgetCard({
  title,
  icon: Icon,
  accentColor,
  index,
  variant = "default",
  headerExtra,
  children,
}: Props) {
  const variantClass =
    variant === "alert"
      ? "wd-widget-card-alert"
      : variant === "ranking"
        ? "wd-widget-card-ranking"
        : "";

  return (
    <div
      className={`wd-widget-card ${variantClass}`}
      style={
        {
          "--_widget-accent": accentColor,
          animationDelay: `${index * 60}ms`,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <div className="shrink-0 wd-text-muted">
          <Icon size={14} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider wd-text-muted">
          {title}
        </span>
        {headerExtra && <div className="ml-auto">{headerExtra}</div>}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}
