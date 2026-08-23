import type { ComponentProps } from 'react';

import { Button } from './button';
import { useConnectivityStore } from '@/store/connectivity';

type MutationButtonProps = ComponentProps<typeof Button>;

export function MutationButton({
  disabled,
  ...props
}: MutationButtonProps) {
  const isOnline = useConnectivityStore((s) => s.isOnline);

  return <Button {...props} disabled={disabled || !isOnline} />;
}
