import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import {
  formatBalanceAmount,
  getBalanceColorClass,
  getBalanceLabel,
} from '@/utils/formatters';

type BalanceAmountSize = 'sm' | 'md' | 'lg' | 'xl';

type BalanceAmountProps = {
  value: number;
  size?: BalanceAmountSize;
  bold?: boolean;
  // Alt satırda yön etiketi göster. Sıfır bakiyede etiket gösterilmez.
  showLabel?: boolean;
  className?: string;
};

// Ortak bakiye bileşeni. Mutlak tutar + anlam rengi + opsiyonel yön
// etiketini tek yerde toplar. UI'da hiçbir yerde eksi işareti göstermez:
// yön, etiket ve renkle anlatılır.
export function BalanceAmount({
  value,
  size = 'md',
  bold = false,
  showLabel = false,
  className,
}: BalanceAmountProps) {
  const label = getBalanceLabel(value);
  const colorClass = getBalanceColorClass(value);

  return (
    <HStack space="xs" className={`items-baseline ${className ?? ''}`}>
      <Text size={size} bold={bold} className={colorClass}>
        {formatBalanceAmount(value)}
      </Text>
      {showLabel && label ? (
        <Text size="xs" className="text-muted-foreground">
          {label}
        </Text>
      ) : null}
    </HStack>
  );
}
