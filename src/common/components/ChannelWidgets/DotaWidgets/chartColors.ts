/**
 * Token-based color palettes for Dota chart widgets.
 * Uses dedicated --wd-dota-* CSS variables for data visualization,
 * keeping semantic colors (success/danger/warning) reserved for
 * actual status indicators (win/loss, tilt severity, etc.).
 *
 * Each theme defines 6 perceptually spaced hues (~60° apart)
 * anchored to the theme's accent family, ensuring:
 * - No two adjacent series look similar
 * - Colors don't carry unintended semantic meaning
 * - Palette works on both light and dark backgrounds
 */

/** 6-color categorical palette for multi-series charts (roles, players) */
export const DOTA_CHART_PALETTE = [
  "var(--wd-dota-1)",
  "var(--wd-dota-2)",
  "var(--wd-dota-3)",
  "var(--wd-dota-4)",
  "var(--wd-dota-5)",
  "var(--wd-dota-6)",
] as const;

/**
 * 4-color ward palette — paired scheme:
 * cool tones for placed (vision), warm tones for killed (combat)
 */
export const WARD_CHART_PALETTE = [
  "var(--wd-dota-1)", // Obs Placed — primary cool
  "var(--wd-dota-5)", // Sen Placed — secondary cool
  "var(--wd-dota-3)", // Obs Killed — primary warm
  "var(--wd-dota-4)", // Sen Killed — secondary warm
] as const;

/**
 * 3-color damage palette — semantically mapped:
 * warm for physical, cool for magical, distinct for pure
 */
export const DAMAGE_CHART_PALETTE = [
  "var(--wd-dota-3)", // Physical — amber/orange (martial)
  "var(--wd-dota-1)", // Magical — indigo/cool (arcane)
  "var(--wd-dota-2)", // Pure — emerald/teal (unique)
] as const;

/** SVG gradient definitions for Nivo line charts with area fills */
export const LINE_CHART_GRADIENT_DEFS = [
  {
    id: "gradientDota1",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-dota-1)", opacity: 0.35 },
      { offset: 100, color: "var(--wd-dota-1)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientDota2",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-dota-2)", opacity: 0.35 },
      { offset: 100, color: "var(--wd-dota-2)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientDota3",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-dota-3)", opacity: 0.35 },
      { offset: 100, color: "var(--wd-dota-3)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientDota4",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-dota-4)", opacity: 0.35 },
      { offset: 100, color: "var(--wd-dota-4)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientDota5",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-dota-5)", opacity: 0.35 },
      { offset: 100, color: "var(--wd-dota-5)", opacity: 0.02 },
    ],
  },
  {
    id: "gradientDota6",
    type: "linearGradient" as const,
    colors: [
      { offset: 0, color: "var(--wd-dota-6)", opacity: 0.35 },
      { offset: 100, color: "var(--wd-dota-6)", opacity: 0.02 },
    ],
  },
];

/**
 * Builds fill rules that map each series ID to its corresponding gradient.
 * Call with the series IDs in order to get properly indexed gradient fills.
 */
export function buildGradientFills(seriesIds: string[]) {
  const gradientIds = [
    "gradientDota1",
    "gradientDota2",
    "gradientDota3",
    "gradientDota4",
    "gradientDota5",
    "gradientDota6",
  ];
  return seriesIds.map((id, i) => ({
    match: { id },
    id: gradientIds[i % gradientIds.length]!,
  }));
}
