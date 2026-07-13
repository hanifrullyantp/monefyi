import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LaborSlotDraft, LaborSlotKind } from '../../../../types/labor';
import LaborDayEditor from './LaborDayEditor';

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

type Props = {
  month: Date;
  onMonthChange: (d: Date) => void;
  slotKind: LaborSlotKind;
  slots: Record<string, LaborSlotDraft>;
  onToggleDate: (date: string) => void;
  onUpdateSlot: (date: string, patch: Partial<LaborSlotDraft>) => void;
  onRemoveSlot: (date: string) => void;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function LaborCalendarGrid({
  month, onMonthChange, slotKind, slots, onToggleDate, onUpdateSlot, onRemoveSlot,
}: Props) {
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const { year, mon, cells } = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    const startPad = first.getDay();
    const total = Math.ceil((startPad + lastDay) / 7) * 7;
    const list: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - startPad + 1;
      if (dayNum < 1 || dayNum > lastDay) {
        list.push({ date: null, day: null });
      } else {
        list.push({ date: toIso(y, m, dayNum), day: dayNum });
      }
    }
    return { year: y, mon: m, cells: list };
  }, [month]);

  const monthLabel = month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const isPlanned = slotKind === 'planned';
  const activeClass = isPlanned
    ? 'bg-blue-500 text-white ring-2 ring-blue-200'
    : 'bg-rose-500 text-white ring-2 ring-rose-200';
  const halfClass = isPlanned
    ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
    : 'bg-rose-100 text-rose-800 ring-1 ring-rose-300';

  const shiftMonth = (delta: number) => {
    onMonthChange(new Date(year, mon + delta, 1));
    setEditingDate(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-slate-800 capitalize">{monthLabel}</span>
        <button type="button" onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:bg-slate-100">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
        {WEEKDAYS.map(w => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, idx) => {
          if (!cell.date || cell.day == null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }
          const draft = slots[cell.date];
          const hasSlot = Boolean(draft);
          const isHalf = draft?.day_fraction === 0.5;
          const hasOt = (draft?.overtime_hours || 0) > 0;

          return (
            <div key={cell.date} className="relative aspect-square">
              <button
                type="button"
                onClick={() => {
                  if (!hasSlot) onToggleDate(cell.date!);
                  setEditingDate(editingDate === cell.date ? null : cell.date);
                }}
                className={`w-full h-full rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                  hasSlot
                    ? isHalf ? halfClass : activeClass
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                <span>{cell.day}</span>
                {isHalf && <span className="text-[9px] font-black opacity-80">½</span>}
                {hasOt && <span className="text-[8px] font-bold opacity-90">OT</span>}
              </button>

              {editingDate === cell.date && draft && (
                <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-xl border border-slate-100">
                  <LaborDayEditor
                    draft={draft}
                    onChange={patch => onUpdateSlot(cell.date!, patch)}
                    onRemove={() => {
                      onRemoveSlot(cell.date!);
                      setEditingDate(null);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Klik tanggal untuk {isPlanned ? 'planning' : 'realisasi'} · klik lagi untuk edit ½ hari / lembur
      </p>
    </div>
  );
}
