import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatCount } from '@/utils/formatCount';
import { formatCurrency } from '@/utils/formatters';

type SummaryCardProps = {
  title: string;
  value: string | number | null;
  format?: 'currency' | 'count' | 'text';
  // Used by Güncel Bakiye card: positive balance paints destructive (we are
  // owed), negative balance paints primary (credit). Ignored for non-currency
  // values.
  colorCoded?: boolean;
  subtitle?: string;
  isLoading?: boolean;
  className?: string;
};

function renderValue(value: string | number | null, format: SummaryCardProps['format']): string {
  if (value === null) return '';
  if (format === 'currency') return formatCurrency(Number(value));
  if (format === 'count') return formatCount(Number(value));
  return String(value);
}

function colorClassFor(value: number, colorCoded: boolean | undefined): string | undefined {
  if (!colorCoded) return undefined;
  if (value > 0) return 'text-destructive';
  if (value < 0) return 'text-primary';
  return 'text-foreground';
}

// Branch Hub summary card. Sits 4-up in a landscape HStack via `flex-1`.
export function SummaryCard({
  title,
  value,
  format = 'text',
  colorCoded,
  subtitle,
  isLoading = false,
  className,
}: SummaryCardProps) {
  const numericValue = typeof value === 'number' ? value : 0;
  const valueClass =
    format === 'currency' && colorCoded
      ? colorClassFor(numericValue, colorCoded)
      : 'text-foreground';

  return (
    <Box
      className={`flex-1 rounded-2xl border border-border bg-card p-4 ${
        className ?? ''
      }`}
    >
      <VStack space="xs">
        <Text size="sm" className="text-muted-foreground">
          {title}
        </Text>
        {isLoading || value === null ? (
          <Box className="h-7 w-24 rounded bg-muted" />
        ) : (
          <Text size="xl" bold className={valueClass}>
            {renderValue(value, format)}
          </Text>
        )}
        {subtitle ? (
          <Text size="xs" className="text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </VStack>
    </Box>
  );
}