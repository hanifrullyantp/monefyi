import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export type GreetingPeriod = 'Pagi' | 'Siang' | 'Sore' | 'Malam';

/** Sapaan berdasarkan jam (0–23) */
export function getGreeting(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 11) return 'Pagi';
  if (hour >= 11 && hour < 15) return 'Siang';
  if (hour >= 15 && hour < 18) return 'Sore';
  return 'Malam';
}

/** Emoji sesuai waktu */
export function getGreetingEmoji(hour: number): string {
  if (hour >= 5 && hour < 11) return '☀️';
  if (hour >= 11 && hour < 15) return '🌤️';
  if (hour >= 15 && hour < 18) return '🌆';
  return '🌙';
}

/** Tanggal lengkap Bahasa Indonesia */
export function getFormattedDate(date: Date, locale: 'id' | 'en' = 'id'): string {
  if (locale === 'id') {
    return format(date, 'EEEE, d MMMM yyyy', { locale: localeId });
  }
  return format(date, 'EEEE, MMMM d, yyyy');
}

/** Label sapaan lengkap */
export function getGreetingLabel(hour: number, name: string): string {
  return `Selamat ${getGreeting(hour)}, ${name}`;
}
