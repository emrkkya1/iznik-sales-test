import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { SummaryRange } from '@/types';

const SEGMENTS: { value: SummaryRange; label: string }[] = [
  { value: 'week', label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'all', label: 'Tüm Zamanlar' },
];

type RangeSelectorProps = {
  value: SummaryRange;
  onChange: (next: SummaryRange) => void;
};

// Pill segmented control. Renders OUTSIDE any ScrollView so it is natively
// sticky on Android without stickyHeaderIndices gymnastics. Compact height
// (~36-40px) — visual separation from the rest of the screen is provided by
// a thin bottom border, not bulk padding. Uses --surface-muted (cool gray)
// to distinguish from --muted (warm cream used elsewhere).
export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <Box
      className="bg-card px-6 pt-2"
      style={{ marginBottom: 24 }}
    >
      <HStack
        space="xs"
        className="rounded-full border border-border bg-surface-muted p-0.5"
      >
        {SEGMENTS.map((seg) => {
          const active = value === seg.value;
          return (
            <Pressable
              key={seg.value}
              onPress={() => onChange(seg.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`flex-1 items-center justify-center rounded-full px-3 py-1.5 ${
                active ? 'bg-primary' : ''
              }`}
            >
              <Text
                size="xs"
                bold={active}
                className={
                  active
                    ? 'text-primary-foreground'
                    : 'text-surface-muted-foreground'
                }
              >
                {seg.label}
              </Text>
            </Pressable>
          );
        })}
      </HStack>
    </Box>
  );
}