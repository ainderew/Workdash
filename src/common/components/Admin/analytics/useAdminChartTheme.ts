import { useMemo } from "react";
import type { PartialTheme } from "@nivo/theming";

/**
 * Nivo theme for the admin analytics charts. Mirrors useDotaChartTheme so the
 * two chart surfaces in the app read as one system, and stays token-based so
 * both light and dark themes work without a second palette.
 */
export function useAdminChartTheme(): PartialTheme {
  return useMemo<PartialTheme>(
    () => ({
      text: {
        fill: "var(--wd-text-primary)",
        fontSize: 11,
        fontFamily: "inherit",
      },
      axis: {
        domain: { line: { stroke: "transparent" } },
        ticks: {
          line: { stroke: "transparent" },
          text: { fill: "var(--wd-text-muted)", fontSize: 10 },
        },
        legend: {
          text: { fill: "var(--wd-text-secondary)", fontSize: 11 },
        },
      },
      grid: {
        line: {
          stroke: "var(--wd-border-subtle)",
          strokeDasharray: "3 3",
          strokeOpacity: 0.5,
        },
      },
      crosshair: {
        line: {
          stroke: "var(--wd-text-muted)",
          strokeOpacity: 0.5,
          strokeDasharray: "4 4",
        },
      },
      tooltip: {
        container: {
          background: "transparent",
          padding: 0,
          boxShadow: "none",
          borderRadius: 0,
        },
      },
    }),
    [],
  );
}
