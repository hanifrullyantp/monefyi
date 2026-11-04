/** Tanggal YYYY-MM-DD di zona organisasi. `now` disuntik agar bisa diuji. */
export function orgToday(timeZone = 'Asia/Jakarta', now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return '1970-01-01';
  return `${year}-${month}-${day}`;
}
