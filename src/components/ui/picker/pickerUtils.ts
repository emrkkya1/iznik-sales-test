// Pure, unit-testable helpers for the Picker primitive.

// Snap offsets so each item centers in a viewport of `containerWidth`.
// widths[i] = measured width of item i. Item 0 centers at scrollX 0; the last
// item centers exactly at the maximum scroll offset.
export function computeSnapOffsets(
  widths: number[],
  containerWidth: number,
): number[] {
  if (widths.length === 0 || containerWidth <= 0) return [];

  const padLeading = (containerWidth - widths[0]) / 2;
  const offsets: number[] = [];
  let left = padLeading;

  for (let i = 0; i < widths.length; i++) {
    offsets.push(left + widths[i] / 2 - containerWidth / 2);
    left += widths[i];
  }

  return offsets;
}

export type PickerFontSize = 'md' | 'sm' | 'xs' | '2xs';

// Length-based font size so long names shrink.
export function pickerFontSize(label: string): PickerFontSize {
  const len = label.length;
  if (len <= 12) return 'md';
  if (len <= 18) return 'sm';
  if (len <= 26) return 'xs';
  return '2xs';
}

// Nearest snap offset -> index (used in onMomentumScrollEnd).
export function snapIndexForOffset(
  offsets: number[],
  offsetX: number,
): number {
  if (offsets.length === 0) return -1;

  let best = 0;
  for (let i = 1; i < offsets.length; i++) {
    if (Math.abs(offsets[i] - offsetX) < Math.abs(offsets[best] - offsetX)) {
      best = i;
    }
  }
  return best;
}
