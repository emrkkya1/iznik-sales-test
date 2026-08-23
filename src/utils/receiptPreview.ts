import type { BranchProductWithPrice } from '@/types';

export type PreviewLine = {
  productId: string;
  productName: string;
  deliveredQuantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ReceiptPreview = {
  lines: PreviewLine[];
  requiredAmount: number;
  previousBalance: number;
  resultingBalance: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeReceiptPreview(
  products: BranchProductWithPrice[],
  quantities: Record<string, number>,
  paymentAmount: number,
  previousBalance = 0,
): ReceiptPreview {
  const lines: PreviewLine[] = [];
  let requiredAmount = 0;

  for (const product of products) {
    const qty = quantities[product.productId] ?? 0;
    if (qty <= 0) continue;

    const lineTotal = round2(qty * product.currentPrice);
    requiredAmount += lineTotal;
    lines.push({
      productId: product.productId,
      productName: product.productName,
      deliveredQuantity: qty,
      unitPrice: product.currentPrice,
      lineTotal,
    });
  }

  requiredAmount = round2(requiredAmount);

  return {
    lines,
    requiredAmount,
    previousBalance,
    resultingBalance: round2(
      previousBalance + requiredAmount - paymentAmount,
    ),
  };
}
