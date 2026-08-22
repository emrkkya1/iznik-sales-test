import { Box } from '@/components/ui/box';
import { EmptyState } from '@/components/ui/empty-state';

export default function HistoryRoute() {
  return (
    <Box className="flex-1">
      <EmptyState
        title="Geçmiş Kayıtlar"
        subtitle="Bugüne ait teslimat geçmişiniz burada listelenecek."
      />
    </Box>
  );
}
