import type { ElementType } from 'react';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { QueryError } from '@/components/ui/query-error';
import { formatCount } from '@/utils/formatCount';
import { formatCurrency } from '@/utils/formatters';

export type KpiFormat = 'currency' | 'count' | 'percent' | 'quantity-delta';

type KpiCardProps = {
  icon: ElementType;
  title: string;
  value: number | null;
  /**
   * How to render `value`:
   *  - `currency`        — ₺1.234
   *  - `count`           — 12.345
   *  - `percent`         — %12,3  (renders "Veri yok" when value is null)
   *  - `quantity-delta`  — big number (uses `secondaryValue` as smaller line)
   */
  format: KpiFormat;
  /** Optional small line under the main value (e.g. "142 alınan" for delivered/returned). */
  secondaryValue?: string;
  /** Tone for the secondary line. Defaults to muted. */
  secondaryTone?: 'muted' | 'destructive' | 'info' | 'foreground';
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
};

function renderValue(format: KpiFormat, value: number): string {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'count') return formatCount(value);
  if (format === 'percent') return `%${value.toFixed(1).replace(/\.0$/, '')}`;
  return formatCount(value);
}

// Icon + title + large value. Designed to sit 4-up in a landscape HStack via
// `flex-1` parent. Loading keeps layout stable (skeleton block) instead of
// showing a centered Spinner — prevents the cards from shifting height when
// 4 of them refresh independently.
export function KpiCard({
  icon: IconCmp,
  title,
  value,
  format,
  secondaryValue,
  secondaryTone = 'muted',
  isLoading = false,
  isError = false,
  onRetry,
  className,
}: KpiCardProps) {
  const showEmpty =
    !isLoading && !isError && value === null && format === 'percent';
  const showSkeleton = isLoading || (!isError && value === null && !showEmpty);

  const secondaryClass =
    secondaryTone === 'destructive'
      ? 'text-destructive'
      : secondaryTone === 'info'
        ? 'text-info'
        : secondaryTone === 'foreground'
          ? 'text-foreground'
          : 'text-muted-foreground';

  return (
    <Box
      className={`flex-1 rounded-2xl border border-border bg-card p-4 ${
        className ?? ''
      }`}
    >
      <HStack space="md" className="items-center">
        <Box className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon as={IconCmp} size="md" className="text-primary" />
        </Box>
        <VStack space="xs" className="flex-1">
          <Text size="sm" className="text-muted-foreground">
            {title}
          </Text>
          {isError ? (
            <QueryError onRetry={onRetry} />
          ) : showSkeleton ? (
            <Box className="h-9 w-24 rounded bg-muted" />
          ) : showEmpty ? (
            <Text size="lg" bold className="text-muted-foreground">
              Veri yok
            </Text>
          ) : (
            <Text size="2xl" bold className="text-foreground">
              {format === 'quantity-delta'
                ? formatCount(value as number)
                : renderValue(format, value as number)}
            </Text>
          )}
          {secondaryValue ? (
            <Text size="xs" className={secondaryClass}>
              {secondaryValue}
            </Text>
          ) : null}
        </VStack>
      </HStack>
    </Box>
  );
}