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

// Returns a Turkish label clarifying who owes whom for a given balance
// (cash-flow convention, "+ means we got money"):
//   value > 0  → "Borç"    — we have more cash in hand from this branch
//                          than products delivered; we owe the branch
//   value < 0  → "Alacak"  — products exceed cash received; the branch
//                          owes us; we will collect
//   value == 0 → "Bakiye"  — settled; no amount owed either way
//
// Use `getBranchBalanceDirection` when you need the full "Şubeden Alacak"
// / "Şubeye ödenecek" phrasing instead of the short label.
export function getBalanceTone(value: number): 'Borç' | 'Alacak' | 'Bakiye' {
  if (value > 0) return 'Borç';
  if (value < 0) return 'Alacak';
  return 'Bakiye';
}

// Returns a Turkish label describing the direction of a branch balance
// from the company's cash-flow perspective ("+ means we got money"):
//   value > 0  → "Şubeye ödenecek"   — we have more cash from this branch
//                                     than products delivered; we owe them
//   value < 0  → "Şubeden Alacak"    — products exceed cash received; the
//                                     branch owes us; we will collect
//   value == 0 → "Şubeden alınacak"  — settled; nothing owed either way
//
// `sentenceInitial` controls the first-letter casing. The Ş label sits at
// the start of the second sentence (capitalized). The ş label is mid-
// sentence after "iken" (lowercase). Pass `false` to lowercase the first
// Turkish letter (Ş → ş, Ö → ö, etc.).
export function getBranchBalanceDirection(
  value: number,
  sentenceInitial: boolean = true,
): string {
  let base: string;
  if (value > 0) base = 'Şubeye ödenecek';
  else if (value < 0) base = 'Şubeden Alacak';
  else base = 'Şubeden alınacak';

  if (sentenceInitial) return base;
  return base.charAt(0).toLocaleLowerCase('tr-TR') + base.slice(1);
}
