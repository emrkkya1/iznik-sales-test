import { Badge } from '@/components/ui/badge';

type ActiveBadgeProps = {
  isActive: boolean;
};

export function ActiveBadge({ isActive }: ActiveBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'success' : 'inactive'}
      text={isActive ? 'Aktif' : 'Pasif'}
    />
  );
}