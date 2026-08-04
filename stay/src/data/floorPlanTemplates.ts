import type { RoomCardData } from '../types/frontdesk.types';

export interface FloorPlanPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FloorPlanElementType =
  | 'corridor'
  | 'stairs'
  | 'elevator'
  | 'reception'
  | 'pool'
  | 'lobby';

export interface FloorPlanElement {
  id: string;
  type: FloorPlanElementType;
  label?: string;
  path?: string;
  rect?: FloorPlanPosition;
}

export interface FloorPlanTemplateRoom {
  numberPattern: RegExp | string;
  position: FloorPlanPosition;
}

export interface FloorPlanTemplate {
  id: string;
  name: string;
  description: string;
  canvasWidth: number;
  canvasHeight: number;
  elements: FloorPlanElement[];
  roomDefaults: FloorPlanTemplateRoom[];
}

export const DEFAULT_ROOM_SHAPE: Pick<FloorPlanPosition, 'width' | 'height'> = {
  width: 120,
  height: 88,
};

const hotelLinear: FloorPlanTemplate = {
  id: 'hotel_linear',
  name: 'Hotel Linear',
  description: 'Kamar berjajar di koridor utama',
  canvasWidth: 900,
  canvasHeight: 500,
  elements: [
    {
      id: 'corridor-main',
      type: 'corridor',
      path: 'M 40 220 L 860 220 L 860 280 L 40 280 Z',
    },
    {
      id: 'reception',
      type: 'reception',
      label: 'Resepsionis',
      rect: { x: 40, y: 40, width: 160, height: 80 },
    },
    {
      id: 'stairs',
      type: 'stairs',
      label: 'Tangga',
      rect: { x: 780, y: 320, width: 80, height: 80 },
    },
    {
      id: 'elevator',
      type: 'elevator',
      label: 'Lift',
      rect: { x: 780, y: 420, width: 80, height: 60 },
    },
  ],
  roomDefaults: [],
};

const hotelLShape: FloorPlanTemplate = {
  id: 'hotel_l_shape',
  name: 'Hotel L-Shape',
  description: 'Sayap L dengan lobby tengah',
  canvasWidth: 800,
  canvasHeight: 600,
  elements: [
    {
      id: 'corridor-l',
      type: 'corridor',
      path: 'M 80 280 L 400 280 L 400 520 L 480 520 L 480 280 L 720 280 L 720 340 L 80 340 Z',
    },
    {
      id: 'lobby',
      type: 'lobby',
      label: 'Lobby',
      rect: { x: 300, y: 80, width: 200, height: 120 },
    },
    {
      id: 'pool',
      type: 'pool',
      label: 'Kolam',
      rect: { x: 560, y: 420, width: 180, height: 120 },
    },
  ],
  roomDefaults: [],
};

const villaScattered: FloorPlanTemplate = {
  id: 'villa_scattered',
  name: 'Villa Scattered',
  description: 'Unit villa tersebar',
  canvasWidth: 1000,
  canvasHeight: 700,
  elements: [
    {
      id: 'pool-central',
      type: 'pool',
      label: 'Kolam',
      rect: { x: 400, y: 280, width: 200, height: 120 },
    },
    {
      id: 'reception-villa',
      type: 'reception',
      label: 'Resepsionis',
      rect: { x: 420, y: 80, width: 160, height: 70 },
    },
  ],
  roomDefaults: [],
};

const homestayHouse: FloorPlanTemplate = {
  id: 'homestay_house',
  name: 'Homestay Rumah',
  description: 'Layout seperti rumah tinggal',
  canvasWidth: 600,
  canvasHeight: 500,
  elements: [
    {
      id: 'corridor-house',
      type: 'corridor',
      path: 'M 200 180 L 400 180 L 400 380 L 200 380 Z',
    },
    {
      id: 'reception-house',
      type: 'reception',
      label: 'Resepsionis',
      rect: { x: 220, y: 40, width: 160, height: 60 },
    },
  ],
  roomDefaults: [],
};

export const FLOOR_PLAN_TEMPLATES: Record<string, FloorPlanTemplate> = {
  hotel_linear: hotelLinear,
  hotel_l_shape: hotelLShape,
  villa_scattered: villaScattered,
  homestay_house: homestayHouse,
};

export const DEFAULT_FLOOR_PLAN_TEMPLATE_ID = 'hotel_linear';

export function resolveRoomFloorPlanPosition(
  room: RoomCardData,
  index: number,
  template: FloorPlanTemplate = FLOOR_PLAN_TEMPLATES[DEFAULT_FLOOR_PLAN_TEMPLATE_ID]
): FloorPlanPosition {
  if (room.positionX != null && room.positionY != null) {
    return {
      x: room.positionX,
      y: room.positionY,
      width: DEFAULT_ROOM_SHAPE.width,
      height: DEFAULT_ROOM_SHAPE.height,
    };
  }

  for (const def of template.roomDefaults) {
    const pattern =
      typeof def.numberPattern === 'string'
        ? new RegExp(`^${def.numberPattern}$`)
        : def.numberPattern;
    if (pattern.test(room.number)) {
      return { ...def.position };
    }
  }

  const col = index % 4;
  const row = Math.floor(index / 4);
  const floorOffset = Math.max(0, room.floor - 1) * 160;

  return {
    x: 60 + col * 140,
    y: 60 + row * 110 + floorOffset,
    width: DEFAULT_ROOM_SHAPE.width,
    height: DEFAULT_ROOM_SHAPE.height,
  };
}

export function getRoomShapeColors(status: RoomCardData['status']): {
  fill: string;
  stroke: string;
  text: string;
} {
  switch (status) {
    case 'AVAILABLE':
      return { fill: '#ecfdf5', stroke: '#6ee7b7', text: '#047857' };
    case 'OCCUPIED':
      return { fill: '#d1fae5', stroke: '#34d399', text: '#065f46' };
    case 'RESERVED':
      return { fill: '#f5f3ff', stroke: '#c4b5fd', text: '#6d28d9' };
    case 'DIRTY':
      return { fill: '#fffbeb', stroke: '#fcd34d', text: '#92400e' };
    case 'MAINTENANCE':
      return { fill: '#f1f5f9', stroke: '#94a3b8', text: '#475569' };
    case 'UNPAID':
      return { fill: '#fef2f2', stroke: '#f87171', text: '#b91c1c' };
    default:
      return { fill: '#ffffff', stroke: '#e5e7eb', text: '#111827' };
  }
}
