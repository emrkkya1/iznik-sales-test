import { tva } from '@gluestack-ui/utils/nativewind-utils';

export const badgeStyle = tva({
  base: 'self-start rounded-md px-2 py-0.5',
  variants: {
    variant: {
      success: 'bg-primary/10',
      muted: 'bg-muted',
      destructive: 'bg-destructive/10',
      info: 'bg-info/10',
    },
  },
});

export const badgeTextStyle = tva({
  base: 'text-xs font-heavy',
  variants: {
    variant: {
      success: 'text-primary',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
      info: 'text-info',
    },
  },
});