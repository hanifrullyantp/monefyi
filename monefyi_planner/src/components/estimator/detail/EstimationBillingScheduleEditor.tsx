import { useRef } from 'react';
import { AlertTriangle, Gift, Percent } from 'lucide-react';
import RupiahInput from '../RupiahInput';
import {
  cloneBillingMilestones,
  disableBillingMilestone,
  validateBillingMilestonePcts,
} from '../../../lib/estimationBillingConfig';
import type {
  BillingMilestoneConfig,
  BillingMilestoneKey,
  EstimationBillingConfig,
} from '../../../types/estimator';

type Props = {
  config: EstimationBillingConfig;
  onChange: (config: EstimationBillingConfig) => void;
  readOnly?: boolean;
};

export default function EstimationBillingScheduleEditor({ config, onChange, readOnly }: Props) {
  const validation = validateBillingMilestonePcts(config.milestones);
  const restoreSnapshots = useRef<Partial<Record<BillingMilestoneKey, BillingMilestoneConfig[]>>>({});

  const patchMilestone = (key: string, patch: Partial<BillingMilestoneConfig>) => {
    const next = config.milestones.map(m => {
      if (m.key !== key) return m;
      const updated = { ...m, ...patch };
      if (patch.pct !== undefined) {
        updated.pct = Math.min(100, Math.max(0, Math.round(Number(patch.pct) || 0)));
      }
      return updated;
    });
    onChange({ ...config, milestones: next });
  };

  const toggleEnabled = (key: BillingMilestoneKey, enabled: boolean) => {
    if (readOnly || key === 'dp') return;

    if (!enabled) {
      restoreSnapshots.current[key] = cloneBillingMilestones(config.milestones);
      onChange({
        ...config,
        milestones: disableBillingMilestone(config.milestones, key),
      });
      return;
    }

    const snap = restoreSnapshots.current[key];
    if (snap) {
      onChange({ ...config, milestones: cloneBillingMilestones(snap) });
      delete restoreSnapshots.current[key];
      return;
    }

    patchMilestone(key, { enabled: true });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Percent className="w-4 h-4 text-emerald-600" />
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Jadwal Tagihan</h4>
        <span className={`ml-auto text-[10px] font-bold tabular-nums ${
          validation.isExact ? 'text-emerald-600' : validation.isOver ? 'text-red-600' : 'text-amber-600'
        }`}>
          Total {validation.totalPct}%
        </span>
      </div>

      {(validation.isOver || validation.isUnder) && (
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
          validation.isOver ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-900 border border-amber-200'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {validation.isOver
              ? 'Total persentase melebihi 100%. Kurangi salah satu termin sebelum menyimpan.'
              : 'Total persentase belum 100%. Tambah pelunasan atau sesuaikan termin.'}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {config.milestones.map(m => (
          <li key={m.key} className="flex items-center gap-2">
            <label className="flex items-center gap-2 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={m.enabled}
                disabled={readOnly || m.key === 'dp'}
                onChange={e => toggleEnabled(m.key, e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 shrink-0"
              />
              <span className="text-xs font-semibold text-slate-700 truncate">{m.label}</span>
            </label>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={0}
                max={100}
                value={m.enabled ? m.pct : 0}
                disabled={readOnly || !m.enabled}
                onChange={e => patchMilestone(m.key, { pct: Number(e.target.value) })}
                className="w-14 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right tabular-nums disabled:bg-slate-50"
              />
              <span className="text-[10px] text-slate-400">%</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
        <label className="block">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Potongan / Diskon tagihan</span>
          <RupiahInput
            value={config.billing_discount_amount}
            onChange={v => onChange({ ...config, billing_discount_amount: v })}
            disabled={readOnly}
            className="mt-1 w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
            min={0}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Gift className="w-3 h-3" /> Catatan bonus
          </span>
          <input
            value={config.billing_bonus_note}
            onChange={e => onChange({ ...config, billing_bonus_note: e.target.value })}
            disabled={readOnly}
            placeholder="Contoh: Free 1 bulan garansi"
            className="mt-1 w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs disabled:bg-slate-50"
          />
        </label>
      </div>
    </div>
  );
}
