import type { ReactNode } from 'react';

import { Amount } from '@/components/ui/amount';
import { BalanceAmount } from '@/components/ui/balance-amount';
import { Box } from '@/components/ui/box';
import { Divider } from '@/components/ui/divider';
import { HStack } from '@/components/ui/hstack';
import { Icon, AlertCircleIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatCurrency, getBranchBalanceDirection } from '@/utils/formatters';
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

// "Tutar" (products cost) is a receivable from the branch. Positive =
// branch owes us this much (Alacak). Negative = net returns, we owe back
// (Borç). This is the same convention as the persisted balance.
function requiredToneLabel(value: number): 'Alacak' | 'Borç' | null {
  if (value > 0) return 'Alacak';
  if (value < 0) return 'Borç';
  return null;
}

export function CheckoutSummary({
  branchName,
  preview,
  paymentAmount,
  loadingBalance = false,
}: CheckoutSummaryProps) {
  const requiredLabel = requiredToneLabel(preview.requiredAmount);
  const previousDirection = getBranchBalanceDirection(
    preview.previousBalance,
    true,
  );
  const resultingDirection = getBranchBalanceDirection(
    preview.resultingBalance,
    false,
  );

  return (
    <VStack space="sm">
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
              {preview.lines.map((line) => {
                const hasReturn = line.returnedQuantity > 0;
                const netIsNegative = line.netQuantity < 0;
                const lineTone = netIsNegative ? 'destructive' : 'default';
                return (
                  <VStack key={line.productId} space="xs" className="py-1">
                    <HStack className="items-center justify-between">
                      <Text size="sm" className="text-foreground">
                        {line.productName}
                      </Text>
                      <Amount size="sm" value={line.lineTotal} tone={lineTone} />
                    </HStack>
                    <Text size="xs" className="text-muted-foreground">
                      {hasReturn
                        ? `Verilen: ${line.deliveredQuantity} · İade: ${line.returnedQuantity} · Net: ${line.netQuantity}`
                        : `${line.deliveredQuantity} adet × ${formatCurrency(line.unitPrice)}`}
                    </Text>
                  </VStack>
                );
              })}
            </VStack>
          )}

          <Divider />

          <Row label="Tutar">
            <HStack space="sm" className="items-center">
              <Amount size="md" bold value={preview.requiredAmount} />
              {requiredLabel ? (
                <Text size="xs" className="text-muted-foreground">
                  {requiredLabel}
                </Text>
              ) : null}
            </HStack>
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
          <Row label="Önceki Şube Bakiyesi">
            {loadingBalance ? (
              <Text size="md" className="text-muted-foreground">
                …
              </Text>
            ) : (
              <BalanceAmount
                value={preview.previousBalance}
                size="md"
                showLabel
              />
            )}
          </Row>

          <Divider />

          <Row label="Yeni Şube Bakiyesi">
            <BalanceAmount
              value={preview.resultingBalance}
              size="lg"
              bold
              showLabel
            />
          </Row>
        </VStack>
      </Box>

      <Text size="xs" className="px-1 text-muted-foreground">
        <Text size="xs" bold className="text-foreground">
          {formatCurrency(preview.requiredAmount)}
        </Text>{' '}
        tutarında ürün verildi,{' '}
        <Text size="xs" bold className="text-foreground">
          {formatCurrency(paymentAmount)}
        </Text>{' '}
        tahsilat yapıldı.{' '}
        {previousDirection}{' '}
        <Text size="xs" bold className="text-foreground">
          {formatCurrency(Math.abs(preview.previousBalance))}
        </Text>{' '}
        iken {resultingDirection}{' '}
        <Text size="xs" bold className="text-foreground">
          {formatCurrency(Math.abs(preview.resultingBalance))}
        </Text>{' '}
        oldu.
      </Text>
    </VStack>
  );
}
