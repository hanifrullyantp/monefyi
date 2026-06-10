import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { JournalEntry } from '../../../types/financeV2';
import { formatFinanceRupiah } from '../../../lib/financeV2Calc';

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  return `${days} hari lalu`;
}

function entryMeta(entry: JournalEntry): { dot: string; label: string; sign: string } {
  if (entry.reference_type === 'transfer') {
    return { dot: 'bg-blue-500', label: 'Transfer', sign: '' };
  }
  if (entry.reference_type === 'project_income') {
    return { dot: 'bg-emerald-500', label: 'Masuk', sign: '+' };
  }
  return { dot: 'bg-rose-500', label: 'Keluar', sign: '-' };
}

interface Props {
  entries: JournalEntry[];
  loading?: boolean;
}

export default function RecentTransactions({ entries, loading }: Props) {
  const navigate = useNavigate();
  const rows = entries.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
        <h3 className="font-bold text-slate-800 text-sm">🕐 Transaksi Terbaru</h3>
        <button
          type="button"
          onClick={() => navigate('/app/finance-v2/laporan')}
          className="text-xs font-bold text-emerald-600 hover:underline"
        >
          Lihat Semua →
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-400 text-center">Belum ada transaksi.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {rows.map(entry => {
            const meta = entryMeta(entry);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => navigate('/app/finance-v2/laporan')}
                  title={new Date(entry.created_at).toLocaleString('id-ID')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                  <span className="text-slate-500 text-xs w-14 shrink-0">{meta.label}</span>
                  <span className="flex-1 truncate text-slate-800">
                    {entry.description || entry.reference_type || 'Jurnal'}
                  </span>
                  <span className={`font-bold shrink-0 ${meta.sign === '+' ? 'text-emerald-600' : meta.sign === '-' ? 'text-rose-600' : 'text-blue-600'}`}>
                    {meta.sign}{formatFinanceRupiah(entry.total_amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 w-16 text-right shrink-0">
                    {relativeTime(entry.created_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
