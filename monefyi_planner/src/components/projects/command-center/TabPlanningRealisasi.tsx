import { useState, type ReactNode } from 'react';

type PlanningSubTab = 'gantt' | 'rap' | 'progress';

interface TabPlanningRealisasiProps {
  workItemCount: number;
  rapCount: number;
  gantt: ReactNode;
  rap: ReactNode;
  progress: ReactNode;
}

export default function TabPlanningRealisasi({
  workItemCount, rapCount, gantt, rap, progress,
}: TabPlanningRealisasiProps) {
  const [sub, setSub] = useState<PlanningSubTab>('gantt');

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'gantt' as const, label: `Gantt Chart (${workItemCount})` },
          { id: 'rap' as const, label: `RAP (${rapCount})` },
          { id: 'progress' as const, label: 'Update Progress' },
        ]).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              sub === t.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {sub === 'gantt' && gantt}
      {sub === 'rap' && rap}
      {sub === 'progress' && progress}
    </div>
  );
}
