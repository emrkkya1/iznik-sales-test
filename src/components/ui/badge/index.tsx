import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { badgeStyle, badgeTextStyle } from './styles';

type BadgeVariant = 'success' | 'muted' | 'destructive' | 'info' | 'inactive';

type BadgeProps = {
  variant?: BadgeVariant;
  text: string;
  className?: string;
} & VariantProps<typeof badgeStyle>;

export function Badge({ variant = 'muted', text, className }: BadgeProps) {
  return (
    <Box className={badgeStyle({ variant, class: className })}>
      <Text className={badgeTextStyle({ variant })}>{text}</Text>
    </Box>
  );
}