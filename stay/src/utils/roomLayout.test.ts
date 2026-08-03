import { describe, expect, it } from 'vitest';
import { generateDefaultLayout, backfillPositionsFromMock, getStaggeredPlacement } from './roomLayout';
import type { Room } from '../types';

const makeRoom = (overrides: Partial<Room> & Pick<Room, 'id' | 'number'>): Room => ({
  tenantId: 'tenant-1',
  roomTypeId: 'rt-1',
  floor: 1,
  status: 'available',
  isActive: true,
  ...overrides,
});

describe('generateDefaultLayout - Unplaced rooms - Returns grid positions', () => {
  it('assigns positions to rooms without coordinates', () => {
    const rooms = [
      makeRoom({ id: 'r1', number: '101' }),
      makeRoom({ id: 'r2', number: '102', floor: 1 }),
      makeRoom({ id: 'r3', number: '201', floor: 2 }),
    ];

    const layout = generateDefaultLayout(rooms);

    expect(layout).toHaveLength(3);
    expect(layout[0]).toMatchObject({ id: 'r1', x: 50, y: 50 });
    expect(layout[2].y).toBeGreaterThan(layout[0].y);
  });

  it('skips rooms that already have positions', () => {
    const rooms = [
      makeRoom({ id: 'r1', number: '101', positionX: 10, positionY: 20 }),
      makeRoom({ id: 'r2', number: '102' }),
    ];

    const layout = generateDefaultLayout(rooms);

    expect(layout).toHaveLength(1);
    expect(layout[0].id).toBe('r2');
  });
});

describe('backfillPositionsFromMock - Missing positions - Fills from mock data', () => {
  it('fills positions by room number', () => {
    const rooms = [makeRoom({ id: 'r1', number: '101' })];
    const mock = [{ number: '101', positionX: 50, positionY: 60 }];

    const result = backfillPositionsFromMock(rooms, mock);

    expect(result[0].positionX).toBe(50);
    expect(result[0].positionY).toBe(60);
  });
});

describe('getStaggeredPlacement - Sidebar placement - Staggers by index', () => {
  it('returns different x for consecutive indices', () => {
    const room = makeRoom({ id: 'r1', number: '101', floor: 1 });
    const first = getStaggeredPlacement(room, 0);
    const second = getStaggeredPlacement(room, 1);

    expect(second.x).toBeGreaterThan(first.x);
  });
});
