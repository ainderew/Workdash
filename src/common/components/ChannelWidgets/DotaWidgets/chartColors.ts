/**
 * Token-based color palettes for Dota chart widgets.
 * Uses CSS variable strings so charts inherit the active theme (light/dark).
 */

/** 6-color palette for multi-series charts (roles, players) */
export const DOTA_CHART_PALETTE = [
  "var(--wd-accent)",
  "var(--wd-success)",
  "var(--wd-warning)",
  "var(--wd-danger)",
  "var(--wd-info)",
  "rgb(var(--wd-accent-rgb) / 0.5)",
] as const;

/** 4-color palette for ward stats (placed/killed × obs/sen) */
export const WARD_CHART_PALETTE = [
  "var(--wd-info)",
  "var(--wd-accent)",
  "var(--wd-warning)",
  "var(--wd-danger)",
] as const;

/** 3-color palette for damage composition (physical/magical/pure) */
export const DAMAGE_CHART_PALETTE = [
  "var(--wd-danger)",
  "var(--wd-info)",
  "var(--wd-accent)",
] as const;

/** SVG gradient definitions for Nivo line charts with area fills */
export const LINE_CHART_GRADIENT_DEFS = [
  {
    id: "gradientAccent",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-accent)", opacity: 0.4 },
      { offset: 100, color: "var(--wd-accent)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientSuccess",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-success)", opacity: 0.4 },
      { offset: 100, color: "var(--wd-success)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientWarning",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-warning)", opacity: 0.4 },
      { offset: 100, color: "var(--wd-warning)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientDanger",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-danger)", opacity: 0.4 },
      { offset: 100, color: "var(--wd-danger)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientInfo",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-info)", opacity: 0.4 },
      { offset: 100, color: "var(--wd-info)", opacity: 0.02 },
    ],
  },
];

/**
 * Builds fill rules that map each series ID to its corresponding gradient.
 * Call with the series IDs in order to get properly indexed gradient fills.
 */
export function buildGradientFills(seriesIds: string[]) {
  const gradientIds = [
    "gradientAccent",
    "gradientSuccess",
    "gradientWarning",
    "gradientDanger",
    "gradientInfo",
  ];
  return seriesIds.map((id, i) => ({
    match: { id },
    id: gradientIds[i % gradientIds.length]!,
  }));
}
