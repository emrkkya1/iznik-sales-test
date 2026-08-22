import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from '../formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('formats positive amounts in Turkish Lira', () => {
      expect(formatCurrency(1234.56)).toBe('₺1.234,56');
    });

    it('formats zero', () => {
      expect(formatCurrency(0)).toBe('₺0,00');
    });

    it('formats negative amounts', () => {
      expect(formatCurrency(-500)).toBe('-₺500,00');
    });
  });

  describe('formatDate', () => {
    it('formats date in Turkish locale', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/03/);
      expect(formatted).toMatch(/2024/);
    });

    it('accepts string date input', () => {
      const formatted = formatDate('2024-01-01');
      expect(formatted).toMatch(/01/);
      expect(formatted).toMatch(/2024/);
    });
  });
});
