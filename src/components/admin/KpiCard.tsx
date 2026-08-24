import type { ElementType } from 'react';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { QueryError } from '@/components/ui/query-error';
import { formatCount } from '@/utils/formatCount';
import { formatCurrency } from '@/utils/formatters';

type KpiCardProps = {
  icon: ElementType;
  title: string;
  value: number | null;
  format: 'currency' | 'count';
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
};

// Icon + title + large value. Designed to sit 4-up in a landscape HStack via
// `flex-1` parent. Loading keeps layout stable (skeleton block) instead of
// showing a centered Spinner — prevents the cards from shifting height when
// 4 of them refresh independently.
export function KpiCard({
  icon: IconCmp,
  title,
  value,
  format,
  isLoading = false,
  isError = false,
  onRetry,
  className,
}: KpiCardProps) {
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
          ) : isLoading || value === null ? (
            <Box className="h-9 w-24 rounded bg-muted" />
          ) : (
            <Text size="2xl" bold className="text-foreground">
              {format === 'currency' ? formatCurrency(value) : formatCount(value)}
            </Text>
          )}
        </VStack>
      </HStack>
    </Box>
  );
}