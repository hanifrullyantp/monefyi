import { describe, expect, it } from 'vitest';
import { computeFloorSummary } from './useRoomsGrouped';
import type { RoomCardData } from '../types/frontdesk.types';
import { RoomStatus } from '../types/frontdesk.types';
import { matchesFilter, DEFAULT_FILTER_STATE } from './useRoomFilters';
import { formatFloorName } from '../utils/mapRoomsToCardData';

const sample: RoomCardData[] = [
  {
    id: '1', number: '101', floor: 1, roomTypeName: 'Std', basePrice: 100,
    status: RoomStatus.AVAILABLE, rawStatus: 'available', isActive: true,
    urgencyLevel: 0, shouldPulse: false, facilities: [],
  },
  {
    id: '2', number: '201', floor: 2, roomTypeName: 'Deluxe', basePrice: 200,
    status: RoomStatus.OCCUPIED, rawStatus: 'occupied', isActive: true,
    urgencyLevel: 1, shouldPulse: false, facilities: [],
  },
  {
    id: '3', number: '102', floor: 1, roomTypeName: 'Std', basePrice: 100,
    status: RoomStatus.DIRTY, rawStatus: 'cleaning', isActive: true,
    urgencyLevel: 2, shouldPulse: false, facilities: [],
  },
];

describe('matchesFilter - Status filter - Filters correctly', () => {
  it('matches selected status only', () => {
    const filters = { ...DEFAULT_FILTER_STATE, statuses: [RoomStatus.DIRTY] };
    expect(matchesFilter(sample[2], filters)).toBe(true);
    expect(matchesFilter(sample[0], filters)).toBe(false);
  });
});

describe('formatFloorName - Zero floor - Returns Dasar', () => {
  it('formats basement', () => {
    expect(formatFloorName(0)).toBe('Lantai Dasar');
  });
});

describe('computeFloorSummary - Issue health - Detects dirty', () => {
  it('marks issue when dirty present', () => {
    const summary = computeFloorSummary(sample.filter((r) => r.floor === 1));
    expect(summary.health).toBe('issue');
  });
});
