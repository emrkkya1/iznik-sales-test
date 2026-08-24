import type { BranchProductWithPrice } from '@/types';

export type PreviewLine = {
  productId: string;
  productName: string;
  deliveredQuantity: number;
  returnedQuantity: number;
  netQuantity: number;
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

export type PreviewEntries = Record<string, { delivered: number; returned: number }>;

function normalize(
  entries: PreviewEntries | Record<string, number> | undefined,
): Record<string, { delivered: number; returned: number }> {
  if (!entries) return {};
  const result: Record<string, { delivered: number; returned: number }> = {};
  for (const [productId, value] of Object.entries(entries)) {
    if (typeof value === 'number') {
      if (value > 0) result[productId] = { delivered: value, returned: 0 };
    } else if (value && (value.delivered > 0 || value.returned > 0)) {
      result[productId] = {
        delivered: Math.max(0, value.delivered ?? 0),
        returned: Math.max(0, value.returned ?? 0),
      };
    }
  }
  return result;
}

export function computeReceiptPreview(
  products: BranchProductWithPrice[],
  entries: PreviewEntries | Record<string, number> | undefined,
  paymentAmount: number,
  // Cash-flow convention ("+ means we got money"). Pass the branch's
  // cash-in-hand balance from `useBranchBalance` as-is.
  previousBalance = 0,
): ReceiptPreview {
  const normalized = normalize(entries);
  const lines: PreviewLine[] = [];
  let requiredAmount = 0;

  for (const product of products) {
    const entry = normalized[product.productId];
    if (!entry) continue;

    const delivered = entry.delivered;
    const returned = entry.returned;
    const net = delivered - returned;
    if (net === 0 && delivered === 0 && returned === 0) continue;

    const lineTotal = round2(net * product.currentPrice);
    requiredAmount += lineTotal;
    lines.push({
      productId: product.productId,
      productName: product.productName,
      deliveredQuantity: delivered,
      returnedQuantity: returned,
      netQuantity: net,
      unitPrice: product.currentPrice,
      lineTotal,
    });
  }

  requiredAmount = round2(requiredAmount);

  return {
    lines,
    requiredAmount,
    previousBalance,
    // Cash-flow convention: "+ means we got money". A delivery reduces
    // cash in hand by the delivered amount; a payment increases it.
    resultingBalance: round2(
      previousBalance - requiredAmount + paymentAmount,
    ),
  };
}
