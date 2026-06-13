import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';
import { parseRapWorkbook, downloadRapTemplate, previewImportTotals, resolveImportCost, type ParsedRapRow } from '../../services/rapExcelService';
import type { RapItem } from '../../services/rapService';
import { createRapItem, deleteAllRapItems, syncProjectBudgetFromRap } from '../../services/rapService';
import { createCostRealization, deleteAllCosts } from '../../services/costService';
import { findRapImportDuplicates } from '../../lib/rapDuplicateDetect';
import { showToast } from '../../store/uiStore';
import { formatRupiah } from '../../utils/projectUi';

interface RapImportWizardProps {
  open: boolean;
  projectId: string;
  projectName: string;
  recordedBy: string;
  existingItems?: RapItem[];
  onClose: () => void;
  onImported: () => void;
}

export default function RapImportWizard({
  open,
  projectId,
  projectName,
  recordedBy,
  existingItems = [],
  onClose,
  onImported,
}: RapImportWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRapRow[]>([]);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'include' | null>(null);

  const duplicates = useMemo(
    () => (step === 'preview' ? findRapImportDuplicates(existingItems, rows) : []),
    [step, existingItems, rows],
  );

  const skipDuplicates = duplicateAction === 'skip';

  const duplicateIndexes = useMemo(
    () => new Set(duplicates.map(d => d.index)),
    [duplicates],
  );

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast('File maksimal 10MB', 'error');
      return;
    }
    const buf = await file.arrayBuffer();
    const parsed = parseRapWorkbook(buf);
    if (!parsed.length) {
      showToast('Tidak ada baris RAP valid', 'error');
      return;
    }
    setRows(parsed);
    setDuplicateAction(null);
    setStep('preview');
  };

  const handleImport = async () => {
    if (mode === 'replace' && confirmText !== 'GANTI') {
      showToast('Ketik GANTI untuk mengganti semua RAP', 'error');
      return;
    }
    if (mode === 'append' && duplicates.length > 0 && duplicateAction === null) {
      showToast('Pilih dulu cara menangani baris duplikat', 'error');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'replace') {
        await deleteAllCosts(projectId);
        await deleteAllRapItems(projectId);
      }

      let imported = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.valid) continue;
        if (mode === 'append' && skipDuplicates && duplicateIndexes.has(i)) continue;

        const item = await createRapItem({
          project_id: projectId,
          type: r.type,
          name: r.name,
          description: r.description,
          unit: r.unit,
          quantity: r.quantity,
          unit_price: r.unit_price,
          sort_order: i,
        });
        const cost = resolveImportCost(r);
        if (cost && cost.total_amount > 0) {
          await createCostRealization({
            project_id: projectId,
            rap_item_id: item.id,
            date: new Date().toISOString().slice(0, 10),
            description: `Import: ${r.name}`,
            quantity: cost.quantity,
            unit_price: cost.unit_price,
            total_amount: cost.total_amount,
            recorded_by: recordedBy,
          });
        }
        imported += 1;
      }
      await syncProjectBudgetFromRap(projectId);
      showToast(`${imported} item RAP diimpor`, 'success');
      onImported();
      onClose();
      setStep('upload');
      setRows([]);
      setConfirmText('');
      setDuplicateAction(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import gagal', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const validCount = rows.filter(r => r.valid).length;
  const warnCount = rows.filter(r => r.warnings.length).length;
  const importPreview = step === 'preview' ? previewImportTotals(rows) : null;
  const importableCount = mode === 'append' && skipDuplicates
    ? rows.filter((r, i) => r.valid && !duplicateIndexes.has(i)).length
    : validCount;

  const needsDuplicateChoice = mode === 'append' && duplicates.length > 0;
  const canImport = importableCount > 0 && (!needsDuplicateChoice || duplicateAction !== null);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="p-5 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-slate-900">Import RAP Excel</h3>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {step === 'upload' && (
              <>
                <p className="text-sm text-slate-500">Upload file .xlsx/.xls (maks 10MB). Gunakan template untuk format kolom yang benar.</p>
                <button type="button" onClick={() => downloadRapTemplate(projectName)} className="text-sm font-bold text-emerald-600">
                  ↓ Unduh template — RAP Project ({projectName})
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full border-2 border-dashed border-emerald-200 rounded-2xl py-12 flex flex-col items-center gap-2 hover:bg-emerald-50/50"
                >
                  <Upload className="w-8 h-8 text-emerald-400" />
                  <span className="font-bold text-slate-700">Pilih file Excel</span>
                </button>
                <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
              </>
            )}

            {step === 'preview' && (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">{validCount} valid</span>
                  {warnCount > 0 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {warnCount} peringatan
                    </span>
                  )}
                  {duplicates.length > 0 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {duplicates.length} duplikat
                    </span>
                  )}
                </div>

                {duplicates.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 text-xs text-amber-900 space-y-3">
                    <p className="font-bold">
                      {duplicates.length} baris terdeteksi mirip / duplikat
                      {existingItems.length === 0 ? ' (dalam file Excel)' : ''}:
                    </p>
                    <p className="text-amber-800">
                      Duplikat belum tentu salah — pilih cara import sebelum melanjutkan.
                    </p>
                    <ul className="space-y-1 max-h-24 overflow-y-auto">
                      {duplicates.slice(0, 8).map(d => (
                        <li key={`${d.index}-${d.reason}`}>
                          Baris {d.row.rowIndex}: {d.row.name}
                          {d.reason === 'existing' && d.existingName
                            ? ` ≈ sudah ada "${d.existingName}"`
                            : ' (duplikat dalam file)'}
                        </li>
                      ))}
                      {duplicates.length > 8 && <li>…dan {duplicates.length - 8} lainnya</li>}
                    </ul>
                    {mode === 'append' && (
                      <div className="space-y-2 pt-1 border-t border-amber-200">
                        <p className="font-semibold text-amber-900">Konfirmasi penanganan duplikat:</p>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="dup-action"
                            checked={duplicateAction === 'skip'}
                            onChange={() => setDuplicateAction('skip')}
                            className="mt-0.5"
                          />
                          <span>
                            <strong>Lewati duplikat</strong> — hanya impor baris baru ({rows.filter((r, i) => r.valid && !duplicateIndexes.has(i)).length} item)
                          </span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="dup-action"
                            checked={duplicateAction === 'include'}
                            onChange={() => setDuplicateAction('include')}
                            className="mt-0.5"
                          />
                          <span>
                            <strong>Tetap impor semua</strong> — termasuk baris duplikat ({validCount} item)
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => { setMode('append'); setDuplicateAction(null); }} className={`flex-1 py-2 rounded-xl text-xs font-bold ${mode === 'append' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Tambah (append)</button>
                  <button type="button" onClick={() => { setMode('replace'); setDuplicateAction('include'); }} className={`flex-1 py-2 rounded-xl text-xs font-bold ${mode === 'replace' ? 'bg-rose-600 text-white' : 'bg-slate-100'}`}>Ganti semua</button>
                </div>

                {mode === 'replace' && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                    Mode ganti semua akan menghapus <strong>semua RAP dan riwayat biaya</strong> proyek ini, lalu impor ulang dari file.
                  </p>
                )}

                {mode === 'replace' && (
                  <input
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder='Ketik "GANTI" untuk konfirmasi'
                    className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm"
                  />
                )}

                {importPreview && importPreview.costRows > 0 && (
                  <div className="text-xs bg-slate-50 border rounded-xl px-3 py-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total RAP (rencana)</span>
                      <span className="font-bold">{formatRupiah(importPreview.planned)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Realisasi yang akan dicatat ({importPreview.costRows} baris)</span>
                      <span className={`font-bold ${importPreview.realisasi > importPreview.planned * 1.05 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatRupiah(importPreview.realisasi)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="border rounded-xl overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Item</th>
                        <th className="p-2 text-left">Vol</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.rowIndex} className={`border-t ${duplicateIndexes.has(i) ? 'bg-amber-50' : ''}`}>
                          <td className="p-2">{r.rowIndex}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2">{r.quantity}</td>
                          <td className="p-2">
                            {duplicateIndexes.has(i) ? '⚠️ dup' : r.errors.length ? '❌' : r.warnings.length ? '⚠️' : '✅'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {step === 'preview' && (
            <div className="p-5 border-t flex gap-2">
              <button type="button" onClick={() => { setStep('upload'); setRows([]); }} className="flex-1 py-3 border rounded-xl font-bold text-sm">Kembali</button>
              <button type="button" onClick={handleImport} disabled={busy || !canImport} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Import {importableCount} item
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
