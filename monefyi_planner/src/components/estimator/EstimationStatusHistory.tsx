import { buildStatusHistory, type EstimationStatusTimestamps } from '../../lib/estimationStatus';
import { formatDateTimeId } from '../../lib/estimatorFormat';

type Props = {
  meta: EstimationStatusTimestamps;
  className?: string;
};

export default function EstimationStatusHistory({ meta, className = '' }: Props) {
  const rows = buildStatusHistory(meta);
  if (rows.length === 0) return null;

  return (
    <section className={`bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 ${className}`}>
      <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Riwayat Status</h3>
      <ul className="space-y-1 text-sm text-slate-600">
        {rows.map(row => (
          <li key={row.key} className="flex flex-wrap gap-x-2">
            <span className="text-slate-400">•</span>
            <span className="font-medium text-slate-700">{row.label}:</span>
            <span>{formatDateTimeId(row.at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
