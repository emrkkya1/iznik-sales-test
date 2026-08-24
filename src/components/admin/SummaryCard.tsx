import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatCount } from '@/utils/formatCount';
import { formatCurrency, getBalanceTone } from '@/utils/formatters';

type SummaryCardProps = {
  title: string;
  value: string | number | null;
  format?: 'currency' | 'count' | 'text';
  // Used by Güncel Bakiye card: positive balance paints info (we are owed),
  // negative balance paints destructive (we owe). Ignored for non-currency
  // values.
  colorCoded?: boolean;
  subtitle?: string;
  isLoading?: boolean;
  className?: string;
  // When true AND the value is a number AND format is currency, renders a
  // subtle "Alacak" / "Borç" / "Bakiye" label next to the value so the
  // meaning of the number is unambiguous at a glance.
  showBalanceTone?: boolean;
};

function renderValue(value: string | number | null, format: SummaryCardProps['format']): string {
  if (value === null) return '';
  if (format === 'currency') return formatCurrency(Number(value));
  if (format === 'count') return formatCount(Number(value));
  return String(value);
}

function colorClassFor(value: number, colorCoded: boolean | undefined): string | undefined {
  if (!colorCoded) return undefined;
  // Positive balance = "Alacak" (the branch owes us) → info/blue.
  // Negative balance = "Borç" (we owe the branch) → destructive/red.
  if (value > 0) return 'text-info';
  if (value < 0) return 'text-destructive';
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
  showBalanceTone = false,
  className,
}: SummaryCardProps) {
  const numericValue = typeof value === 'number' ? value : 0;
  const isCurrencyNumber =
    format === 'currency' && typeof value === 'number';
  const valueClass =
    isCurrencyNumber && colorCoded
      ? colorClassFor(numericValue, colorCoded)
      : 'text-foreground';

  const toneLabel =
    showBalanceTone && isCurrencyNumber ? getBalanceTone(numericValue) : null;

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
          <HStack space="xs" className="items-baseline">
            <Text size="xl" bold className={valueClass}>
              {renderValue(value, format)}
            </Text>
            {toneLabel && toneLabel !== 'Bakiye' ? (
              <Text
                size="xs"
                className="text-muted-foreground"
              >
                {toneLabel}
              </Text>
            ) : null}
          </HStack>
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