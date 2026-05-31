import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';

const ITEMS = [
  { id: 'profile', label: 'Lengkapi profil' },
  { id: 'project', label: 'Join project pertama' },
  { id: 'task', label: 'Selesaikan task pertama' },
  { id: 'notif', label: 'Set preferensi notifikasi' },
];

export default function OnboardingChecklist() {
  const [open, setOpen] = useState(true);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const completed = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completed / ITEMS.length) * 100);

  if (completed === ITEMS.length) return null;

  return (
    <div className="mx-4 lg:mx-6 mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between text-sm font-bold text-indigo-900">
        <span>Checklist memulai ({pct}%)</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {ITEMS.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setDone(d => ({ ...d, [item.id]: !d[item.id] }))}
                className="flex items-center gap-2 text-sm text-indigo-800"
              >
                {done[item.id] ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4" />}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
