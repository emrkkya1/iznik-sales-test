import { BalanceAmount } from '@/components/ui/balance-amount';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatCount } from '@/utils/formatCount';
import { formatCurrency } from '@/utils/formatters';

type SummaryCardProps = {
  title: string;
  value: string | number | null;
  format?: 'currency' | 'count' | 'text' | 'percent' | 'quantity-delta';
  // Used by Güncel Bakiye card: positive balance (Alacak) paints info/blue,
  // negative balance (Borç) paints destructive/red. Ignored for non-
  // currency values.
  colorCoded?: boolean;
  /** Optional small line under the main value (e.g. "142 alınan"). */
  secondaryValue?: string;
  /** Tone for the secondary line. Defaults to muted. */
  secondaryTone?: 'muted' | 'destructive' | 'info' | 'foreground';
  /** When true, render "Veri yok" instead of the value (for percent when null). */
  emptyLabel?: string;
  subtitle?: string;
  isLoading?: boolean;
  className?: string;
  // When true AND the value is a number AND format is currency, renders the
  // Alacak/Borç label next to the amount via BalanceAmount. Zero balance
  // shows no label.
  showBalanceLabel?: boolean;
};

function renderValue(value: string | number | null, format: SummaryCardProps['format']): string {
  if (value === null) return '';
  if (format === 'currency') return formatCurrency(Number(value));
  if (format === 'count') return formatCount(Number(value));
  if (format === 'percent') {
    const n = Number(value);
    return `%${n.toFixed(1).replace(/\.0$/, '')}`;
  }
  if (format === 'quantity-delta') return formatCount(Number(value));
  return String(value);
}

// Branch Hub summary card. Sits 4-up in a landscape HStack via `flex-1`.
export function SummaryCard({
  title,
  value,
  format = 'text',
  colorCoded,
  secondaryValue,
  secondaryTone = 'muted',
  emptyLabel,
  subtitle,
  isLoading = false,
  showBalanceLabel = false,
  className,
}: SummaryCardProps) {
  const isCurrencyNumber =
    format === 'currency' && typeof value === 'number';

  const secondaryClass =
    secondaryTone === 'destructive'
      ? 'text-destructive'
      : secondaryTone === 'info'
        ? 'text-info'
        : secondaryTone === 'foreground'
          ? 'text-foreground'
          : 'text-muted-foreground';

  const showEmpty =
    !isLoading && value === null && (format === 'percent' || emptyLabel);
  const showSkeleton = isLoading || (!showEmpty && value === null);

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
        {showSkeleton ? (
          <Box className="h-7 w-24 rounded bg-muted" />
        ) : showEmpty ? (
          <Text size="xl" bold className="text-muted-foreground">
            {emptyLabel ?? 'Veri yok'}
          </Text>
        ) : isCurrencyNumber && colorCoded ? (
          <BalanceAmount
            value={value as number}
            size="xl"
            bold
            showLabel={showBalanceLabel}
          />
        ) : (
          <HStack space="xs" className="items-baseline">
            <Text size="xl" bold className="text-foreground">
              {renderValue(value, format)}
            </Text>
          </HStack>
        )}
        {secondaryValue ? (
          <Text size="xs" className={secondaryClass}>
            {secondaryValue}
          </Text>
        ) : null}
        {subtitle ? (
          <Text size="xs" className="text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </VStack>
    </Box>
  );
}
