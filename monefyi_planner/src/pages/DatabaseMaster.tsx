import { useCallback, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Package, Users, Wrench, Store, UserCircle, LayoutTemplate,
  Loader2, Plus, Trash2, Save, Search, Sparkles,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { showToast } from '../store/uiStore';
import { loadRppMaster } from '../services/rpp/masterLoader';
import { createMaterial, deleteMaterial, type MaterialInput } from '../services/rpp/materialService';
import { createWorker, deleteWorker, type WorkerInput } from '../services/rpp/workerService';
import { upsertJobTemplates, upsertDatabaseMeta } from '../services/rpp/templateService';
import { loadPricelistItems, createPricelistItem, calcPricelistSelling } from '../services/pricelistService';
import type { DatabaseMeta, JobTemplate, RppMaterial, RppWorker } from '../types/rpp';
import { formatRupiah } from '../utils/projectUi';
import MaterialAutosuggest from '../components/migration/MaterialAutosuggest';
import { useShellStore } from '../store/shellStore';
import GenerateRapFromTemplateModal from '../components/migration/GenerateRapFromTemplateModal';

type Tab = 'bahan' | 'tenaga' | 'alat' | 'vendor' | 'klien' | 'template';

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: 'bahan', label: 'Bahan', icon: Package },
  { id: 'tenaga', label: 'Tenaga', icon: Users },
  { id: 'alat', label: 'Alat', icon: Wrench },
  { id: 'vendor', label: 'Vendor', icon: Store },
  { id: 'klien', label: 'Klien', icon: UserCircle },
  { id: 'template', label: 'Template', icon: LayoutTemplate },
];

export default function DatabaseMaster() {
  const { tenant } = useAppStore();
  const { setShellMeta, clearShellMeta } = useShellStore();
  const orgId = tenant?.id || '';
  const [tab, setTab] = useState<Tab>('bahan');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<RppMaterial[]>([]);
  const [workers, setWorkers] = useState<RppWorker[]>([]);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [meta, setMeta] = useState<DatabaseMeta>({ tools: [], vendors: [], clients: [] });
  const [matForm, setMatForm] = useState<MaterialInput>({ name: '', category: 'Umum', unit: 'Pcs', price: 0 });
  const [workerForm, setWorkerForm] = useState<WorkerInput>({ name: '', level: 'Terampil', rate: 0 });
  const [saving, setSaving] = useState(false);
  const [syncingPricelist, setSyncingPricelist] = useState(false);
  const [rapTemplate, setRapTemplate] = useState<JobTemplate | null>(null);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const master = await loadRppMaster(orgId);
      setMaterials(master.materials);
      setWorkers(master.workers);
      setTemplates(master.templates);
      setMeta(master.meta);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat database', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    setShellMeta({ breadcrumb: [{ label: 'Database Master' }] });
    return () => clearShellMeta();
  }, [setShellMeta, clearShellMeta]);

  const saveMeta = async (next: DatabaseMeta) => {
    if (!orgId) return;
    await upsertDatabaseMeta(orgId, next);
    setMeta(next);
  };

  const q = search.toLowerCase();
  const filter = (s: string) => !q || s.toLowerCase().includes(q);

  const addMaterial = async () => {
    if (!orgId || !matForm.name.trim()) return;
    setSaving(true);
    try {
      await createMaterial(orgId, matForm);
      setMatForm({ name: '', category: 'Umum', unit: 'Pcs', price: 0 });
      await reload();
      showToast('Material ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal simpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const syncWithEstimatorPricelist = async () => {
    if (!orgId || syncingPricelist) return;
    setSyncingPricelist(true);
    try {
      const [master, plItems] = await Promise.all([
        loadRppMaster(orgId),
        loadPricelistItems(orgId, false),
      ]);
      const matNames = new Set(master.materials.map(m => m.name.trim().toLowerCase()));
      const workerNames = new Set(master.workers.map(w => w.name.trim().toLowerCase()));
      const plNames = new Set(plItems.map(p => p.name.trim().toLowerCase()));

      let importedToMaster = 0;
      let exportedToPricelist = 0;

      for (const pl of plItems) {
        const key = pl.name.trim().toLowerCase();
        if (!key) continue;
        if (pl.category === 'material' && !matNames.has(key)) {
          await createMaterial(orgId, {
            name: pl.name.trim(),
            category: 'Pricelist',
            unit: pl.unit || 'Pcs',
            price: Number(pl.base_cost) || Number(pl.selling_price) || 0,
          });
          matNames.add(key);
          importedToMaster++;
        } else if (pl.category === 'upah' && !workerNames.has(key)) {
          await createWorker(orgId, {
            name: pl.name.trim(),
            level: 'Terampil',
            rate: Number(pl.base_cost) || Number(pl.selling_price) || 0,
          });
          workerNames.add(key);
          importedToMaster++;
        }
      }

      for (const m of master.materials) {
        const key = m.name.trim().toLowerCase();
        if (!key || plNames.has(key)) continue;
        const baseCost = Number(m.price) || 0;
        await createPricelistItem({
          org_id: orgId,
          name: m.name.trim(),
          category: 'material',
          unit: m.unit || 'pcs',
          base_cost: baseCost,
          default_margin_pct: 20,
          selling_price: calcPricelistSelling(baseCost, 20),
          supplier: m.vendor || null,
          notes: null,
          is_active: true,
        });
        plNames.add(key);
        exportedToPricelist++;
      }

      for (const w of master.workers) {
        const key = w.name.trim().toLowerCase();
        if (!key || plNames.has(key)) continue;
        const baseCost = Number(w.rate) || 0;
        await createPricelistItem({
          org_id: orgId,
          name: w.name.trim(),
          category: 'upah',
          unit: 'hari',
          base_cost: baseCost,
          default_margin_pct: 20,
          selling_price: calcPricelistSelling(baseCost, 20),
          supplier: null,
          notes: w.level || null,
          is_active: true,
        });
        plNames.add(key);
        exportedToPricelist++;
      }

      await reload();
      showToast(
        `Sinkron selesai: +${importedToMaster} ke Master, +${exportedToPricelist} ke Pricelist Estimator`,
        'success',
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal sinkronisasi pricelist', 'error');
    } finally {
      setSyncingPricelist(false);
    }
  };

  const addWorker = async () => {
    if (!orgId || !workerForm.name.trim()) return;
    setSaving(true);
    try {
      await createWorker(orgId, workerForm);
      setWorkerForm({ name: '', level: 'Terampil', rate: 0 });
      await reload();
      showToast('Pekerja ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal simpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addMetaItem = async (kind: 'tools' | 'vendors' | 'clients', name: string) => {
    if (!name.trim()) return;
    const id = Date.now();
    const next = { ...meta };
    if (kind === 'tools') {
      next.tools = [...(next.tools || []), { id, name, type: 'owned', condition: 'Baik' }];
    } else if (kind === 'vendors') {
      next.vendors = [...(next.vendors || []), { id, name, category: 'Umum' }];
    } else {
      next.clients = [...(next.clients || []), { id, name }];
    }
    try {
      await saveMeta(next);
      showToast('Data ditambahkan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal simpan', 'error');
    }
  };

  const removeMetaItem = async (kind: 'tools' | 'vendors' | 'clients', id: number) => {
    const next = { ...meta };
    if (kind === 'tools') next.tools = (next.tools || []).filter(t => t.id !== id);
    if (kind === 'vendors') next.vendors = (next.vendors || []).filter(v => v.id !== id);
    if (kind === 'clients') next.clients = (next.clients || []).filter(c => c.id !== id);
    try {
      await saveMeta(next);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal hapus', 'error');
    }
  };

  if (!orgId) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center p-8 text-center text-[#5B6B7A]">
        Organisasi belum dipilih.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5] pb-24 md:pb-12 text-[#0F172A]">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-[#059669]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#0F172A]">Database Master</h1>
              <p className="text-xs sm:text-sm text-[#5B6B7A]">Master data material, tenaga, alat, vendor, klien & template</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={syncWithEstimatorPricelist}
              disabled={syncingPricelist}
              className="min-h-11 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-bold hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              {syncingPricelist ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {syncingPricelist ? 'Menyinkronkan...' : 'Sinkron Pricelist Estimator'}
            </button>
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari data master..."
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#E5EAE8] bg-white text-sm text-[#0F172A] placeholder:text-[#8A99A6] focus:border-[#059669] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Segmented Pill Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-11 flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap border transition-all ${
                tab === t.id
                  ? 'bg-[#059669] text-white border-[#059669] shadow-sm'
                  : 'bg-white text-[#5B6B7A] border-[#E5EAE8] hover:bg-slate-50'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[20px] border border-[#E5EAE8] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#059669]" /></div>
          ) : (
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 space-y-5">
              {tab === 'bahan' && (
                <>
                  <AddMaterialRow matForm={matForm} setMatForm={setMatForm} materials={materials} onAdd={addMaterial} saving={saving} />
                  <DataTable
                    headers={['Nama', 'Kategori', 'Satuan', 'Harga', '']}
                    rows={materials.filter(m => filter(m.name)).map(m => [
                      m.name,
                      m.category,
                      m.unit,
                      formatRupiah(m.price),
                      <button key="d" type="button" aria-label="Hapus bahan" onClick={async () => { await deleteMaterial(orgId, m.id); await reload(); }} className="min-w-10 min-h-10 inline-flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>,
                    ])}
                  />
                </>
              )}

              {tab === 'tenaga' && (
                <>
                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <input value={workerForm.name} onChange={e => setWorkerForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama pekerja" className="h-11 px-3.5 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:border-[#059669] focus:outline-none" />
                    <input value={workerForm.level} onChange={e => setWorkerForm(f => ({ ...f, level: e.target.value }))} placeholder="Level (mis. Tukang, Mandor)" className="h-11 px-3.5 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:border-[#059669] focus:outline-none" />
                    <input type="number" value={workerForm.rate || ''} onChange={e => setWorkerForm(f => ({ ...f, rate: Number(e.target.value) }))} placeholder="Rate/hari (Rp)" className="h-11 px-3.5 rounded-xl border border-[#E5EAE8] text-sm text-[#0F172A] focus:border-[#059669] focus:outline-none" />
                  </div>
                  <button type="button" onClick={addWorker} disabled={saving} className="min-h-11 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">
                    <Plus className="w-4 h-4" /> Tambah Tenaga
                  </button>
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    {workers.filter(w => filter(w.name)).map(w => (
                      <div key={w.id} className="flex items-center gap-3 bg-white border border-[#E5EAE8] rounded-2xl p-4 shadow-sm">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-amber-700" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-[#0F172A] truncate">{w.name}</div>
                          <div className="text-xs text-[#5B6B7A]">{w.level} · {formatRupiah(w.rate)}/hari</div>
                        </div>
                        <button type="button" aria-label="Hapus pekerja" onClick={async () => { await deleteWorker(orgId, w.id); await reload(); }} className="min-w-10 min-h-10 inline-flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tab === 'alat' && (
                <MetaList
                  items={(meta.tools || []).filter(t => filter(t.name))}
                  icon={Wrench}
                  placeholder="Nama alat"
                  onAdd={name => addMetaItem('tools', name)}
                  onRemove={id => removeMetaItem('tools', id)}
                  renderMeta={t => `${t.type === 'owned' ? 'Milik' : 'Sewa'}${t.condition ? ` · ${t.condition}` : ''}`}
                />
              )}

              {tab === 'vendor' && (
                <MetaList
                  items={(meta.vendors || []).filter(v => filter(v.name))}
                  icon={Store}
                  placeholder="Nama vendor"
                  onAdd={name => addMetaItem('vendors', name)}
                  onRemove={id => removeMetaItem('vendors', id)}
                  renderMeta={v => v.category || 'Umum'}
                />
              )}

              {tab === 'klien' && (
                <MetaList
                  items={(meta.clients || []).filter(c => filter(c.name))}
                  icon={UserCircle}
                  placeholder="Nama klien"
                  onAdd={name => addMetaItem('clients', name)}
                  onRemove={id => removeMetaItem('clients', id)}
                  renderMeta={() => 'Klien'}
                />
              )}

              {tab === 'template' && (
                <>
                  {['Interior', 'Konstruksi', 'Renovasi'].map(cat => {
                    const catTemplates = templates.filter(t => t.category === cat && filter(t.name));
                    if (!catTemplates.length && q) return null;
                    return (
                      <div key={cat} className="border border-[#E5EAE8] rounded-2xl overflow-hidden mb-4 shadow-sm">
                        <div className="px-4 py-3 bg-[#F4F7F5] font-bold text-sm text-[#0F172A] flex items-center justify-between border-b border-[#E5EAE8]">
                          <span>{cat}</span>
                          <span className="text-xs font-semibold text-[#5B6B7A]">{catTemplates.length} template</span>
                        </div>
                        <div className="divide-y divide-[#E5EAE8] bg-white">
                          {catTemplates.map(t => (
                            <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="font-bold text-sm text-[#0F172A]">{t.name}</div>
                                <div className="text-xs text-[#5B6B7A]">Per {t.baseUnit} · {t.materials.length} bahan · {t.workers.length} tenaga</div>
                                <div className="flex gap-2 mt-2">
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-[#5B6B7A] font-medium">Biaya {formatRupiah(t.estCostPerUnit || 0)}/unit</span>
                                  {t.margin != null && <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#059669] font-medium">Margin {t.margin}%</span>}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setRapTemplate(t)}
                                className="min-h-11 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Gunakan
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button type="button" onClick={async () => { setSaving(true); try { await upsertJobTemplates(orgId, templates); showToast('Template disimpan', 'success'); } finally { setSaving(false); } }} className="min-h-11 flex items-center gap-2 px-4 py-2.5 border border-[#E5EAE8] bg-white hover:bg-slate-50 rounded-xl text-sm font-bold text-[#0F172A] transition-colors">
                    <Save className="w-4 h-4" /> Simpan Template ke DB
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>

        {rapTemplate && (
          <GenerateRapFromTemplateModal
            template={rapTemplate}
            onClose={() => setRapTemplate(null)}
          />
        )}
      </div>
    </div>
  );
}

function AddMaterialRow({
  matForm, setMatForm, materials, onAdd, saving,
}: {
  matForm: MaterialInput;
  setMatForm: Dispatch<SetStateAction<MaterialInput>>;
  materials: RppMaterial[];
  onAdd: () => void;
  saving: boolean;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-4 gap-2.5">
        <MaterialAutosuggest
          value={matForm.name}
          onChange={name => setMatForm(f => ({ ...f, name }))}
          materials={materials}
          onSelectMaterial={m => setMatForm(f => ({ ...f, name: m.name, unit: m.unit, price: m.price, category: m.category }))}
          className="sm:col-span-2"
        />
        <input value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))} placeholder="Satuan" className="h-11 px-3.5 rounded-xl border border-[#E5EAE8] bg-white text-sm text-[#0F172A] focus:border-[#059669] focus:outline-none" />
        <input type="number" value={matForm.price || ''} onChange={e => setMatForm(f => ({ ...f, price: Number(e.target.value) }))} placeholder="Harga (Rp)" className="h-11 px-3.5 rounded-xl border border-[#E5EAE8] bg-white text-sm text-[#0F172A] focus:border-[#059669] focus:outline-none" />
      </div>
      <button type="button" onClick={onAdd} disabled={saving} className="min-h-11 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 shadow-sm transition-colors">
        <Plus className="w-4 h-4" /> Tambah Bahan
      </button>
    </>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E5EAE8]">
      <table className="w-full text-sm">
        <thead className="bg-[#F4F7F5] text-left text-xs font-bold text-[#5B6B7A] uppercase">
          <tr>{headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#E5EAE8] bg-white">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50">{row.map((cell, j) => <td key={j} className="px-4 py-3 text-[#0F172A]">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetaList({
  items, icon: Icon, placeholder, onAdd, onRemove, renderMeta,
}: {
  items: Array<{ id: number; name: string }>;
  icon: typeof Wrench;
  placeholder: string;
  onAdd: (name: string) => void;
  onRemove: (id: number) => void;
  renderMeta: (item: { id: number; name: string }) => string;
}) {
  const [name, setName] = useState('');
  return (
    <>
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder={placeholder} className="flex-1 h-11 px-3.5 rounded-xl border border-[#E5EAE8] bg-white text-sm text-[#0F172A] focus:border-[#059669] focus:outline-none" />
        <button type="button" onClick={() => { onAdd(name); setName(''); }} className="min-h-11 px-5 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">Tambah</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 pt-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 bg-white border border-[#E5EAE8] rounded-2xl p-4 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-slate-600" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-[#0F172A] truncate">{item.name}</div>
              <div className="text-xs text-[#5B6B7A]">{renderMeta(item)}</div>
            </div>
            <button type="button" aria-label="Hapus item" onClick={() => onRemove(item.id)} className="min-w-10 min-h-10 inline-flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}
