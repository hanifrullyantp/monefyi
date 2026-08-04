import { memo } from 'react';
import RoomCard, { type RoomCardProps } from './RoomCard';

/**
 * RoomCard dengan React.memo untuk grid 50+ kamar.
 */
const MemoRoomCard = memo(RoomCard, (prev, next) => {
  return (
    prev.size === next.size &&
    prev.editable === next.editable &&
    prev.room.id === next.room.id &&
    prev.room.status === next.room.status &&
    prev.room.rawStatus === next.room.rawStatus &&
    prev.room.notes === next.room.notes &&
    prev.room.urgencyLevel === next.room.urgencyLevel &&
    prev.room.shouldPulse === next.room.shouldPulse &&
    prev.room.checkoutLabel === next.room.checkoutLabel &&
    prev.room.activeBooking?.paidAmount === next.room.activeBooking?.paidAmount
  );
});

MemoRoomCard.displayName = 'MemoRoomCard';

export default MemoRoomCard;
export type { RoomCardProps };
