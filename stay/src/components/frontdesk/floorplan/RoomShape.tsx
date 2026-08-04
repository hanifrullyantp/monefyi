import { memo } from 'react';
import type { RoomCardData } from '../../../types/frontdesk.types';
import type { FloorPlanPosition } from '../../../data/floorPlanTemplates';
import { getRoomShapeColors } from '../../../data/floorPlanTemplates';

export interface RoomShapeProps {
  room: RoomCardData;
  position: FloorPlanPosition;
  scale?: number;
  isHovered?: boolean;
  isSelected?: boolean;
  onClick?: (room: RoomCardData) => void;
  onMouseEnter?: (room: RoomCardData) => void;
  onMouseLeave?: () => void;
}

function RoomShapeComponent({
  room,
  position,
  isHovered,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: RoomShapeProps) {
  const colors = getRoomShapeColors(room.status);
  const pulse = room.shouldPulse;

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={() => onClick?.(room)}
      onMouseEnter={() => onMouseEnter?.(room)}
      onMouseLeave={onMouseLeave}
      className="cursor-pointer"
      data-testid={`floor-room-${room.number}`}
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
      >
        {room.roomTypeName.slice(0, 12)}
      </text>
      {room.urgencyLevel >= 2 && (
        <circle cx={position.width - 8} cy={8} r={5} fill="#ef4444" />
      )}
    </g>
  );
}

const RoomShape = memo(RoomShapeComponent);
export default RoomShape;
