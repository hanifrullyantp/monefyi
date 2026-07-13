import { useState, type ReactNode } from 'react';
import { X, Plus, ArrowLeftRight } from 'lucide-react';
import ProjectIncomePanel from '../ProjectIncomePanel';
import ProjectTransferPanel from '../ProjectTransferPanel';
import ProjectReceivablePanel from '../ProjectReceivablePanel';
import { createCostRealization } from '../../../services/costService';
import { todayStr } from '../../../lib/adapters';
import { parseMoneyInput } from '../../../utils/projectUi';
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
              onUpdated={async () => { await onUpdated(); onClose(); }}
            />
          )}
          {kind === 'hutang' && (
            <ProjectTransferPanel
              projectId={project.id}
              orgId={orgId}
              userId={userId}
              projects={projects}
              spentAmount={project.spent_amount}
              canManage={canManage}
              onUpdated={async () => { await onUpdated(); onClose(); }}
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
  const [form, setForm] = useState({
    date: todayStr(),
    description: '',
    amount: '',
    supplier: '',
  });

  const handleSubmit = async () => {
    const amount = parseMoneyInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }
    if (!form.description.trim()) {
      showToast('Keterangan wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      await createCostRealization({
        project_id: projectId,
        date: form.date,
        description: form.description.trim(),
        quantity: 1,
        unit_price: amount,
        total_amount: amount,
        supplier: form.supplier.trim() || null,
        rap_item_id: null,
        recorded_by: userId,
      });
      showToast('Biaya tercatat', 'success');
      await onSaved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal simpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Tanggal">
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" />
      </Field>
      <Field label="Keterangan">
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" placeholder="Contoh: Beli semen" />
      </Field>
      <Field label="Nominal (Rp)">
        <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" placeholder="500000" />
      </Field>
      <Field label="Supplier (opsional)">
        <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="w-full px-3 py-2 rounded-xl border text-sm" />
      </Field>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canManage || saving}
        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan Biaya'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export type { ModalKind };
