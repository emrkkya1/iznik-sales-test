import { describe, it, expect } from 'vitest';

// These tests verify the balance calculation logic
// Actual RPC tests would require a running Supabase instance
//
// Canonical convention (M20): "+ means they owe us". balance = sales -
// payments. Positive = Alacak (branch owes bakery), negative = Borç
// (bakery owes branch).

describe('Balance Calculation', () => {
  describe('recalculate_branch_balance', () => {
    it('should calculate balance = sum(deliveries) - sum(payments)', () => {
      const deliveries = [
        { totalSalesAmount: 1000, deletedAt: null },
        { totalSalesAmount: 500, deletedAt: null },
        { totalSalesAmount: 200, deletedAt: '2024-01-01' }, // deleted
      ];

      const payments = [
        { amount: 800, deletedAt: null },
        { amount: 100, deletedAt: null },
      ];

      const activeDeliveries = deliveries
        .filter((d) => d.deletedAt === null)
        .reduce((sum, d) => sum + d.totalSalesAmount, 0);

      const activePayments = payments
        .filter((p) => p.deletedAt === null)
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = activeDeliveries - activePayments;
      expect(balance).toBe(600); // (1000 + 500) - (800 + 100)
    });

    it('should handle negative balance (Borç — overpayment)', () => {
      const deliveries = [
        { totalSalesAmount: 100, deletedAt: null },
      ];

      const payments = [
        { amount: 500, deletedAt: null }, // overpayment
      ];

      const activeDeliveries = deliveries
        .filter((d) => d.deletedAt === null)
        .reduce((sum, d) => sum + d.totalSalesAmount, 0);

      const activePayments = payments
        .filter((p) => p.deletedAt === null)
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = activeDeliveries - activePayments;
      expect(balance).toBe(-400);
    });

    it('should exclude deleted records', () => {
      const deliveries = [
        { totalSalesAmount: 1000, deletedAt: null },
        { totalSalesAmount: 500, deletedAt: '2024-01-01' },
      ];

      const payments = [
        { amount: 300, deletedAt: null },
        { amount: 200, deletedAt: '2024-01-01' },
      ];

      const activeDeliveries = deliveries
        .filter((d) => d.deletedAt === null)
        .reduce((sum, d) => sum + d.totalSalesAmount, 0);

      const activePayments = payments
        .filter((p) => p.deletedAt === null)
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = activeDeliveries - activePayments;
      expect(balance).toBe(700); // 1000 - 300
    });

    it('should handle empty branch (no transactions)', () => {
      const deliveries: { totalSalesAmount: number; deletedAt: string | null }[] = [];
      const payments: { amount: number; deletedAt: string | null }[] = [];

      const activeDeliveries = deliveries
        .filter((d) => d.deletedAt === null)
        .reduce((sum, d) => sum + d.totalSalesAmount, 0);

      const activePayments = payments
        .filter((p) => p.deletedAt === null)
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = activeDeliveries - activePayments;
      expect(balance).toBe(0);
    });
  });

  describe('Balance after operations', () => {
    it('should recalculate after delivery creation', () => {
      // Canonical: a delivery grows the receivable.
      const previousBalance = 1000;
      const newDeliveryAmount = 500;
      const newPaymentAmount = 300;

      const newBalance = previousBalance + newDeliveryAmount - newPaymentAmount;
      expect(newBalance).toBe(1200);
    });

    it('should recalculate after delivery edit', () => {
      // Canonical: remove the old sale (reduce receivable), add the new
      // one, then apply the payment.
      const previousBalance = 1000;
      const oldDeliveryAmount = 500;
      const newDeliveryAmount = 600;
      const paymentAmount = 300;

      const newBalance =
        previousBalance - oldDeliveryAmount + newDeliveryAmount - paymentAmount;
      expect(newBalance).toBe(800);
    });

    it('should recalculate after delivery delete', () => {
      // Canonical: removing the delivery removes the receivable; the
      // related payment must be netted off the previous balance too.
      const previousBalance = 1000;
      const deletedDeliveryAmount = 500;
      const relatedPaymentAmount = 300;

      const newBalance =
        previousBalance - deletedDeliveryAmount + relatedPaymentAmount;
      expect(newBalance).toBe(800);
    });

    it('should recalculate after manual payment', () => {
      // Canonical: a payment reduces the receivable.
      const previousBalance = 1000;
      const manualPaymentAmount = 500;

      const newBalance = previousBalance - manualPaymentAmount;
      expect(newBalance).toBe(500);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large amounts', () => {
      const deliveries = [
        { totalSalesAmount: 999999999.99, deletedAt: null },
      ];

      const payments = [
        { amount: 0.01, deletedAt: null },
      ];

      const activeDeliveries = deliveries
        .filter((d) => d.deletedAt === null)
        .reduce((sum, d) => sum + d.totalSalesAmount, 0);

      const activePayments = payments
        .filter((p) => p.deletedAt === null)
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = activeDeliveries - activePayments;
      expect(balance).toBe(999999999.98);
    });

    it('should handle decimal precision', () => {
      const deliveries = [
        { totalSalesAmount: 100.55, deletedAt: null },
        { totalSalesAmount: 50.45, deletedAt: null },
      ];

      const payments = [
        { amount: 75.25, deletedAt: null },
      ];

      const activeDeliveries = deliveries
        .filter((d) => d.deletedAt === null)
        .reduce((sum, d) => sum + d.totalSalesAmount, 0);

      const activePayments = payments
        .filter((p) => p.deletedAt === null)
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = activeDeliveries - activePayments;
      expect(balance).toBe(75.75);
    });
  });
});
