import { getIstanbulToday, parseIsoDate } from './dates';

// Returns the number of whole calendar days between two YYYY-MM-DD strings
// (a - b). Both inputs are normalized to noon local time via parseIsoDate, so
// DST shifts do not produce off-by-one results.
function daysBetween(a: string, b: string): number {
  const ms = parseIsoDate(a).getTime() - parseIsoDate(b).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

// Date-only relative formatter for Branch Hub "Son İşlem" card.
// `null` → "—" per locked decision (M1 from PR-6.0 review).
export function formatRelativeDate(value: string | null, today?: string): string {
  if (value === null) return '—';

  const refToday = today ?? getIstanbulToday();
  const days = daysBetween(refToday, value);

  if (days < 0) return '—';
  if (days === 0) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 14) return 'geçen hafta';
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}