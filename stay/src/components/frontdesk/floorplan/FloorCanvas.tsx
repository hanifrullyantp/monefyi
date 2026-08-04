import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import type { RoomCardData } from '../../../types/frontdesk.types';
import {
  DEFAULT_FLOOR_PLAN_TEMPLATE_ID,
  FLOOR_PLAN_TEMPLATES,
  resolveRoomFloorPlanPosition,
  type FloorPlanElement,
  type FloorPlanTemplate,
} from '../../../data/floorPlanTemplates';
import RoomShape from './RoomShape';

const ELEMENT_COLORS: Record<FloorPlanElement['type'], { fill: string; stroke: string }> = {
  corridor: { fill: '#e5e7eb', stroke: '#d1d5db' },
  stairs: { fill: '#f3f4f6', stroke: '#9ca3af' },
  elevator: { fill: '#dbeafe', stroke: '#93c5fd' },
  reception: { fill: '#d1fae5', stroke: '#6ee7b7' },
  pool: { fill: '#bae6fd', stroke: '#38bdf8' },
  lobby: { fill: '#fef3c7', stroke: '#fcd34d' },
};

export interface FloorCanvasProps {
  rooms: RoomCardData[];
  floor: number;
  template?: FloorPlanTemplate;
  selectedRoomId?: string | null;
  editMode?: boolean;
  onRoomClick?: (room: RoomCardData) => void;
  onRoomPositionChange?: (roomId: string, x: number, y: number) => void;
}

function FixedElement({ element }: { element: FloorPlanElement }) {
  const colors = ELEMENT_COLORS[element.type];

  if (element.path) {
    return (
      <path
        d={element.path}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1}
      />
    );
  }

  if (!element.rect) return null;
  const { x, y, width, height } = element.rect;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1.5}
      />
      {element.label && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#4b5563"
          fontSize={11}
          fontWeight={600}
        >
          {element.label}
        </text>
      )}
    </g>
  );
}

function FloorCanvasComponent({
  rooms,
  floor,
  template = FLOOR_PLAN_TEMPLATES[DEFAULT_FLOOR_PLAN_TEMPLATE_ID],
  selectedRoomId,
  editMode = false,
  onRoomClick,
  onRoomPositionChange,
}: FloorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDraggingRoom, setIsDraggingRoom] = useState(false);
  const [tooltip, setTooltip] = useState<{ room: RoomCardData; x: number; y: number } | null>(
    null
  );

  const floorRooms = useMemo(
    () => rooms.filter((r) => r.floor === floor),
    [rooms, floor]
  );

  const roomPositions = useMemo(
    () =>
      floorRooms.map((room, index) => ({
        room,
        position: resolveRoomFloorPlanPosition(room, index, template),
      })),
    [floorRooms, template]
  );

  const handleHover = useCallback((room: RoomCardData, position: { x: number; y: number }) => {
    if (editMode) return;
    setHoveredId(room.id);
    setTooltip({ room, x: position.x, y: position.y });
  }, [editMode]);

  const handleLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  return (
    <div className="relative h-full min-h-[400px] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <TransformWrapper
        initialScale={1}
        minScale={0.4}
        maxScale={2.5}
        centerOnInit
        wheel={{ step: 0.08 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: 'reset' }}
        panning={{
          disabled: isDraggingRoom,
          excluded: ['floor-room-draggable'],
        }}
      >
        <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
          <svg
            ref={svgRef}
            width={template.canvasWidth}
            height={template.canvasHeight}
            viewBox={`0 0 ${template.canvasWidth} ${template.canvasHeight}`}
            className="bg-white"
            data-testid="floor-canvas"
          >
            <defs>
              <pattern
                id="grid"
                width={40}
                height={40}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {template.elements.map((el) => (
              <FixedElement key={el.id} element={el} />
            ))}

            {roomPositions.map(({ room, position }) => (
              <RoomShape
                key={room.id}
                room={room}
                position={position}
                svgRef={svgRef}
                canvasWidth={template.canvasWidth}
                canvasHeight={template.canvasHeight}
                editMode={editMode}
                isHovered={hoveredId === room.id}
                isSelected={selectedRoomId === room.id}
                onClick={onRoomClick}
                onPositionChange={onRoomPositionChange}
                onMouseEnter={() => handleHover(room, position)}
                onMouseLeave={handleLeave}
                onDragStart={() => setIsDraggingRoom(true)}
                onDragEnd={() => setIsDraggingRoom(false)}
              />
            ))}

            {tooltip && !editMode && (
              <foreignObject
                x={Math.min(tooltip.x, template.canvasWidth - 180)}
                y={Math.max(tooltip.y - 70, 8)}
                width={170}
                height={60}
              >
                <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-lg">
                  <p className="font-bold text-gray-900">Kamar {tooltip.room.number}</p>
                  <p className="text-gray-600">{tooltip.room.roomTypeName}</p>
                  {tooltip.room.activeBooking?.guest && (
                    <p className="truncate text-gray-500">
                      {tooltip.room.activeBooking.guest.name}
                    </p>
                  )}
                </div>
              </foreignObject>
            )}
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

const FloorCanvas = memo(FloorCanvasComponent);
export default FloorCanvas;
