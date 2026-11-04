import { useEffect, useState, type ReactNode } from 'react';
import { X, Plus, ArrowLeftRight } from 'lucide-react';
import ProjectIncomePanel from '../ProjectIncomePanel';
import ProjectTransferPanel from '../ProjectTransferPanel';
import ProjectReceivablePanel from '../ProjectReceivablePanel';
import ProjectPayablePanel from '../ProjectPayablePanel';
import { createCostRealization } from '../../../services/costService';
import { loadRapItems, type RapItem } from '../../../services/rapService';
import { todayStr } from '../../../lib/adapters';
import { formatRupiah, parseMoneyInput } from '../../../utils/projectUi';
import { showToast } from '../../../store/uiStore';
import { useAppStore, type Project } from '../../../store/appStore';

type ModalKind = 'income' | 'cost' | 'transfer' | 'receivable' | 'hutang' | null;

export type { ModalKind };

type Props = {
  open: boolean;
  kind: ModalKind;
  onClose: () => void;
  project: Project;
  orgId: string;
  userId: string;
  canManage: boolean;
  onUpdated: () => void | Promise<void>;
};

export default function ProjectTransactionModals({
  open, kind, onClose, project, orgId, userId, canManage, onUpdated,
}: Props) {
  const { projects } = useAppStore();
  if (!open || !kind) return null;

  const title = kind === 'income' ? 'Tambah Pemasukan'
    : kind === 'cost' ? 'Tambah Biaya'
      : kind === 'receivable' ? 'Piutang & Pembayaran'
        : kind === 'hutang' ? 'Hutang Project'
          : 'Transfer Dana';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2 font-bold">
            {kind === 'transfer' ? <ArrowLeftRight className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
            {title}
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {kind === 'income' && (
            <ProjectIncomePanel
              projectId={project.id}
              orgId={orgId}
              userId={userId}
              budget={project.total_budget_planned}
              canManage={canManage}
              onUpdated={async () => { await onUpdated(); onClose(); }}
            />
          )}
          {kind === 'cost' && (
            <QuickCostForm
              projectId={project.id}
              userId={userId}
              canManage={canManage}
              onSaved={async () => { await onUpdated(); onClose(); }}
            />
          )}
          {kind === 'transfer' && (
            <ProjectTransferPanel
              projectId={project.id}
              orgId={orgId}
              userId={userId}
              projects={projects}
              spentAmount={project.spent_amount}
              canManage={canManage}
              onUpdated={onUpdated}
            />
          )}
          {kind === 'receivable' && (
            <ProjectReceivablePanel
              projectId={project.id}
              projectName={project.name}
              orgId={orgId}
              userId={userId}
              canManage={canManage}
              onUpdated={onUpdated}
            />
          )}
          {kind === 'hutang' && (
            <ProjectPayablePanel
              projectId={project.id}
              projectName={project.name}
              orgId={orgId}
              userId={userId}
              canManage={canManage}
              onUpdated={onUpdated}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function QuickCostForm({
  projectId, userId, canManage, onSaved,
}: {
  projectId: string;
  userId: string;
  canManage: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [rapItems, setRapItems] = useState<RapItem[]>([]);
  const [form, setForm] = useState({
    date: todayStr(),
    rapItemId: '',
    costKind: 'material' as 'material' | 'labor',
    description: '',
    quantity: '1',
    amount: '',
    supplier: '',
  });

  useEffect(() => {
    void loadRapItems(projectId)
      .then(setRapItems)
      .catch(() => setRapItems([]));
  }, [projectId]);

  const handleSelectRap = (rapId: string) => {
    const selected = rapItems.find(r => r.id === rapId);
    if (!selected) {
      setForm(f => ({ ...f, rapItemId: '' }));
      return;
    }
    const qty = Number(form.quantity) > 0 ? Number(form.quantity) : Number(selected.quantity) || 1;
    const unitPrice = Number(selected.unit_price) || 0;
    setForm(f => ({
      ...f,
      rapItemId: rapId,
      costKind: selected.type === 'labor' ? 'labor' : 'material',
      description: f.description.trim() || `Realisasi: ${selected.name}`,
      quantity: String(qty),
      amount: unitPrice > 0 ? String(Math.round(qty * unitPrice)) : f.amount,
      supplier: f.supplier.trim() || selected.supplier || '',
    }));
  };

  const handleSubmit = async () => {
    const amount = parseMoneyInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }
    const rawDesc = form.description.trim();
    if (!rawDesc) {
      showToast('Keterangan wajib diisi', 'error');
      return;
    }
    const qty = Math.max(0.01, Number(form.quantity) || 1);
    const unitPrice = Math.round(amount / qty);
    const description =
      !form.rapItemId && form.costKind === 'labor' && !/\b(upah|tukang|gaji|mandor|pekerja|borongan|jasa)\b/i.test(rawDesc)
        ? `Upah Tukang: ${rawDesc}`
        : rawDesc;

    setSaving(true);
    try {
      await createCostRealization({
        project_id: projectId,
        date: form.date,
        description,
        quantity: qty,
        unit_price: unitPrice,
        total_amount: amount,
        supplier: form.supplier.trim() || null,
        rap_item_id: form.rapItemId || null,
        recorded_by: userId,
      });
      showToast('Biaya proyek tercatat', 'success');
      await onSaved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal simpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal">
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" />
        </Field>
        <Field label="Jenis Biaya">
          <select
            value={form.costKind}
            onChange={e => setForm(f => ({ ...f, costKind: e.target.value as 'material' | 'labor' }))}
            className="w-full px-3 py-2 rounded-xl border text-sm bg-white"
          >
            <option value="material">Bahan / Material / Alat</option>
            <option value="labor">Upah Tukang / Jasa</option>
          </select>
        </Field>
      </div>
      {rapItems.length > 0 && (
        <Field label="Pos Item RAP (Disarankan)">
          <select
            value={form.rapItemId}
            onChange={e => handleSelectRap(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm bg-white"
          >
            <option value="">— Tanpa Pos RAP Spesifik (Biaya Umum) —</option>
            {rapItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.quantity} {item.unit} × {formatRupiah(Number(item.unit_price) || 0)})
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Keterangan">
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" placeholder="Contoh: Beli semen 10 sak / Upah harian tukang" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Qty">
          <input type="number" min="0.01" step="any" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" placeholder="1" />
        </Field>
        <div className="col-span-2">
          <Field label="Total Nominal (Rp)">
            <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" placeholder="500000" />
          </Field>
        </div>
      </div>
      <Field label="Supplier / Penerima (opsional)">
        <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" placeholder="Contoh: TB Sinar Jaya / Mandor Budi" />
      </Field>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canManage || saving}
        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan Biaya Proyek'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
