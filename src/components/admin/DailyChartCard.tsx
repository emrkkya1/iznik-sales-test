import { useMemo } from 'react';
import { LineChart } from 'react-native-gifted-charts';

import { Box } from '@/components/ui/box';
import { EmptyState } from '@/components/ui/empty-state';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { DailySeriesResult } from '@/types';
import { parseIsoDate } from '@/utils/dates';
import { formatCurrency } from '@/utils/formatters';

type DailyChartCardProps = {
  series: DailySeriesResult | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
};

// Formats a YYYY-MM-DD bucket into a short axis label per granularity.
function formatBucketLabel(
  bucket: string,
  granularity: 'day' | 'week' | 'month',
): string {
  const d = parseIsoDate(bucket);
  if (granularity === 'day') {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
    }).format(d);
  }
  if (granularity === 'month') {
    return new Intl.DateTimeFormat('tr-TR', {
      month: 'short',
      year: '2-digit',
    }).format(d);
  }
  // week → ISO week number
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((tmp.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `H${week}`;
}

export function DailyChartCard({
  series,
  isLoading = false,
  isError = false,
  onRetry,
  className,
}: DailyChartCardProps) {
  const { points, total, lineData } = useMemo(() => {
    const pts = series?.points ?? [];
    const gran = series?.granularity ?? 'day';
    const tot = pts.reduce((sum, p) => sum + p.sales, 0);
    const data = pts.map((p) => ({
      value: p.sales,
      label: formatBucketLabel(p.bucket, gran),
      dataPointText: p.sales > 0 ? formatCurrency(p.sales) : undefined,
    }));
    return { points: pts, total: tot, lineData: data };
  }, [series]);

  return (
    <Box
      className={`rounded-2xl border border-border bg-card p-4 ${
        className ?? ''
      }`}
    >
      <VStack space="md">
        <Text size="md" bold className="text-foreground">
          Günlük Ciro
        </Text>

        {isError ? (
          <QueryError onRetry={onRetry} />
        ) : isLoading ? (
          <Spinner label="Yükleniyor…" />
        ) : points.length === 0 || total === 0 ? (
          <EmptyState title="Bu aralıkta veri yok" />
        ) : (
          <Box className="items-center">
            <LineChart
              data={lineData}
              thickness={2}
              color="#6A4715"
              hideRules
              yAxisLabelPrefix="₺"
              yAxisTextStyle={{ color: '#85653D', fontSize: 11 }}
              xAxisLabelTextStyle={{ color: '#85653D', fontSize: 11 }}
              xAxisColor="#E5DCCD"
              yAxisColor="#E5DCCD"
              noOfSections={4}
              spacing={Math.max(28, Math.min(80, 600 / lineData.length))}
              initialSpacing={12}
              isAnimated
              animationDuration={400}
            />
          </Box>
        )}
      </VStack>
    </Box>
  );
}