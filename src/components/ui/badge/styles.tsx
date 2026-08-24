import { tva } from '@gluestack-ui/utils/nativewind-utils';

export const badgeStyle = tva({
  base: 'rounded-md px-2 py-0.5',
  variants: {
    variant: {
      success: 'bg-primary/10',
      muted: 'bg-muted',
      destructive: 'bg-destructive/10',
      info: 'bg-info/10',
      // Cool gray (vs the warm cream of `muted`) so it reads as visibly
      // distinct from `success` (warm brown) when used in tandem like
      // Aktif (success) vs Pasif (inactive).
      inactive: 'bg-surface-muted',
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
      inactive: 'text-surface-muted-foreground',
    },
  },
});