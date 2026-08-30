// Date helpers that use Europe/Istanbul timezone for business rules.

const ISTANBUL_TIME_ZONE = 'Europe/Istanbul';

interface IstanbulParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

// Extracts calendar components in Europe/Istanbul without relying on
// `toLocaleString` output parsing (unreliable under Hermes).
function getIstanbulParts(date: Date): IstanbulParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ISTANBUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string): number => {
    const value = parts.find((p) => p.type === type)?.value ?? '0';
    const parsed = Number(value);
    // hour12: false can still emit "24" for midnight in some runtimes.
    return type === 'hour' && parsed === 24 ? 0 : parsed;
  };

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

// Returns today's date in Europe/Istanbul as YYYY-MM-DD.
export function getIstanbulToday(): string {
  const { year, month, day } = getIstanbulParts(new Date());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export type DateRangePreset = '7d' | '30d' | 'month' | 'all';

// Date-only range arithmetic. UTC is used only as a calendar calculator, so
// the result does not depend on the device timezone.
export function getDatePresetRange(
  preset: DateRangePreset,
  today: string = getIstanbulToday(),
): { dateFrom: string | undefined; dateTo: string | undefined } {
  if (preset === 'all') {
    return { dateFrom: undefined, dateTo: undefined };
  }

  const [year, month, day] = today.split('-').map(Number);
  if (preset === 'month') {
    return {
      dateFrom: `${year}-${String(month).padStart(2, '0')}-01`,
      dateTo: today,
    };
  }

  const days = preset === '7d' ? 7 : 30;
  const start = new Date(Date.UTC(year, month - 1, day - (days - 1)));
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: today,
  };
}

// Staff may edit a delivery only if its business date is today in
// Europe/Istanbul and the local time is before 23:59.
export function canEditDelivery(deliveryDate: string): boolean {
  if (deliveryDate !== getIstanbulToday()) {
    return false;
  }

  const { hour, minute } = getIstanbulParts(new Date());
  return hour < 23 || (hour === 23 && minute < 59);
}

// Formats a date for display in Turkish locale. Accepts both YYYY-MM-DD
// (returned by getIstanbulToday / parseIsoDate) and full ISO timestamps
// (returned by Supabase RPCs for columns like branches.created_at).
// The regex prefixes on the date portion and ignores the time/zone tail,
// which keeps the constructor from receiving NaN month/day values.
export function formatDateForDisplay(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return date; // pass through non-date strings unchanged
  const [, year, month, day] = match;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, Number(day)));
}

// YYYY-MM-DD -> Date using local calendar. Noon avoids any UTC day-shift when
// round-tripping through toISOString (the native date picker path).
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

// Date -> YYYY-MM-DD using local calendar components.
export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Formats a Supabase-style ISO timestamp ("YYYY-MM-DDTHH:mm:ss[.fff](Z|±HH:MM)")
// as `<display-date> HH:mm:ss` for UI. The fractional seconds and the trailing
// timezone designator are stripped — the date comes from `formatDateForDisplay`
// (already tr-TR localized) and the time is fixed-width hh:mm:ss.
export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const [datePart, timePart] = iso.split('T');
  const date = formatDateForDisplay(datePart ?? iso);
  if (!timePart) return date;
  const hhmm = timePart.split(/[+\-Z]/)[0] ?? '';
  const timeOnly = hhmm.split('.')[0];
  return timeOnly ? `${date} ${timeOnly}` : date;
}
