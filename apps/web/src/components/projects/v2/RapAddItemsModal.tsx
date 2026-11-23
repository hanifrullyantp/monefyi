import { useState, type ReactNode } from 'react';
import { X, Plus, Table2, ClipboardPaste } from 'lucide-react';
import { createRapItem, syncProjectBudgetFromRap } from '../../../services/rapService';
import { parseMoneyInput } from '../../../utils/projectUi';
import { showToast } from '../../../store/uiStore';

type ItemType = 'material' | 'labor';

type ParsedRow = {
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  supplier?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  itemType: ItemType;
  sortOffset: number;
  userId: string;
  onAdded: () => void | Promise<void>;
};

function parsePasteRows(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    const cols = line.includes('\t')
      ? line.split('\t')
      : line.includes(';')
        ? line.split(';')
        : line.split(',');
    if (cols.length < 2) continue;
    const name = cols[0]?.trim();
    if (!name || /^nama|item|material/i.test(name)) continue;
    const unit = (cols[1]?.trim() || 'unit');
    const qty = parseMoneyInput(cols[2]?.trim() || '1') || 1;
    const price = parseMoneyInput(cols[3]?.trim() || '0') || 0;
    const supplier = cols[4]?.trim();
    rows.push({ name, unit, quantity: qty, unit_price: price, supplier });
  }
  return rows;
}

export default function RapAddItemsModal({
  open, onClose, projectId, itemType, sortOffset, userId, onAdded,
}: Props) {
  const [mode, setMode] = useState<'form' | 'paste'>('form');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '', unit: itemType === 'labor' ? 'hari' : 'unit', quantity: '1', unit_price: '', supplier: '',
  });
  const [pasteText, setPasteText] = useState('');

  if (!open) return null;

  const title = itemType === 'material' ? 'Tambah Material' : 'Tambah Tenaga';

  const handleFormSubmit = async () => {
    const qty = parseMoneyInput(form.quantity) || 1;
    const price = parseMoneyInput(form.unit_price);
    if (!form.name.trim()) {
      showToast('Nama item wajib diisi', 'error');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showToast('Harga satuan tidak valid', 'error');
      return;
    }
    setBusy(true);
    try {
      await createRapItem({
        project_id: projectId,
        type: itemType,
        name: form.name.trim(),
        unit: form.unit.trim() || 'unit',
        quantity: qty,
        unit_price: price,
        supplier: form.supplier.trim() || null,
        sort_order: sortOffset,
        updated_by: userId,
      });
      await syncProjectBudgetFromRap(projectId);
      showToast('Item RAP ditambahkan', 'success');
      setForm({ name: '', unit: itemType === 'labor' ? 'hari' : 'unit', quantity: '1', unit_price: '', supplier: '' });
      await onAdded();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah item', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePasteSubmit = async () => {
    const rows = parsePasteRows(pasteText);
    if (!rows.length) {
      showToast('Tidak ada baris valid. Format: Nama | Satuan | Qty | Harga [| Supplier]', 'error');
      return;
    }
    setBusy(true);
    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        await createRapItem({
          project_id: projectId,
          type: itemType,
          name: r.name,
          unit: r.unit,
          quantity: r.quantity,
          unit_price: r.unit_price,
          supplier: r.supplier || null,
          sort_order: sortOffset + i,
          updated_by: userId,
        });
      }
      await syncProjectBudgetFromRap(projectId);
      showToast(`${rows.length} item ditambahkan`, 'success');
      setPasteText('');
      await onAdded();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal import paste', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h3 className="font-black text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setMode('form')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold ${
                mode === 'form' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Form
            </button>
            <button
              type="button"
              onClick={() => setMode('paste')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold ${
                mode === 'paste' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> Paste Excel
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 overflow-y-auto flex-1 space-y-3">
          {mode === 'form' ? (
            <>
              <Field label="Nama item">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="ACP putih" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Satuan">
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl text-sm" />
                </Field>
                <Field label="Volume RAP">
                  <input value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl text-sm" />
                </Field>
              </div>
              <Field label="Harga satuan (Rp)">
                <input value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="190000" />
              </Field>
              {itemType === 'material' && (
                <Field label="Supplier (opsional)">
                  <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl text-sm" />
                </Field>
              )}
              <button
                type="button"
                onClick={() => void handleFormSubmit()}
                disabled={busy}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {busy ? 'Menyimpan…' : 'Tambah Item'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <ClipboardPaste className="w-3.5 h-3.5" />
                Copy dari Excel (Ctrl+C) lalu paste di bawah. Kolom: Nama, Satuan, Qty, Harga, Supplier.
              </p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={10}
                placeholder={'ACP putih\tkpg\t29\t190000\nACP asphalt\tkpg\t9\t200000'}
                className="w-full px-3 py-2 border rounded-xl text-xs font-mono resize-y min-h-[160px]"
              />
              {pasteText.trim() && (
                <p className="text-xs text-slate-600">
                  {parsePasteRows(pasteText).length} baris terdeteksi
                </p>
              )}
              <button
                type="button"
                onClick={() => void handlePasteSubmit()}
                disabled={busy}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {busy ? 'Mengimpor…' : 'Import Baris'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
