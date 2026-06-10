import { useMemo, useState } from 'react';
import type { Project } from '../../../store/appStore';
import { HEALTH_CONFIG } from '../../../utils/projectUi';

interface CalendarViewProps {
  projects: Project[];
  onOpenProject: (p: Project) => void;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function CalendarView({ projects, onOpenProject }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDay = useMemo(() => {
    const map = new Map<number, Project[]>();
    for (const p of projects) {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      if (start.getFullYear() === year && start.getMonth() === month) {
        const d = start.getDate();
        map.set(d, [...(map.get(d) || []), p]);
      }
      if (end.getFullYear() === year && end.getMonth() === month && end.getDate() !== start.getDate()) {
        const d = end.getDate();
        map.set(d, [...(map.get(d) || []), p]);
      }
    }
    return map;
  }, [projects, year, month]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedProjects = selectedDay ? eventsByDay.get(selectedDay) || [] : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} className="px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">←</button>
        <span className="font-black text-slate-800 capitalize">{monthLabel(cursor)}</span>
        <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} className="px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">→</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const evts = eventsByDay.get(day) || [];
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`min-h-[52px] p-1 rounded-xl border text-left ${selectedDay === day ? 'border-emerald-400 bg-emerald-50' : 'border-slate-50 hover:bg-slate-50'} ${isToday ? 'ring-1 ring-emerald-300' : ''}`}
            >
              <div className="text-xs font-bold text-slate-700">{day}</div>
              <div className="flex gap-0.5 flex-wrap mt-0.5">
                {evts.slice(0, 3).map(p => (
                  <div key={p.id} className={`w-1.5 h-1.5 rounded-full ${HEALTH_CONFIG[p.health_status].dot}`} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay !== null && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs font-bold text-slate-500 mb-2">Event {selectedDay} {monthLabel(cursor)}</div>
          {selectedProjects.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada milestone proyek.</p>
          ) : selectedProjects.map(p => (
            <button key={p.id} type="button" onClick={() => onOpenProject(p)} className="block w-full text-left text-sm py-2 hover:text-emerald-600 font-medium">
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
