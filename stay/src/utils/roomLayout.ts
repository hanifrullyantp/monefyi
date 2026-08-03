import type { Room } from '../types';

export interface LayoutOptions {
  columns?: number;
  cellWidth?: number;
  cellHeight?: number;
  originX?: number;
  originY?: number;
  floorOffsetY?: number;
}

export interface RoomLayoutPosition {
  id: string;
  x: number;
  y: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  columns: 4,
  cellWidth: 150,
  cellHeight: 150,
  originX: 50,
  originY: 50,
  floorOffsetY: 180,
};

/**
 * Generate grid positions for rooms missing layout coordinates.
 */
export function generateDefaultLayout(
  rooms: Room[],
  options: LayoutOptions = {}
): RoomLayoutPosition[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const unplaced = rooms.filter((r) => r.positionX == null || r.positionY == null);

  const floorGroups = new Map<number, Room[]>();
  for (const room of unplaced) {
    const floor = room.floor ?? 1;
    const group = floorGroups.get(floor) ?? [];
    group.push(room);
    floorGroups.set(floor, group);
  }

  const sortedFloors = [...floorGroups.keys()].sort((a, b) => a - b);
  const positions: RoomLayoutPosition[] = [];

  for (const floor of sortedFloors) {
    const floorRooms = floorGroups.get(floor) ?? [];
    const floorIndex = sortedFloors.indexOf(floor);
    const baseY = opts.originY + floorIndex * opts.floorOffsetY;

    floorRooms.forEach((room, index) => {
      const col = index % opts.columns;
      const row = Math.floor(index / opts.columns);
      positions.push({
        id: room.id,
        x: opts.originX + col * opts.cellWidth,
        y: baseY + row * opts.cellHeight,
      });
    });
  }

  return positions;
}

/**
 * Backfill positions from mock room data by room number.
 */
export function backfillPositionsFromMock(
  rooms: Room[],
  mockRooms: Pick<Room, 'number' | 'positionX' | 'positionY'>[]
): Room[] {
  const mockByNumber = new Map(
    mockRooms
      .filter((r) => r.positionX != null && r.positionY != null)
      .map((r) => [r.number, { x: r.positionX!, y: r.positionY! }])
  );

  return rooms.map((room) => {
    if (room.positionX != null && room.positionY != null) return room;
    const mock = mockByNumber.get(room.number);
    if (!mock) return room;
    return { ...room, positionX: mock.x, positionY: mock.y };
  });
}

/**
 * Staggered placement for a single unplaced room in builder sidebar.
 */
export function getStaggeredPlacement(
  room: Room,
  index: number,
  options: LayoutOptions = {}
): { x: number; y: number } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const floorIndex = Math.max(0, (room.floor ?? 1) - 1);
  return {
    x: 200 + (index % opts.columns) * 160,
    y: 200 + floorIndex * opts.floorOffsetY + Math.floor(index / opts.columns) * opts.cellHeight,
  };
}
