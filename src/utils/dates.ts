// Date helpers that use Europe/Istanbul timezone for business rules.

const ISTANBUL_TIME_ZONE = 'Europe/Istanbul';

function toIstanbulDate(date: Date): Date {
  return new Date(
    date.toLocaleString('en-US', { timeZone: ISTANBUL_TIME_ZONE }),
  );
}

// Returns today's date in Europe/Istanbul as YYYY-MM-DD.
export function getIstanbulToday(): string {
  const istanbulNow = toIstanbulDate(new Date());
  const year = istanbulNow.getFullYear();
  const month = String(istanbulNow.getMonth() + 1).padStart(2, '0');
  const day = String(istanbulNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Staff may edit a delivery only if its business date is today in
// Europe/Istanbul and the local time is before 23:59.
export function canEditDelivery(deliveryDate: string): boolean {
  if (deliveryDate !== getIstanbulToday()) {
    return false;
  }

  const istanbulNow = toIstanbulDate(new Date());
  return istanbulNow.getHours() < 23 || istanbulNow.getMinutes() < 59;
}

// Formats a YYYY-MM-DD string for display in Turkish locale.
export function formatDateForDisplay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}
