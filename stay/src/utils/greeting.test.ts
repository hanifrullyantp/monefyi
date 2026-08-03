import { describe, expect, it } from 'vitest';
import {
  getFormattedDate,
  getGreeting,
  getGreetingEmoji,
  getGreetingLabel,
} from './greeting';

describe('getGreeting - Morning hour - Returns Pagi', () => {
  it('returns Pagi for 7am', () => {
    expect(getGreeting(7)).toBe('Pagi');
  });
});

describe('getGreeting - Afternoon hour - Returns Siang', () => {
  it('returns Siang for 12pm', () => {
    expect(getGreeting(12)).toBe('Siang');
  });
});

describe('getGreeting - Evening hour - Returns Sore', () => {
  it('returns Sore for 16pm', () => {
    expect(getGreeting(16)).toBe('Sore');
  });
});

describe('getGreeting - Night hour - Returns Malam', () => {
  it('returns Malam for 22pm', () => {
    expect(getGreeting(22)).toBe('Malam');
  });
});

describe('getGreetingEmoji - Time of day - Returns matching emoji', () => {
  it('returns sun for morning', () => {
    expect(getGreetingEmoji(8)).toBe('☀️');
  });

  it('returns moon for night', () => {
    expect(getGreetingEmoji(23)).toBe('🌙');
  });
});

describe('getGreetingLabel - User name - Includes salutation', () => {
  it('builds full greeting', () => {
    expect(getGreetingLabel(9, 'Budi')).toBe('Selamat Pagi, Budi');
  });
});

describe('getFormattedDate - Indonesian locale - Returns long date', () => {
  it('formats date in id locale', () => {
    const label = getFormattedDate(new Date('2026-08-03T10:00:00'), 'id');
    expect(label.toLowerCase()).toContain('2026');
    expect(label.toLowerCase()).toContain('agustus');
  });
});
