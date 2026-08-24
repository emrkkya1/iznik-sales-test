import type { ReactNode } from 'react';

import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useBranchHubSummary } from '@/hooks';
import { formatDateForDisplay } from '@/utils/dates';
import { formatCount } from '@/utils/formatCount';
import { formatCurrency, getBalanceTone } from '@/utils/formatters';
import { formatRelativeDate } from '@/utils/formatRelativeDate';

type DetailsTabProps = {
  branchId: string;
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box className="flex-row items-center justify-between border-b border-border py-3">
      <Text size="sm" className="text-muted-foreground">
        {label}
      </Text>
      <Text size="sm" bold className="text-foreground">
        {value}
      </Text>
    </Box>
  );
}

export function DetailsTab({ branchId }: DetailsTabProps) {
  const summary = useBranchHubSummary(branchId);

  if (summary.isLoading || !summary.data) {
    return <Spinner label="Yükleniyor…" />;
  }

  const d = summary.data;

  return (
    <Box className="m-6 rounded-2xl border border-border bg-card p-4">
      <VStack space="xs">
        <Row label="Şehir / İlçe" value={`${d.cityName} / ${d.districtName}`} />
        <Row
          label="Açılış Bakiyesi"
          // DB stores cash in hand at branch creation (cash-flow
          // convention: positive = cash in hand, negative = we owe the
          // branch from the start).
          value={`${formatCurrency(d.openingBalance)} · ${getBalanceTone(d.openingBalance)}`}
        />
        <Row
          label="Açılış Tarihi"
          value={formatDateForDisplay(d.branchCreatedAt)}
        />
        <Row
          label="Aktif Ürün"
          value={`${formatCount(d.activeProductCount)} / ${formatCount(d.totalProductCount)}`}
        />
        <Row label="Son İşlem" value={formatRelativeDate(d.lastMovementDate)} />
        <Row label="Denetim Kaydı Sayısı" value={formatCount(d.auditCount)} />
      </VStack>
    </Box>
  );
}