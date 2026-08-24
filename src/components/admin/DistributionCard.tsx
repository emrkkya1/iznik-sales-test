import { useMemo } from 'react';
import { PieChart } from 'react-native-gifted-charts';

import { Box } from '@/components/ui/box';
import { EmptyState } from '@/components/ui/empty-state';
import { HStack } from '@/components/ui/hstack';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { DistributionRow } from '@/types';
import { mergeTopDistribution } from '@/utils/distribution';
import { formatCurrency } from '@/utils/formatters';

type DistributionCardProps = {
  title: string;
  rows: readonly DistributionRow[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
};

// 8 palette slots: 7 distinct categorical hues + 1 grey for merged "Diğer".
// Brown is intentionally excluded to keep slice distinction maximal on the
// cream background. Grey is reserved for the synthetic merged slice so the
// legend visually groups it as "less important".
const PIE_COLORS = [
  '#004C6E', // navy
  '#C43428', // red
  '#2E7D32', // green
  '#F57C00', // orange
  '#6A1B9A', // purple
  '#00838F', // teal
  '#D81B60', // pink/magenta
  '#9CA3AF', // neutral grey (Diğer only)
];

export function DistributionCard({
  title,
  rows,
  isLoading = false,
  isError = false,
  onRetry,
  className,
}: DistributionCardProps) {
  const { merged, total } = useMemo(() => {
    const { merged } = mergeTopDistribution(rows, 7);
    const total = merged.reduce((sum, r) => sum + r.value, 0);
    return { merged, total };
  }, [rows]);

  const data = useMemo(
    () =>
      merged.map((row, i) => ({
        value: row.value,
        color: PIE_COLORS[i % PIE_COLORS.length],
        gradientCenterColor: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [merged],
  );

  return (
    <Box
      className={`flex-1 rounded-2xl border border-border bg-card p-4 ${
        className ?? ''
      }`}
    >
      <Text size="md" bold className="mb-3 text-foreground">
        {title}
      </Text>

      {isError ? (
        <QueryError onRetry={onRetry} />
      ) : isLoading ? (
        <Spinner label="Yükleniyor…" />
      ) : total === 0 ? (
        <EmptyState title="Bu aralıkta veri yok" />
      ) : (
        <VStack space="md">
          <Box className="items-center">
            <PieChart
              data={data}
              donut
              radius={72}
              innerRadius={42}
              isAnimated
              animationDuration={400}
            />
          </Box>

          <VStack space="xs">
            {merged.map((row, i) => {
              const pct = total > 0 ? (row.value / total) * 100 : 0;
              const color = PIE_COLORS[i % PIE_COLORS.length];
              return (
                <HStack
                  key={row.id}
                  space="sm"
                  className="items-center justify-between"
                >
                  <HStack space="sm" className="flex-1 items-center">
                    <Box
                      style={{ backgroundColor: color }}
                      className="h-3 w-3 rounded-full"
                    />
                    <Text
                      size="xs"
                      numberOfLines={1}
                      className={
                        row.isMerged
                          ? 'text-muted-foreground'
                          : 'text-foreground'
                      }
                    >
                      {row.label}
                    </Text>
                  </HStack>
                  <HStack space="sm" className="items-center">
                    <Text
                      size="xs"
                      className={
                        row.isMerged
                          ? 'text-muted-foreground'
                          : 'text-foreground'
                      }
                    >
                      {formatCurrency(row.value)}
                    </Text>
                    <Text size="xs" className="text-muted-foreground">
                      {pct.toFixed(0)}%
                    </Text>
                  </HStack>
                </HStack>
              );
            })}
          </VStack>
        </VStack>
      )}
    </Box>
  );
}