import type { ComponentProps } from 'react';

import { Text } from './text';
import { formatCurrency } from '@/utils/formatters';

type AmountTone = 'default' | 'muted' | 'destructive' | 'info';

type AmountProps = {
  value: number;
  size?: ComponentProps<typeof Text>['size'];
  bold?: boolean;
  tone?: AmountTone;
  showSign?: boolean;
  className?: string;
};

const toneClassName: Record<AmountTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  destructive: 'text-destructive',
  info: 'text-info',
};

export function Amount({
  value,
  size = 'md',
  bold = false,
  tone = 'default',
  showSign = false,
  className,
}: AmountProps) {
  const sign = showSign && value > 0 ? '+' : '';

  return (
    <Text
      size={size}
      bold={bold}
      className={`${toneClassName[tone]} ${className ?? ''}`}
    >
      {sign}
      {formatCurrency(value)}
    </Text>
  );
}
