import { useMemo } from 'react';
import type { RoomCardData } from '../types/frontdesk.types';
import { RoomStatus } from '../types/frontdesk.types';
import { formatFloorName, parseFloorKey } from '../utils/mapRoomsToCardData';

export interface FloorSummary {
  total: number;
  occupied: number;
  available: number;
  reserved: number;
  dirty: number;
  maintenance: number;
  unpaid: number;
  occupancyRate: number;
  health: 'normal' | 'full' | 'issue';
}

export interface FloorGroupResult {
  floorName: string;
  floorNumber: number;
  rooms: RoomCardData[];
  summary: FloorSummary;
}

export interface UseRoomsGroupedResult {
  floors: Record<string, RoomCardData[]>;
  floorList: FloorGroupResult[];
  summary: FloorSummary;
}

const OCCUPIED_STATUSES: RoomStatus[] = [RoomStatus.OCCUPIED, RoomStatus.UNPAID];

function computeFloorSummary(rooms: RoomCardData[]): FloorSummary {
  const total = rooms.length;
  const occupied = rooms.filter((r) => OCCUPIED_STATUSES.includes(r.status)).length;
  const available = rooms.filter((r) => r.status === RoomStatus.AVAILABLE).length;
  const reserved = rooms.filter((r) => r.status === RoomStatus.RESERVED).length;
  const dirty = rooms.filter((r) => r.status === RoomStatus.DIRTY).length;
  const maintenance = rooms.filter((r) => r.status === RoomStatus.MAINTENANCE).length;
  const unpaid = rooms.filter((r) => r.status === RoomStatus.UNPAID).length;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  let health: FloorSummary['health'] = 'normal';
  if (dirty > 0 || maintenance > 0 || unpaid > 0) {
    health = 'issue';
  } else if (occupancyRate >= 90) {
    health = 'full';
  }

  return {
    total,
    occupied,
    available,
    reserved,
    dirty,
    maintenance,
    unpaid,
    occupancyRate,
    health,
  };
}

/** Deskripsi masalah lantai untuk badge / banner filter */
export function formatFloorIssueDescription(summary: FloorSummary): string {
  const parts: string[] = [];
  if (summary.dirty > 0) {
    parts.push(`${summary.dirty} perlu dibersihkan`);
  }
  if (summary.maintenance > 0) {
    parts.push(`${summary.maintenance} maintenance`);
  }
  if (summary.unpaid > 0) {
    parts.push(`${summary.unpaid} belum lunas`);
  }
  return parts.join(' · ');
}

/** Status kamar yang dianggap bermasalah pada lantai */
export function getIssueStatusesFromSummary(summary: FloorSummary): RoomStatus[] {
  const statuses: RoomStatus[] = [];
  if (summary.dirty > 0) statuses.push(RoomStatus.DIRTY);
  if (summary.maintenance > 0) statuses.push(RoomStatus.MAINTENANCE);
  if (summary.unpaid > 0) statuses.push(RoomStatus.UNPAID);
  return statuses;
}

export function isFloorIssueRoom(room: RoomCardData): boolean {
  return (
    room.status === RoomStatus.DIRTY ||
    room.status === RoomStatus.MAINTENANCE ||
    room.status === RoomStatus.UNPAID
  );
}

export function getRoomIssueLabel(room: RoomCardData): string {
  switch (room.status) {
    case RoomStatus.DIRTY:
      return 'Perlu dibersihkan';
    case RoomStatus.MAINTENANCE:
      return room.maintenanceNote?.trim() || 'Sedang maintenance';
    case RoomStatus.UNPAID:
      return room.activeBooking?.balanceDue
        ? `Belum lunas · sisa Rp ${room.activeBooking.balanceDue.toLocaleString('id-ID')}`
        : 'Belum lunas';
    default:
      return '';
  }
}

/**
 * Group kamar per lantai dengan natural sort (Dasar, 1, 2, …, 10).
 */
export function useRoomsGrouped(rooms: RoomCardData[]): UseRoomsGroupedResult {
  return useMemo(() => {
    const floors: Record<string, RoomCardData[]> = {};

    for (const room of rooms) {
      const name = formatFloorName(room.floor);
      if (!floors[name]) floors[name] = [];
      floors[name].push(room);
    }

    for (const name of Object.keys(floors)) {
      floors[name].sort((a, b) =>
        a.number.localeCompare(b.number, 'id', { numeric: true })
      );
    }

    const floorList: FloorGroupResult[] = Object.entries(floors)
      .map(([floorName, floorRooms]) => ({
        floorName,
        floorNumber: parseFloorKey(floorName),
        rooms: floorRooms,
        summary: computeFloorSummary(floorRooms),
      }))
      .sort((a, b) => a.floorNumber - b.floorNumber);

    return { floors, floorList, summary: computeFloorSummary(rooms) };
  }, [rooms]);
}

export { computeFloorSummary };
