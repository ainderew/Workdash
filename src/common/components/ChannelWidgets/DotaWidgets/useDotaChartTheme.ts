import { useMemo } from "react";
import type { PartialTheme } from "@nivo/theming";

/**
 * Shared Nivo theme for all Dota chart widgets.
 * Uses --wd-* design tokens for consistent styling across light/dark modes.
 */
export function useDotaChartTheme(): PartialTheme {
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
          text: { fill: "var(--wd-text-muted)", fontSize: 11 },
        },
        legend: {
          text: {
            fill: "var(--wd-text-secondary)",
            fontSize: 11,
            fontWeight: 600,
          },
        },
      },
      grid: {
        line: {
          stroke: "var(--wd-border-subtle)",
          strokeDasharray: "3 3",
          strokeOpacity: 0.5,
        },
      },
      legends: {
        text: { fill: "var(--wd-text-secondary)", fontSize: 10 },
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
