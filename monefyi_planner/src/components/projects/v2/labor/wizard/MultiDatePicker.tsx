import { useCallback, useMemo, useRef, useState } from 'react';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Download, Pencil } from 'lucide-react';
import type { LaborSlotDraft, LaborSlotKind } from '../../../../../types/labor';
import type { WizardVariant } from '../../../../../hooks/useWizardVariant';
import { formatRupiah } from '../../../../../utils/projectUi';
import LaborDayEditor from '../LaborDayEditor';
import SummaryCard from './SummaryCard';

const WEEKDAYS_DESKTOP = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
const WEEKDAYS_MOBILE = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function toIso(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

function defaultDraft(date: string): LaborSlotDraft {
  return { work_date: date, day_fraction: 1, regular_hours: 8, overtime_hours: 0 };
}

type Props = {
  variant: WizardVariant;
  slotKind: LaborSlotKind;
  onSlotKindChange: (k: LaborSlotKind) => void;
  month: Date;
  onMonthChange: (d: Date) => void;
  plannedSlots: Record<string, LaborSlotDraft>;
  actualSlots: Record<string, LaborSlotDraft>;
  onPlannedChange: (s: Record<string, LaborSlotDraft>) => void;
  onActualChange: (s: Record<string, LaborSlotDraft>) => void;
  unitRate: number;
  rateLabel: string;
  onImportAttendance?: () => void;
  importing?: boolean;
  showImport?: boolean;
  workerRecap?: React.ReactNode;
};

export default function MultiDatePicker({
  variant, slotKind, onSlotKindChange, month, onMonthChange,
  plannedSlots, actualSlots, onPlannedChange, onActualChange,
  unitRate, rateLabel, onImportAttendance, importing, showImport, workerRecap,
}: Props) {
  const isMobile = variant === 'mobile';
  const isWide = variant === 'wide';
  const slots = slotKind === 'planned' ? plannedSlots : actualSlots;
  const setSlots = slotKind === 'planned' ? onPlannedChange : onActualChange;

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; date: string } | null>(null);
  const dragRef = useRef<{ active: boolean; add: boolean } | null>(null);

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
      if (dayNum < 1 || dayNum > lastDay) list.push({ date: null, day: null });
      else list.push({ date: toIso(y, m, dayNum), day: dayNum });
    }
    return { year: y, mon: m, cells: list };
  }, [month]);

  const monthLabel = month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const toggleDate = (date: string, forceAdd?: boolean) => {
    setSlots(prev => {
      if (prev[date] && !forceAdd) {
        const next = { ...prev };
        delete next[date];
        return next;
      }
      return { ...prev, [date]: prev[date] || defaultDraft(date) };
    });
  };

  const summary = useMemo(() => {
    const list = Object.values(slots);
    let days = 0;
    let hours = 0;
    let total = 0;
    for (const d of list) {
      days += d.day_fraction;
      hours += d.regular_hours + d.overtime_hours;
      if (slotKind === 'planned' || slotKind === 'actual') {
        total += unitRate * d.day_fraction + (d.overtime_hours * (unitRate / 8) * 1.5);
      }
    }
    return { days: Math.round(days * 10) / 10, hours: Math.round(hours), total: Math.round(total) };
  }, [slots, unitRate, slotKind]);

  const selectWeekdays = () => {
    const next = { ...slots };
    for (const c of cells) {
      if (!c.date) continue;
      const dow = new Date(c.date).getDay();
      if (dow >= 1 && dow <= 5) next[c.date] = next[c.date] || defaultDraft(c.date);
    }
    setSlots(next);
  };

  const clearAll = () => setSlots({});

  const formatChip = (date: string, d: LaborSlotDraft) => {
    const label = new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    const h = d.regular_hours + d.overtime_hours;
    return `${label}·${h}h`;
  };

  const calPanel = (
    <>
      <div className="wz-mode-toggle">
        <button
          type="button"
          className={`wz-mode-btn${slotKind === 'planned' ? ' active planned' : ''}`}
          onClick={() => onSlotKindChange('planned')}
        >
          <Calendar className="w-4 h-4" /> Planning
        </button>
        <button
          type="button"
          className={`wz-mode-btn${slotKind === 'actual' ? ' active actual' : ''}`}
          onClick={() => onSlotKindChange('actual')}
        >
          <CheckCircle2 className="w-4 h-4" /> Realisasi
        </button>
      </div>
      {showImport && slotKind === 'actual' && onImportAttendance && (
        <button
          type="button"
          onClick={onImportAttendance}
          disabled={importing}
          className="mb-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 hover:bg-emerald-50"
        >
          <Download className="w-3.5 h-3.5" /> Ambil dari absensi HR
        </button>
      )}
      <div className="wz-cal-nav">
        <button type="button" className="wz-icon-btn" onClick={() => onMonthChange(new Date(year, mon - 1, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <strong className="capitalize">{monthLabel}</strong>
        <button type="button" className="wz-icon-btn" onClick={() => onMonthChange(new Date(year, mon + 1, 1))}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="wz-cal-grid">
        {(isMobile ? WEEKDAYS_MOBILE : WEEKDAYS_DESKTOP).map(w => (
          <div key={w} className="wz-cal-dow">{w}</div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell.date) return <div key={`e-${idx}`} />;
          const draft = slots[cell.date];
          const selected = Boolean(draft);
          return (
            <button
              key={cell.date}
              type="button"
              className={`wz-cal-cell${selected ? ' selected' : ''}`}
              onClick={() => toggleDate(cell.date!)}
              onContextMenu={e => {
                if (!isMobile && selected) {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, date: cell.date! });
                }
              }}
              onMouseDown={() => { if (!isMobile) dragRef.current = { active: true, add: !selected }; }}
              onMouseEnter={() => {
                if (!isMobile && dragRef.current?.active) toggleDate(cell.date!, true);
              }}
              onMouseUp={() => { dragRef.current = null; }}
              onTouchStart={() => {
                if (isMobile && selected) {
                  window.setTimeout(() => setEditingDate(cell.date), 500);
                }
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <div className="wz-quick-actions">
        <button type="button" className="wz-quick-btn" onClick={selectWeekdays}>Sen–Jum bulan ini</button>
        <button type="button" className="wz-quick-btn" onClick={clearAll}>Clear</button>
        <button type="button" className="wz-quick-btn" onClick={() => setEditingDate(Object.keys(slots)[0] || null)}>Detail per hari</button>
      </div>
      {isMobile && (
        <div className="wz-date-chips">
          {Object.entries(slots).map(([date, d]) => (
            <span key={date} className="wz-date-chip">{formatChip(date, d)}</span>
          ))}
        </div>
      )}
      {editingDate && slots[editingDate] && (
        <div className="mt-3 border rounded-xl shadow-lg bg-white">
          <LaborDayEditor
            draft={slots[editingDate]}
            onChange={patch => setSlots(prev => ({ ...prev, [editingDate]: { ...prev[editingDate], ...patch } }))}
            onRemove={() => {
              setSlots(prev => { const n = { ...prev }; delete n[editingDate]; return n; });
              setEditingDate(null);
            }}
          />
        </div>
      )}
    </>
  );

  const sidePanel = isWide && (
    <div>
      <SummaryCard days={summary.days} hours={summary.hours} total={summary.total} mode={slotKind} variant={variant} />
      <div className="mt-4 text-xs font-bold text-slate-500 uppercase mb-2">Tanggal terpilih</div>
      {Object.entries(slots).map(([date, d]) => (
        <button
          key={date}
          type="button"
          className="w-full text-left text-sm py-2.5 px-3 border border-slate-100 rounded-lg mb-1.5 flex justify-between items-center hover:bg-slate-50"
          onClick={() => setEditingDate(date)}
        >
          <span>
            {new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' · '}{d.regular_hours}h
            {d.overtime_hours > 0 && `+${d.overtime_hours}h lembur`}
            {' · '}{formatRupiah(unitRate * d.day_fraction)}
          </span>
          <Pencil className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <h2 className="wz-heading">Pilih Jadwal Kerja</h2>
      <p className="wz-subheading">Planning atau realisasi per tanggal</p>
      {workerRecap}
      <div className={isWide ? 'wz-step3-layout' : ''}>
        <div>{calPanel}</div>
        {isWide ? sidePanel : (
          <SummaryCard days={summary.days} hours={summary.hours} total={summary.total} mode={slotKind} variant={variant} />
        )}
      </div>
      {contextMenu && (
        <div
          className="fixed z-[100] bg-white border rounded-lg shadow-xl py-1 text-sm min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" className="block w-full text-left px-3 py-2 hover:bg-slate-50" onClick={() => { setEditingDate(contextMenu.date); setContextMenu(null); }}>Edit detail</button>
          <button type="button" className="block w-full text-left px-3 py-2 hover:bg-slate-50" onClick={() => {
            setSlots(prev => { const n = { ...prev }; const d = n[contextMenu.date]; if (d) n[contextMenu.date] = { ...d, day_fraction: 0.5, regular_hours: 4 }; return n; });
            setContextMenu(null);
          }}>Set ½ hari</button>
          <button type="button" className="block w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50" onClick={() => {
            setSlots(prev => { const n = { ...prev }; delete n[contextMenu.date]; return n; });
            setContextMenu(null);
          }}>Hapus</button>
        </div>
      )}
    </div>
  );
}
