import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';
import { parseRapWorkbook, downloadRapTemplate, type ParsedRapRow } from '../../services/rapExcelService';
import { createRapItem, deleteAllRapItems } from '../../services/rapService';
import { createCostRealization } from '../../services/costService';
import { showToast } from '../../store/uiStore';

interface RapImportWizardProps {
  open: boolean;
  projectId: string;
  recordedBy: string;
  onClose: () => void;
  onImported: () => void;
}

export default function RapImportWizard({
  open,
  projectId,
  recordedBy,
  onClose,
  onImported,
}: RapImportWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRapRow[]>([]);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

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
    setStep('preview');
  };

  const handleImport = async () => {
    if (mode === 'replace' && confirmText !== 'GANTI') {
      showToast('Ketik GANTI untuk mengganti semua RAP', 'error');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'replace') await deleteAllRapItems(projectId);

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.valid) continue;
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
        if (r.actual_amount && r.actual_amount > 0) {
          await createCostRealization({
            project_id: projectId,
            rap_item_id: item.id,
            date: new Date().toISOString().slice(0, 10),
            description: `Import: ${r.name}`,
            quantity: r.actual_qty || r.quantity,
            unit_price: r.unit_price,
            total_amount: r.actual_amount,
            recorded_by: recordedBy,
          });
        }
      }
      showToast(`${rows.filter(r => r.valid).length} item RAP diimpor`, 'success');
      onImported();
      onClose();
      setStep('upload');
      setRows([]);
      setConfirmText('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import gagal', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const validCount = rows.filter(r => r.valid).length;
  const warnCount = rows.filter(r => r.warnings.length).length;

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
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-slate-900">Import RAP Excel</h3>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {step === 'upload' && (
              <>
                <p className="text-sm text-slate-500">Upload file .xlsx/.xls (maks 10MB). Gunakan template untuk format kolom yang benar.</p>
                <button type="button" onClick={downloadRapTemplate} className="text-sm font-bold text-indigo-600">
                  ↓ Unduh template
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full border-2 border-dashed border-indigo-200 rounded-2xl py-12 flex flex-col items-center gap-2 hover:bg-indigo-50/50"
                >
                  <Upload className="w-8 h-8 text-indigo-400" />
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
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode('append')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${mode === 'append' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Tambah (append)</button>
                  <button type="button" onClick={() => setMode('replace')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${mode === 'replace' ? 'bg-rose-600 text-white' : 'bg-slate-100'}`}>Ganti semua</button>
                </div>

                {mode === 'replace' && (
                  <input
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder='Ketik "GANTI" untuk konfirmasi'
                    className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm"
                  />
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
                      {rows.map(r => (
                        <tr key={r.rowIndex} className="border-t">
                          <td className="p-2">{r.rowIndex}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2">{r.quantity}</td>
                          <td className="p-2">
                            {r.errors.length ? '❌' : r.warnings.length ? '⚠️' : '✅'}
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
              <button type="button" onClick={handleImport} disabled={busy || validCount === 0} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Import {validCount} item
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
