import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BalanceCheckResult } from '../../lib/migration/balance-sheet';
import { balanceGapLabel, balanceStatusTitle } from '../../lib/migration/balance-sheet';
import { formatRupiah } from '../../utils/projectUi';

type Props = {
  open: boolean;
  onClose: () => void;
  check: BalanceCheckResult | null;
  onNavigate?: (route: string) => void;
};

export default function BalanceDiagnosisModal({ open, onClose, check, onNavigate }: Props) {
  if (!check) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                {check.isBalanced ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                )}
                <div>
                  <h3 className="font-bold text-slate-900">{balanceStatusTitle(check.scope)}</h3>
                  <p className="text-xs text-slate-500">{balanceGapLabel(check)}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Tutup">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['aktiva', 'pasiva', 'ekuitas'] as const).map(key => (
                  <div key={key} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase text-slate-500 font-semibold">{key}</div>
                    <div className="font-bold text-sm">{formatRupiah(check[key])}</div>
                  </div>
                ))}
              </div>

              {check.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700">
                    Masalah ditemukan ({check.issues.length})
                  </h4>
                  {check.issues.map((issue, idx) => (
                    <div key={issue.code + idx} className="border border-rose-100 bg-rose-50/50 rounded-xl p-3 text-sm">
                      <p className="font-medium text-slate-800">{issue.message}</p>
                      {issue.delta != null && (
                        <p className="text-xs text-slate-500 mt-1">
                          Selisih: {formatRupiah(Math.abs(issue.delta))}
                        </p>
                      )}
                      {issue.fix.route && onNavigate && (
                        <button
                          type="button"
                          className="mt-2 text-xs font-bold text-emerald-700"
                          onClick={() => { onNavigate(issue.fix.route!); onClose(); }}
                        >
                          {issue.fix.cta || issue.fix.action}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">Rincian baris</h4>
                <div className="space-y-1">
                  {check.lines.map(line => (
                    <div
                      key={line.key}
                      className={`flex justify-between text-sm py-1.5 px-2 rounded-lg ${line.hasError ? 'bg-amber-50' : ''}`}
                    >
                      <span className="text-slate-600">{line.label}</span>
                      <span className="font-semibold">{formatRupiah(line.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
