import { memo, useCallback, useRef, useState, type RefObject } from 'react';
import type { RoomCardData } from '../../../types/frontdesk.types';
import type { FloorPlanPosition } from '../../../data/floorPlanTemplates';
import { getRoomShapeColors } from '../../../data/floorPlanTemplates';
import {
  clampRoomPosition,
  clientPointToSvg,
  snapToGrid,
} from '../../../utils/svgCoordinates';

const DRAG_THRESHOLD_PX = 4;

export interface RoomShapeProps {
  room: RoomCardData;
  position: FloorPlanPosition;
  svgRef: RefObject<SVGSVGElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  editMode?: boolean;
  isHovered?: boolean;
  isSelected?: boolean;
  onClick?: (room: RoomCardData) => void;
  onPositionChange?: (roomId: string, x: number, y: number) => void;
  onMouseEnter?: (room: RoomCardData) => void;
  onMouseLeave?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function RoomShapeComponent({
  room,
  position,
  svgRef,
  canvasWidth,
  canvasHeight,
  editMode = false,
  isHovered,
  isSelected,
  onClick,
  onPositionChange,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
}: RoomShapeProps) {
  const colors = getRoomShapeColors(room.status);
  const pulse = room.shouldPulse;
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    offsetX: number;
    offsetY: number;
    moved: boolean;
    startX: number;
    startY: number;
  } | null>(null);

  const displayX = dragPos?.x ?? position.x;
  const displayY = dragPos?.y ?? position.y;

  const commitPosition = useCallback(
    (x: number, y: number) => {
      const snapped = {
        x: snapToGrid(x),
        y: snapToGrid(y),
      };
      const clamped = clampRoomPosition(
        snapped.x,
        snapped.y,
        position.width,
        position.height,
        canvasWidth,
        canvasHeight
      );
      onPositionChange?.(room.id, clamped.x, clamped.y);
      setDragPos(null);
    },
    [canvasHeight, canvasWidth, onPositionChange, position.height, position.width, room.id]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (!editMode || !svgRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const pt = clientPointToSvg(svgRef.current, e.clientX, e.clientY);
    dragRef.current = {
      offsetX: pt.x - displayX,
      offsetY: pt.y - displayY,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    onDragStart?.();
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!editMode || !dragRef.current || !svgRef.current) return;
    e.stopPropagation();

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    dragRef.current.moved = true;
    const pt = clientPointToSvg(svgRef.current, e.clientX, e.clientY);
    const next = clampRoomPosition(
      pt.x - dragRef.current.offsetX,
      pt.y - dragRef.current.offsetY,
      position.width,
      position.height,
      canvasWidth,
      canvasHeight
    );
    setDragPos(next);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (!editMode || !dragRef.current) return;
    e.stopPropagation();

    const { moved } = dragRef.current;
    dragRef.current = null;

    if (moved) {
      commitPosition(dragPos?.x ?? displayX, dragPos?.y ?? displayY);
    } else {
      onClick?.(room);
    }

    onDragEnd?.();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const handlePointerCancel = () => {
    dragRef.current = null;
    setDragPos(null);
    onDragEnd?.();
  };

  return (
    <g
      transform={`translate(${displayX}, ${displayY})`}
      onClick={editMode ? undefined : () => onClick?.(room)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseEnter={() => onMouseEnter?.(room)}
      onMouseLeave={onMouseLeave}
      className={editMode ? 'floor-room-draggable cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
      data-testid={`floor-room-${room.number}`}
      style={{ touchAction: editMode ? 'none' : undefined }}
    >
      <rect
        x={0}
        y={0}
        width={position.width}
        height={position.height}
        rx={10}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
        strokeDasharray={editMode ? '6 4' : undefined}
        className={pulse ? 'animate-pulse-urgent' : undefined}
      />
      <text
        x={position.width / 2}
        y={position.height / 2 - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colors.text}
        fontSize={22}
        fontWeight={800}
        pointerEvents="none"
      >
        {room.number}
      </text>
      <text
        x={position.width / 2}
        y={position.height / 2 + 16}
        textAnchor="middle"
        fill={colors.text}
        fontSize={9}
        opacity={0.75}
        pointerEvents="none"
      >
        {room.roomTypeName.slice(0, 12)}
      </text>
      {room.urgencyLevel >= 2 && (
        <circle cx={position.width - 8} cy={8} r={5} fill="#ef4444" pointerEvents="none" />
      )}
    </g>
  );
}

const RoomShape = memo(RoomShapeComponent);
export default RoomShape;
