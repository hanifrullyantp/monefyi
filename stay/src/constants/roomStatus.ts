import type { LucideIcon } from 'lucide-react';
import {
  BedDouble,
  Brush,
  CalendarCheck,
  CircleDollarSign,
  DoorOpen,
  Wrench,
} from 'lucide-react';

/** Prioritas urgency: 0 = normal, 3 = paling mendesak */
export type RoomStatusPriority = 0 | 1 | 2 | 3;

export type FrontDeskStatusKey =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'DIRTY'
  | 'MAINTENANCE'
  | 'UNPAID';

export interface RoomStatusColorScheme {
  /** Hex untuk referensi / inline style */
  bg: string;
  border: string;
  text: string;
  accent: string;
  /** Kelas Tailwind siap pakai */
  bgClass: string;
  borderClass: string;
  textClass: string;
  accentClass: string;
}

export interface RoomStatusDefinition {
  key: FrontDeskStatusKey;
  label: string;
  description: string;
  priority: RoomStatusPriority;
  colors: RoomStatusColorScheme;
  icon: LucideIcon;
}

const AVAILABLE: RoomStatusDefinition = {
  key: 'AVAILABLE',
  label: 'Tersedia',
  description: 'Kamar siap dijual atau check-in tamu walk-in.',
  priority: 0,
  colors: {
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#475569',
    accent: '#94a3b8',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    textClass: 'text-slate-600',
    accentClass: 'text-slate-400',
  },
  icon: DoorOpen,
};

const OCCUPIED: RoomStatusDefinition = {
  key: 'OCCUPIED',
  label: 'Terisi',
  description: 'Tamu sedang menginap, pembayaran sudah lunas atau partial aman.',
  priority: 1,
  colors: {
    bg: '#f6f8f6',
    border: '#adb9ad',
    text: '#414d41',
    accent: '#647664',
    bgClass: 'bg-sage-100',
    borderClass: 'border-sage-300',
    textClass: 'text-sage-800',
    accentClass: 'text-sage-600',
  },
  icon: BedDouble,
};

const RESERVED: RoomStatusDefinition = {
  key: 'RESERVED',
  label: 'Dipesan',
  description: 'Booking sudah masuk, menunggu proses check-in.',
  priority: 1,
  colors: {
    bg: '#eff6ff',
    border: '#93c5fd',
    text: '#1e40af',
    accent: '#3b82f6',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-300',
    textClass: 'text-blue-800',
    accentClass: 'text-blue-500',
  },
  icon: CalendarCheck,
};

const DIRTY: RoomStatusDefinition = {
  key: 'DIRTY',
  label: 'Perlu Dibersihkan',
  description: 'Kamar perlu housekeeping sebelum bisa dijual kembali.',
  priority: 2,
  colors: {
    bg: '#fffbeb',
    border: '#fcd34d',
    text: '#92400e',
    accent: '#f59e0b',
    bgClass: 'bg-dirty-50',
    borderClass: 'border-dirty-300',
    textClass: 'text-dirty-800',
    accentClass: 'text-dirty-500',
  },
  icon: Brush,
};

const MAINTENANCE: RoomStatusDefinition = {
  key: 'MAINTENANCE',
  label: 'Perbaikan',
  description: 'Kamar tidak tersedia karena maintenance atau perbaikan.',
  priority: 2,
  colors: {
    bg: '#f0f2f8',
    border: '#aab6d6',
    text: '#434a76',
    accent: '#6470a8',
    bgClass: 'bg-indigo-mist-100',
    borderClass: 'border-indigo-mist-300',
    textClass: 'text-indigo-mist-800',
    accentClass: 'text-indigo-mist-600',
  },
  icon: Wrench,
};

const UNPAID: RoomStatusDefinition = {
  key: 'UNPAID',
  label: 'Belum Bayar',
  description: 'Tamu menginap dengan tagihan belum lunas — perlu tindakan segera.',
  priority: 3,
  colors: {
    bg: '#fff5f3',
    border: '#ff8a75',
    text: '#872d1d',
    accent: '#ff6347',
    bgClass: 'bg-coral-50',
    borderClass: 'border-coral-400',
    textClass: 'text-coral-900',
    accentClass: 'text-coral-500',
  },
  icon: CircleDollarSign,
};

/** Definisi lengkap 6 status kamar untuk redesign Front Desk */
export const ROOM_STATUS_DEFINITIONS: Record<FrontDeskStatusKey, RoomStatusDefinition> = {
  AVAILABLE,
  OCCUPIED,
  RESERVED,
  DIRTY,
  MAINTENANCE,
  UNPAID,
};

/** Urutan tampilan default (urgency tinggi di depan) */
export const ROOM_STATUS_ORDER: FrontDeskStatusKey[] = [
  'UNPAID',
  'DIRTY',
  'MAINTENANCE',
  'RESERVED',
  'OCCUPIED',
  'AVAILABLE',
];

/** Ambil definisi status by key */
export function getStatusDefinition(key: FrontDeskStatusKey): RoomStatusDefinition {
  return ROOM_STATUS_DEFINITIONS[key];
}

/** Semua definisi sebagai array, sorted by priority desc */
export function getAllStatusDefinitions(): RoomStatusDefinition[] {
  return ROOM_STATUS_ORDER.map((key) => ROOM_STATUS_DEFINITIONS[key]);
}
