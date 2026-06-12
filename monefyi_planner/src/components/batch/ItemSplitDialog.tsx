import { useState } from 'react';
import { X } from 'lucide-react';
import type { ParsedCostLine } from '../../lib/costParser';
import type { Project } from '../../store/appStore';
import { formatRupiah } from '../../utils/projectUi';

interface SplitPart {
  projectId: string;
  amount: number;
}

interface ItemSplitDialogProps {
  item: ParsedCostLine;
  projects: Project[];
  onConfirm: (parts: SplitPart[]) => void;
  onCancel: () => void;
}

export default function ItemSplitDialog({
  item,
  projects,
  onConfirm,
  onCancel,
}: ItemSplitDialogProps) {
  const half = Math.round(item.total / 2);
  const [parts, setParts] = useState<SplitPart[]>([
    { projectId: projects[0]?.id || '', amount: half },
    { projectId: projects[1]?.id || projects[0]?.id || '', amount: item.total - half },
  ]);

  const updatePart = (idx: number, field: 'projectId' | 'amount', value: string | number) => {
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const totalSplit = parts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const valid = totalSplit === item.total && parts.every(p => p.projectId && p.amount > 0);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-slate-800">Split Multi-Project</h4>
            <p className="text-xs text-slate-500 truncate">{item.item}</p>
            <p className="text-sm font-semibold text-emerald-700">{formatRupiah(item.total)}</p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        {parts.map((part, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <select
              value={part.projectId}
              onChange={e => updatePart(idx, 'projectId', e.target.value)}
              className="flex-1 text-sm border rounded-lg px-2 py-1.5"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              type="number"
              value={part.amount}
              onChange={e => updatePart(idx, 'amount', Number(e.target.value))}
              className="w-28 text-sm border rounded-lg px-2 py-1.5 text-right"
            />
          </div>
        ))}
        <p className={`text-xs ${totalSplit === item.total ? 'text-emerald-600' : 'text-amber-600'}`}>
          Total split: {formatRupiah(totalSplit)} / {formatRupiah(item.total)}
        </p>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onConfirm(parts)}
          className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          Konfirmasi Split
        </button>
      </div>
    </div>
  );
}
