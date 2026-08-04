export interface RoomActivityItem {
  id: string;
  time: string;
  emoji: string;
  description: string;
}

const BASE_ACTIVITIES: RoomActivityItem[] = [
  {
    id: 'a1',
    time: '14:20',
    emoji: '🍳',
    description: 'Tamu request extra towel',
  },
  {
    id: 'a2',
    time: '12:00',
    emoji: '💰',
    description: 'Pembayaran cash Rp 500.000',
  },
  {
    id: 'a3',
    time: '09:30',
    emoji: '🧹',
    description: 'Housekeeping selesai',
  },
  {
    id: 'a4',
    time: '08:15',
    emoji: '✅',
    description: 'Check-in tamu berhasil',
  },
  {
    id: 'a5',
    time: '07:45',
    emoji: '📱',
    description: 'Reminder WA terkirim',
  },
];

/** Mock aktivitas 24 jam terakhir per kamar */
export function getMockRoomActivities(roomId: string): RoomActivityItem[] {
  return BASE_ACTIVITIES.map((a, i) => ({
    ...a,
    id: `${roomId}-${a.id}`,
    description: i === 0 ? a.description : a.description,
  }));
}

export const EXTENDED_ACTIVITIES: RoomActivityItem[] = [
  { id: 'x1', time: 'Kemarin', emoji: '🛎️', description: 'Room service breakfast' },
  { id: 'x2', time: 'Kemarin', emoji: '🔑', description: 'Kunci cadangan diberikan' },
];
