import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { formatRupiah } from '../../utils/projectUi';
import { loadPartyAccount } from '../../services/financeV2/partyLedgerService';
import type { PartyAccount } from '../../lib/financeV2/partyLedger';

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  partyName: string;
  projectId?: string;
};

export default function PartyAccountModal({ open, onClose, orgId, partyName, projectId }: Props) {
  const [account, setAccount] = useState<PartyAccount | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orgId || !partyName) return;
    let cancelled = false;
    setLoading(true);
    loadPartyAccount(orgId, partyName, projectId)
      .then(row => { if (!cancelled) setAccount(row); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, orgId, partyName, projectId]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Akun pihak</p>
            <h3 className="font-black text-slate-900">{partyName}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : !account ? (
            <p className="text-sm text-slate-500">Tidak ada hutang/piutang untuk pihak ini.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Mini label="Piutang" value={formatRupiah(account.piutang)} tone="emerald" />
                <Mini label="Hutang" value={formatRupiah(account.hutang)} tone="rose" />
                <Mini label="Neto" value={formatRupiah(account.net)} tone={account.net >= 0 ? 'emerald' : 'rose'} />
              </div>
              <p className="text-[11px] text-slate-500">
                Neto = piutang − hutang. Angka positif berarti pihak ini masih berutang ke usaha/proyek.
              </p>
              <div className="divide-y divide-slate-50">
                {account.lines.map(line => (
                  <div key={`${line.kind}-${line.id}`} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {line.kind === 'piutang' ? 'Piutang' : 'Hutang'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {line.status} · jatuh tempo {line.dueDate || '—'}
                        {line.notes ? ` · ${line.notes}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${line.kind === 'piutang' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatRupiah(line.outstanding)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        dari {formatRupiah(line.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'rose' }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3 text-center">
      <div className={`text-sm font-black ${tone === 'rose' ? 'text-rose-600' : 'text-emerald-700'}`}>{value}</div>
      <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">{label}</div>
    </div>
  );
}
