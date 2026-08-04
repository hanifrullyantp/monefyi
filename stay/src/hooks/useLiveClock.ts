import { useEffect, useMemo, useState } from 'react';
import {
  getFormattedDate,
  getGreeting,
  getGreetingEmoji,
  getGreetingLabel,
  type GreetingPeriod,
} from '../utils/greeting';

export interface LiveClockState {
  time: string;
  dateLabel: string;
  greeting: GreetingPeriod;
  greetingEmoji: string;
  greetingLabel: string;
  hour: number;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function buildClockState(now: Date, userName: string): LiveClockState {
  const hour = now.getHours();
  return {
    time: formatTime(now),
    dateLabel: getFormattedDate(now),
    greeting: getGreeting(hour),
    greetingEmoji: getGreetingEmoji(hour),
    greetingLabel: getGreetingLabel(hour, userName),
    hour,
  };
}

/**
 * Jam live update per detik dengan sapaan & tanggal.
 */
export function useLiveClock(userName = 'Resepsionis'): LiveClockState {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => buildClockState(now, userName), [now, userName]);
}
