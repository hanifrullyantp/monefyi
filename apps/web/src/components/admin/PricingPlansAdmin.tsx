import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { showToast } from '../../store/uiStore';
import { formatPlanPriceIdr, type PricingPlan } from '../../lib/pricingPlans';
import {
  loadAllPricingPlansAdmin,
  upsertPricingPlan,
  updatePricingPlan,
} from '../../services/pricingPlanService';

type DraftPlan = PricingPlan & { featuresText: string };

function toDraft(p: PricingPlan): DraftPlan {
  return { ...p, featuresText: (p.features || []).join('\n') };
}

function emptyDraft(): DraftPlan {
  return {
    slug: '',
    label: '',
    description: '',
    price_monthly_idr: 0,
    projects_per_month: null,
    sort_order: 99,
    is_active: true,
    is_default: false,
    features: [],
    featuresText: '',
  };
}

export default function PricingPlansAdmin() {
  const [plans, setPlans] = useState<DraftPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPlan, setNewPlan] = useState<DraftPlan>(emptyDraft());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await loadAllPricingPlansAdmin();
      setPlans(rows.map(toDraft));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat paket', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePlan = async (draft: DraftPlan) => {
    if (!draft.slug.trim() || !draft.label.trim()) {
      showToast('Slug dan label wajib diisi', 'error');
      return;
    }
    const idKey = draft.id || draft.slug;
    setSavingId(idKey);
    try {
      const features = draft.featuresText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      const payload = {
        slug: draft.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        label: draft.label.trim(),
        description: draft.description?.trim() || null,
        price_monthly_idr: Number(draft.price_monthly_idr) || 0,
        projects_per_month: draft.projects_per_month === null || draft.projects_per_month === ('' as unknown as number)
          ? null
          : Number(draft.projects_per_month),
        sort_order: Number(draft.sort_order) || 0,
        is_active: draft.is_active,
        is_default: draft.is_default,
        features,
      };
      const saved = draft.id
        ? await updatePricingPlan(draft.id, payload)
        : await upsertPricingPlan(payload);
      showToast(`Paket ${saved.label} disimpan`, 'success');
      if (saved.is_default) {
        for (const p of plans) {
          if (p.id && p.id !== saved.id && p.is_default) {
            await updatePricingPlan(p.id, { is_default: false });
          }
        }
      }
      setAdding(false);
      setNewPlan(emptyDraft());
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const patchLocal = (idOrSlug: string, patch: Partial<DraftPlan>) => {
    setPlans(prev => prev.map(p => ((p.id || p.slug) === idOrSlug ? { ...p, ...patch } : p)));
  };

  if (loading && !plans.length) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
        Fallback default di aplikasi: Gratis (2 proyek/bulan), Starter Rp 99.000/bulan, Pro Rp 299.000/bulan.
        Jika tabel kosong atau gagal dimuat, nilai ini dipakai otomatis.
      </div>

      {plans.map(plan => {
        const key = plan.id || plan.slug;
        return (
          <div key={key} className={`bg-white rounded-2xl border p-5 space-y-3 shadow-sm ${plan.is_active ? 'border-[#E5EAE8]' : 'border-[#E5EAE8] opacity-75'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold text-[#0F172A] text-base">{plan.label || plan.slug}</div>
                <div className="text-xs text-[#5B6B7A] font-mono">{plan.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={plan.is_active ? 'Nonaktifkan paket' : 'Aktifkan paket'}
                  onClick={() => patchLocal(key, { is_active: !plan.is_active })}
                  className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-[#E5EAE8] text-xs font-semibold text-[#5B6B7A]"
                  title={plan.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {plan.is_active ? <ToggleRight className="w-5 h-5 text-[#059669]" /> : <ToggleLeft className="w-5 h-5 text-[#5B6B7A]" />}
                  {plan.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
                <button
                  type="button"
                  disabled={savingId === key}
                  onClick={() => savePlan(plan)}
                  className="inline-flex items-center gap-1.5 px-4 min-h-11 bg-[#059669] text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {savingId === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="text-xs font-semibold text-[#5B6B7A]">
                Label
                <input
                  value={plan.label}
                  onChange={e => patchLocal(key, { label: e.target.value })}
                  className="mt-1 w-full px-3.5 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                />
              </label>
              <label className="text-xs font-semibold text-[#5B6B7A]">
                Harga / bulan (IDR)
                <input
                  type="number"
                  min={0}
                  value={plan.price_monthly_idr}
                  onChange={e => patchLocal(key, { price_monthly_idr: Number(e.target.value) })}
                  className="mt-1 w-full px-3.5 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                />
                <span className="text-[#5B6B7A] font-normal text-xs mt-0.5 block">{formatPlanPriceIdr(plan.price_monthly_idr)}</span>
              </label>
              <label className="text-xs font-semibold text-[#5B6B7A]">
                Proyek / bulan (kosong = tanpa batas)
                <input
                  type="number"
                  min={0}
                  value={plan.projects_per_month ?? ''}
                  onChange={e => patchLocal(key, {
                    projects_per_month: e.target.value === '' ? null : Number(e.target.value),
                  })}
                  className="mt-1 w-full px-3.5 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                  placeholder="Tanpa batas"
                />
              </label>
              <label className="text-xs font-semibold text-[#5B6B7A]">
                Urutan
                <input
                  type="number"
                  value={plan.sort_order}
                  onChange={e => patchLocal(key, { sort_order: Number(e.target.value) })}
                  className="mt-1 w-full px-3.5 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                />
              </label>
              <label className="text-xs font-semibold text-[#5B6B7A] sm:col-span-2">
                Deskripsi
                <input
                  value={plan.description || ''}
                  onChange={e => patchLocal(key, { description: e.target.value })}
                  className="mt-1 w-full px-3.5 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                />
              </label>
            </div>

            <label className="text-xs font-semibold text-[#5B6B7A] block">
              Fitur (satu per baris)
              <textarea
                rows={3}
                value={plan.featuresText}
                onChange={e => patchLocal(key, { featuresText: e.target.value })}
                className="mt-1 w-full p-3 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-[#0F172A]">
              <input
                type="checkbox"
                checked={plan.is_default}
                onChange={e => patchLocal(key, { is_default: e.target.checked })}
              />
              Paket default untuk org baru
            </label>
          </div>
        );
      })}

      {adding ? (
        <div className="bg-white rounded-2xl border border-[#059669]/40 p-5 space-y-3 shadow-sm">
          <div className="font-bold text-[#0F172A]">Paket baru</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[#5B6B7A]">
              Slug (unik)
              <input
                value={newPlan.slug}
                onChange={e => setNewPlan(p => ({ ...p, slug: e.target.value }))}
                placeholder="business"
                className="mt-1 w-full px-3.5 h-11 rounded-xl border border-[#E5EAE8] text-sm font-mono text-[#0F172A] focus:outline-none focus:border-[#059669]"
              />
            </label>
            <label className="text-xs font-semibold text-[#5B6B7A]">
              Label
              <input
                value={newPlan.label}
                onChange={e => setNewPlan(p => ({ ...p, label: e.target.value }))}
                className="mt-1 w-full px-3.5 h-11 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
              />
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={savingId === 'new'}
              onClick={() => savePlan(newPlan)}
              className="inline-flex items-center gap-1.5 px-4 min-h-11 bg-[#059669] text-white rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {savingId === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan paket baru
            </button>
            <button type="button" onClick={() => { setAdding(false); setNewPlan(emptyDraft()); }} className="px-4 min-h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#5B6B7A] font-semibold">
              Batal
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 px-4 min-h-11 border border-dashed border-[#E5EAE8] rounded-xl text-sm font-semibold text-[#5B6B7A] hover:bg-white bg-white/50"
        >
          <Plus className="w-4 h-4" /> Tambah paket
        </button>
      )}
    </div>
  );
}
