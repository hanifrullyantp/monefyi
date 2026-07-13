import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { formatRupiah } from '../../utils/projectUi';
import { showToast } from '../../store/uiStore';
import {
  buildProjectClosePreview,
  type ProjectClosePreview,
} from '../../services/financeV2/projectCloseService';
import { closeProjectFinance } from '../../services/financeV2/kasService';

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  projectId: string;
  userId?: string;
  onSuccess?: () => void;
};

export default function ProjectCloseFinanceWizard({
  open,
  onClose,
  orgId,
  projectId,
  userId,
  onSuccess,
}: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<ProjectClosePreview | null>(null);
  const [force, setForce] = useState(false);

  const load = useCallback(async () => {
    if (!open || !orgId || !projectId) return;
    setLoading(true);
    try {
      const p = await buildProjectClosePreview(orgId, projectId);
      setPreview(p);
      setStep(1);
      setForce(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat preview', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [open, orgId, projectId, onClose]);

  useEffect(() => { void load(); }, [load]);

  const handleClose = async () => {
    if (!preview) return;
    setSubmitting(true);
    try {
      await closeProjectFinance({
        orgId,
        projectId,
        createdBy: userId,
        force,
      });
      showToast(`Keuangan proyek ditutup. Laba: ${formatRupiah(preview.finalProfit)}`, 'success');
      onSuccess?.();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menutup keuangan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-violet-600" />
            <h2 className="font-bold text-slate-900">Tutup Keuangan Proyek</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !preview ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Proyek: <strong>{preview.projectName}</strong>
            </p>

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Dana Masuk" value={formatRupiah(preview.totalReceived)} />
                  <Stat label="Realisasi" value={formatRupiah(preview.totalSpent)} className="text-rose-600" />
                  <Stat label="Laba (basis kas)" value={formatRupiah(preview.finalProfit)} className={preview.finalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                  <Stat label="Sisa Kas Proyek" value={formatRupiah(preview.kasBalance)} />
                </div>
                {preview.warnings.length > 0 && (
                  <ul className="space-y-2">
                    {preview.warnings.map((w, i) => (
                      <li key={i} className="flex gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
                {preview.interProjectDebt > 0 && (
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
                    Tutup meski masih ada hutang antar-proyek
                  </label>
                )}
                <button
                  type="button"
                  disabled={!preview.canClose}
                  onClick={() => setStep(2)}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50"
                >
                  Lanjut Preview Jurnal
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                  <p className="font-bold text-slate-800">Jurnal yang akan diposting:</p>
                  {preview.kasBalance > 0 && (
                    <p>• Transfer kas proyek → Kas Bisnis: {formatRupiah(preview.kasBalance)}</p>
                  )}
                  {preview.finalProfit > 0 && (
                    <p>• Pengakuan laba → Laba Ditahan: {formatRupiah(preview.finalProfit)}</p>
                  )}
                  {preview.finalProfit < 0 && (
                    <p>• Defisit dicatat dari Laba Ditahan: {formatRupiah(Math.abs(preview.finalProfit))}</p>
                  )}
                  {preview.kasBalance <= 0 && preview.finalProfit === 0 && (
                    <p>• Tidak ada jurnal kas/laba (saldo nol)</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border font-semibold text-sm">
                    Kembali
                  </button>
                  <button
                    type="button"
                    disabled={submitting || !preview.canClose}
                    onClick={() => void handleClose()}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Tutup Keuangan
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-bold ${className}`}>{value}</div>
    </div>
  );
}
