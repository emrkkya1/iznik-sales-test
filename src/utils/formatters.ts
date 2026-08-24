const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('tr-TR').format(new Date(value));
}

// Returns a Turkish label clarifying the meaning of a balance from the
// COMPANY's perspective (we earn money vs we lose money):
//   value > 0  → "Kazanç"  — branch has positive balance; we earn money
//   value < 0  → "Zarar"   — branch has negative balance; we lose money
//   value == 0 → "Bakiye"  — neutral; no net amount either way
export function getBalanceTone(value: number): 'Kazanç' | 'Zarar' | 'Bakiye' {
  if (value > 0) return 'Kazanç';
  if (value < 0) return 'Zarar';
  return 'Bakiye';
}
