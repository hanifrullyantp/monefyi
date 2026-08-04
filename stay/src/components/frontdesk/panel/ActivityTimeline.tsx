import { useState } from 'react';
import {
  EXTENDED_ACTIVITIES,
  getMockRoomActivities,
  type RoomActivityItem,
} from '../../../data/frontdeskMockActivities';

export interface ActivityTimelineProps {
  roomId: string;
}

export default function ActivityTimeline({ roomId }: ActivityTimelineProps) {
  const items = getMockRoomActivities(roomId);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? [...items, ...EXTENDED_ACTIVITIES] : items;

  return (
    <section className="space-y-3" aria-labelledby="activity-heading">
      <h3 id="activity-heading" className="text-xs font-black uppercase tracking-widest text-gray-400">
        Riwayat Aktivitas
      </h3>

      <ol className="relative space-y-0 border-l-2 border-gray-100 pl-4">
        {visible.map((item, index) => (
          <li key={item.id} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[21px] top-1 flex h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-white" />
            <p className="text-[10px] font-bold text-gray-400">{item.time}</p>
            <p className="text-sm text-gray-800">
              <span className="mr-1" aria-hidden>
                {item.emoji}
              </span>
              {item.description}
            </p>
            {index === items.length - 1 && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                Load more aktivitas →
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
