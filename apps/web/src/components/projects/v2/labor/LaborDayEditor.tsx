import type { LaborSlotDraft } from '../../../../types/labor';

type Props = {
  draft: LaborSlotDraft;
  onChange: (patch: Partial<LaborSlotDraft>) => void;
  onRemove: () => void;
};

export default function LaborDayEditor({ draft, onChange, onRemove }: Props) {
  return (
    <div className="p-3 space-y-3 min-w-[220px]">
      <div className="text-xs font-bold text-slate-500 uppercase">{draft.work_date}</div>

      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Durasi hari</label>
        <div className="flex gap-1">
          {([1, 0.5] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => onChange({ day_fraction: f, regular_hours: f * 8 })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                draft.day_fraction === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {f === 1 ? '1 hari' : '½ hari'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Jam kerja</label>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={draft.regular_hours}
            onChange={e => onChange({ regular_hours: Number(e.target.value) || 0 })}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Lembur (jam)</label>
          <input
            type="number"
            min={0}
            max={12}
            step={0.5}
            value={draft.overtime_hours}
            onChange={e => onChange({ overtime_hours: Number(e.target.value) || 0 })}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Catatan</label>
        <input
          value={draft.notes || ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Opsional"
          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="w-full py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
      >
        Hapus tanggal
      </button>
    </div>
  );
}
