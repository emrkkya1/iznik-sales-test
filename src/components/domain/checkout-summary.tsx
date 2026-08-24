import type { ReactNode } from 'react';

import { Amount } from '@/components/ui/amount';
import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { HStack } from '@/components/ui/hstack';
import { Icon, AlertCircleIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatCurrency, getBalanceTone } from '@/utils/formatters';
import type { ReceiptPreview } from '@/utils/receiptPreview';

type CheckoutSummaryProps = {
  branchName: string;
  preview: ReceiptPreview;
  paymentAmount: number;
  loadingBalance?: boolean;
};

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <HStack className="items-center justify-between py-1">
      <Text size="sm" className="text-muted-foreground">
        {label}
      </Text>
      {children}
    </HStack>
  );
}

function resultingBalanceTone(value: number): 'info' | 'destructive' | 'default' {
  // Positive balance (we will receive from the branch) → info/blue.
  // Negative balance (we owe the branch) → destructive/red.
  if (value > 0) return 'info';
  if (value < 0) return 'destructive';
  return 'default';
}

export function CheckoutSummary({
  branchName,
  preview,
  paymentAmount,
  loadingBalance = false,
}: CheckoutSummaryProps) {
  const balanceLabel = getBalanceTone(preview.resultingBalance);
  const balanceTone = resultingBalanceTone(preview.resultingBalance);

  return (
    <Box className="rounded-xl border border-border bg-card p-4">
      <VStack space="sm">
        <Text size="sm" bold className="text-foreground">
          {branchName}
        </Text>

        {preview.lines.length === 0 ? (
          <Text size="sm" className="text-muted-foreground">
            Henüz ürün eklenmedi.
          </Text>
        ) : (
          <VStack space="sm">
            {preview.lines.map((line) => (
              <VStack key={line.productId} space="xs" className="py-1">
                <HStack className="items-center justify-between">
                  <Text size="sm" className="text-foreground">
                    {line.productName}
                  </Text>
                  <Amount size="sm" value={line.lineTotal} />
                </HStack>
                <Text size="xs" className="text-muted-foreground">
                  {line.deliveredQuantity} adet × {formatCurrency(line.unitPrice)}
                </Text>
              </VStack>
            ))}
          </VStack>
        )}

        <Divider />

        <Row label="Tutar">
          <Amount size="md" bold value={preview.requiredAmount} />
        </Row>
        <Row label="Tahsilat">
          <HStack space="sm" className="items-center">
            {paymentAmount <= 0 ? (
              <HStack space="xs" className="items-center">
                <Icon
                  as={AlertCircleIcon}
                  size="sm"
                  className="text-muted-foreground"
                />
                <Text size="xs" className="text-muted-foreground">
                  Tahsilat girilmedi
                </Text>
              </HStack>
            ) : null}
            <Amount size="md" value={paymentAmount} tone="muted" />
          </HStack>
        </Row>
        <Row label="Önceki Bakiye">
          {loadingBalance ? (
            <Text size="md" className="text-muted-foreground">
              …
            </Text>
          ) : (
            <Amount
              size="md"
              value={preview.previousBalance}
              tone="muted"
              showSign
            />
          )}
        </Row>

        <Divider />

        <Row label="Yeni Bakiye">
          <HStack space="sm" className="items-center">
            <Amount
              size="lg"
              bold
              value={preview.resultingBalance}
              showSign
              tone={balanceTone}
            />
            {balanceLabel !== 'Bakiye' ? (
              <Text size="xs" className="text-muted-foreground">
                {balanceLabel}
              </Text>
            ) : null}
          </HStack>
        </Row>
      </VStack>
    </Box>
  );
}