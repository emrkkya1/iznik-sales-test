import type { DistributionRow } from '@/types';

// Takes ranked rows from the server and merges everything past `topN` into a single
// "Diğer (N)" row. Defensive against null/NaN/Infinity values from JSONB.
export function mergeTopDistribution(
  rows: readonly DistributionRow[],
  topN: number,
): { merged: DistributionRow[]; mergedCount: number } {
  const cleaned = rows.filter(
    (r) => Number.isFinite(r.value) && r.value > 0,
  );

  if (cleaned.length === 0) {
    return { merged: [], mergedCount: 0 };
  }

  const sorted = [...cleaned].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);

  if (rest.length === 0) {
    return { merged: top, mergedCount: 0 };
  }

  const restValue = rest.reduce((sum, r) => sum + r.value, 0);

  if (restValue === 0) {
    return { merged: top, mergedCount: 0 };
  }

  return {
    merged: [
      ...top,
      {
        id: '__merged__',
        label: `Diğer (${rest.length})`,
        value: restValue,
        isMerged: true,
      },
    ],
    mergedCount: rest.length,
  };
}