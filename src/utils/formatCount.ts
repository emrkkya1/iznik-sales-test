const countFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 0,
});

export function formatCount(value: number): string {
  return countFormatter.format(value);
}