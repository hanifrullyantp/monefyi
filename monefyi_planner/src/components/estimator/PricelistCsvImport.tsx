import { useRef, useState } from 'react';
import { Upload, Download, X, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import {
  bulkImportPricelist,
  downloadPricelistTemplate,
  parseCsvPricelistRows,
  type CsvPricelistRow,
} from '../../services/pricelistService';
import { formatRupiahFull } from '../../lib/estimatorFormat';

interface Props {
  orgId: string;
  userId: string;
  onClose: () => void;
  onImported: () => void;
}

export default function PricelistCsvImport({ orgId, userId, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvPricelistRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file: File) => {
    setError('');
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const rows = parseCsvPricelistRows(result.data);
        if (rows.length === 0) {
          setError('Tidak ada baris valid. Pastikan kolom name/nama terisi.');
          setPreview([]);
          return;
        }
        setPreview(rows);
      },
      error: err => setError(err.message),
    });
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    try {
      await bulkImportPricelist(orgId, userId, preview);
      onImported();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Import CSV Pricelist</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <button
            type="button"
            onClick={downloadPricelistTemplate}
            className="inline-flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:text-indigo-800"
          >
            <Download className="w-4 h-4" /> Download template CSV
          </button>

          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Klik atau drag file CSV</p>
            <p className="text-xs text-slate-400 mt-1">Kolom: name/item, product, category, unit, base_cost, margin, selling_price, notes</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          {preview.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 text-xs font-bold text-slate-500">
                Preview: {preview.length} item
              </div>
              <div className="max-h-48 overflow-y-auto">
                {preview.slice(0, 10).map((row, i) => (
                  <div key={i} className="px-3 py-2 border-t border-slate-50 text-sm flex justify-between gap-2">
                    <span className="truncate">{row.name}</span>
                    <span className="text-slate-400 shrink-0">{formatRupiahFull(row.base_cost)}</span>
                  </div>
                ))}
                {preview.length > 10 && (
                  <div className="px-3 py-2 text-xs text-slate-400">+{preview.length - 10} lainnya</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm">
            Batal
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={preview.length === 0 || importing}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            Import {preview.length > 0 ? `(${preview.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
