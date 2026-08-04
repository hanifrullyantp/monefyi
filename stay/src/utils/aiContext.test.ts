import { describe, it, expect } from 'vitest';
import { buildKeywordReply, buildStayAiContext } from './aiContext';
import type { HousekeepingTask, Room } from '../types';

const emptyRooms: Room[] = [
  { id: 'r1', tenantId: 't1', roomTypeId: 'rt1', number: '101', floor: 1, status: 'available', isActive: true },
  { id: 'r2', tenantId: 't1', roomTypeId: 'rt1', number: '102', floor: 1, status: 'occupied', isActive: true },
];

describe('buildKeywordReply - Kamar kosong - Lists available rooms', () => {
  it('returns available room numbers', () => {
    const ctx = buildStayAiContext([], emptyRooms, [], []);
    const reply = buildKeywordReply('kamar kosong malam ini?', ctx);
    expect(reply).toContain('101');
    expect(reply).not.toContain('102');
  });
});

describe('buildStayAiContext - Empty data - Returns zero stats', () => {
  it('builds context without errors', () => {
    const ctx = buildStayAiContext([], emptyRooms, [], [] as HousekeepingTask[]);
    expect(ctx.availableRooms).toEqual(['101']);
    expect(ctx.stats.totalRooms).toBe(2);
  });
});
