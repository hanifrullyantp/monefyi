import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Link2, X } from 'lucide-react';
import type { BudgetExternalData, BudgetItem } from '../../../types/budgetUsaha';
import { formatRupiah } from '../../../utils/projectUi';
import { resolveBudgetIcon } from './budgetIcons';

type Props = {
  item: BudgetItem;
  external: BudgetExternalData | null;
  onOverride: (amount: number | null) => void;
};

export default function AutoLinkBadge({ item, external, onOverride }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!item.isAutoLinked || !item.linkedTo) return null;

  const source = item.linkedTo.source;
  const label =
    source === 'hr'
      ? 'Terhubung HR'
      : source === 'rap'
        ? 'Terhubung RAP'
        : 'Terhubung Proyek';

  const LinkIcon = Link2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        {label}
      </button>
      {!item.manualOverride && (
        <button
          type="button"
          onClick={() => onOverride(item.autoAmount ?? item.amount)}
          className="text-[11px] text-slate-500 underline hover:text-slate-700"
        >
          Override manual
        </button>
      )}
      {item.manualOverride != null && (
        <button
          type="button"
          onClick={() => onOverride(null)}
          className="text-[11px] text-amber-600 underline"
        >
          Reset auto
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-auto p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">{label}</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {source === 'hr' && external && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">
                  Total gaji: <strong>{formatRupiah(external.hrPayroll.totalMonthly)}</strong>/bln
                </p>
                <ul className="divide-y divide-slate-100 text-sm">
                  {external.hrPayroll.members.map(m => (
                    <li key={m.memberId} className="py-2 flex justify-between">
                      <span>
                        {m.name}
                        {m.position && <span className="text-slate-400"> · {m.position}</span>}
                      </span>
                      <span className="font-medium">{formatRupiah(m.monthlySalary)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { navigate('/app/hr'); setOpen(false); }}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
                >
                  Buka HR <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}

            {source === 'rap' && external && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">
                  Material: {formatRupiah(external.rapCosts.materialMonthly)}/bln · Tenaga:{' '}
                  {formatRupiah(external.rapCosts.laborMonthly)}/bln
                </p>
                <ul className="divide-y divide-slate-100 text-sm">
                  {external.rapCosts.byProject.map(p => (
                    <li key={p.projectId} className="py-2">
                      <div className="font-medium">{p.projectName}</div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        Material {formatRupiah(p.material)} · Plan {formatRupiah(p.laborPlanned)} · Actual{' '}
                        {formatRupiah(p.laborActual)}
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { navigate('/app/projects'); setOpen(false); }}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
                >
                  Buka Proyek <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
