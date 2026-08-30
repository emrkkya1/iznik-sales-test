import type {
  Branch,
  Delivery,
  DeliveryItem,
  Payment,
  Product,
  ReceiptSummary,
} from '@/types';

interface BuildReceiptSummaryParams {
  delivery: Delivery;
  items: DeliveryItem[];
  products: Product[];
  payments: Payment[];
  branch: Branch;
}

// Builds a receipt summary from an existing delivery and its related rows.
//
// Canonical balance convention (M20, "+ means they owe us"). The DB stores
// the receivable directly, so:
//   newBalance      = branch.currentBalance
//                                       — receivable after this delivery
//   previousBalance = branch.currentBalance - sales + payment
//                                       — receivable before this delivery
// (delivery grows the receivable by `sales`, payment shrinks it).
export function buildReceiptSummary({
  delivery,
  items,
  products,
  payments,
  branch,
}: BuildReceiptSummaryParams): ReceiptSummary {
  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  const summaryItems = items.map((item) => ({
    productName: productNameById.get(item.productId) ?? '—',
    deliveredQuantity: item.deliveredQuantity,
    returnedQuantity: item.returnedQuantity,
    netQuantity: item.netQuantity,
    unitPrice: item.unitPrice,
    lineTotal: item.netQuantity * item.unitPrice,
  }));

  const paymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const previousBalance =
    (branch.currentBalance ?? 0) - delivery.totalSalesAmount + paymentAmount;

  return {
    deliveryId: delivery.id,
    branchId: branch.id,
    branchName: branch.name,
    date: delivery.date,
    items: summaryItems,
    totalSalesAmount: delivery.totalSalesAmount,
    paymentAmount,
    previousBalance,
    newBalance: branch.currentBalance ?? 0,
  };
}
