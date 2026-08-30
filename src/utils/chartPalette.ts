/**
 * Chart palette — categorical hues for pie / bar / line series.
 *
 * React Native SVG `<Pie>`, `<Bar>`, `<Line>` etc. cannot consume Tailwind
 * className utilities — fill / stroke must be a concrete color string.
 * This module mirrors the `--chart-*` tokens defined in `src/global.css`.
 *
 * If the tokens in `global.css` change, update the hex values here to match.
 * The order is curated (brand-emphasizing first, neutral last) and is the
 * canonical palette passed to all admin chart components.
 */

export const CHART_PALETTE = [
  '#6A4715', // chart-1 — primary brown
  '#004C6E', // chart-2 — secondary navy
  '#006093', // chart-3 — info
  '#3C749C', // chart-4 — info-soft
  '#85653D', // chart-5 — muted-foreground
  '#C43428', // chart-6 — destructive
  '#724E1C', // chart-7 — ring (neutral brown)
] as const;

export const CHART_AXIS_COLOR = '#E5DCCD'; // chart-axis — border
export const CHART_LABEL_COLOR = '#85653D'; // chart-label — muted-foreground
export const CHART_PRIMARY_COLOR = '#6A4715'; // primary brand brown for line series

export function chartColorAt(index: number): string {
  return CHART_PALETTE[((index % CHART_PALETTE.length) + CHART_PALETTE.length) % CHART_PALETTE.length];
}