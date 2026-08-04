import type { RoomStatus as DbRoomStatus } from '../types';

/** Opsi status operasional kamar (database) untuk inline edit */
export const ROOM_INLINE_STATUS_OPTIONS: {
  value: DbRoomStatus;
  label: string;
  short: string;
}[] = [
  { value: 'available', label: 'Tersedia', short: 'Ready' },
  { value: 'occupied', label: 'Terisi', short: 'In' },
  { value: 'cleaning', label: 'Kebersihan', short: 'HK' },
  { value: 'maintenance', label: 'Perawatan', short: 'Maint' },
  { value: 'blocked', label: 'Diblokir', short: 'Block' },
];

export function getInlineStatusLabel(status: string): string {
  return ROOM_INLINE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}
