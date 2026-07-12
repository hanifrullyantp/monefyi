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
    return <div className="p-8 text-center text-slate-500">Organisasi belum dipilih.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Database className="w-7 h-7 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Database Master</h1>
            <p className="text-sm text-slate-500">Master data material, tenaga, alat, vendor, klien & template</p>
          </div>
        </div>
        <div className="relative w-full sm:w-52">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex gap-1 overflow-x-auto px-2 pt-2 border-b border-slate-50">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 ${
                tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : (
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 space-y-4">
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
                    <button key="d" type="button" onClick={async () => { await deleteMaterial(orgId, m.id); await reload(); }} className="text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>,
                  ])}
                />
              </>
            )}

            {tab === 'tenaga' && (
              <>
                <div className="grid sm:grid-cols-3 gap-2">
                  <input value={workerForm.name} onChange={e => setWorkerForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama pekerja" className="px-3 py-2 rounded-xl border text-sm" />
                  <input value={workerForm.level} onChange={e => setWorkerForm(f => ({ ...f, level: e.target.value }))} placeholder="Level" className="px-3 py-2 rounded-xl border text-sm" />
                  <input type="number" value={workerForm.rate || ''} onChange={e => setWorkerForm(f => ({ ...f, rate: Number(e.target.value) }))} placeholder="Rate/hari" className="px-3 py-2 rounded-xl border text-sm" />
                </div>
                <button type="button" onClick={addWorker} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">
                  <Plus className="w-4 h-4" /> Tambah Tenaga
                </button>
                <div className="grid sm:grid-cols-2 gap-3">
                  {workers.filter(w => filter(w.name)).map(w => (
                    <div key={w.id} className="flex items-center gap-3 border rounded-xl p-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Users className="w-5 h-5 text-amber-700" /></div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{w.name}</div>
                        <div className="text-xs text-slate-500">{w.level} · {formatRupiah(w.rate)}/hari</div>
                      </div>
                      <button type="button" onClick={async () => { await deleteWorker(orgId, w.id); await reload(); }} className="text-rose-500 p-2"><Trash2 className="w-4 h-4" /></button>
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
                    <div key={cat} className="border rounded-xl overflow-hidden mb-4">
                      <div className="px-4 py-3 bg-slate-50 font-bold text-sm flex items-center justify-between">
                        <span>{cat}</span>
                        <span className="text-xs font-semibold text-slate-500">{catTemplates.length} template</span>
                      </div>
                      <div className="divide-y">
                        {catTemplates.map(t => (
                          <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-sm">{t.name}</div>
                              <div className="text-xs text-slate-500">Per {t.baseUnit} · {t.materials.length} bahan · {t.workers.length} tenaga</div>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">Biaya {formatRupiah(t.estCostPerUnit || 0)}/unit</span>
                                {t.margin != null && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Margin {t.margin}%</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRapTemplate(t)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Gunakan
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <button type="button" onClick={async () => { setSaving(true); try { await upsertJobTemplates(orgId, templates); showToast('Template disimpan', 'success'); } finally { setSaving(false); } }} className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold">
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
      <div className="grid sm:grid-cols-4 gap-2">
        <MaterialAutosuggest
          value={matForm.name}
          onChange={name => setMatForm(f => ({ ...f, name }))}
          materials={materials}
          onSelectMaterial={m => setMatForm(f => ({ ...f, name: m.name, unit: m.unit, price: m.price, category: m.category }))}
          className="sm:col-span-2"
        />
        <input value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))} placeholder="Satuan" className="px-3 py-2 rounded-xl border text-sm" />
        <input type="number" value={matForm.price || ''} onChange={e => setMatForm(f => ({ ...f, price: Number(e.target.value) }))} placeholder="Harga" className="px-3 py-2 rounded-xl border text-sm" />
      </div>
      <button type="button" onClick={onAdd} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-60">
        <Plus className="w-4 h-4" /> Tambah Bahan
      </button>
    </>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase">
          <tr>{headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50">{row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}</tr>
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
        <input value={name} onChange={e => setName(e.target.value)} placeholder={placeholder} className="flex-1 px-3 py-2 rounded-xl border text-sm" />
        <button type="button" onClick={() => { onAdd(name); setName(''); }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Tambah</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 border rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Icon className="w-5 h-5 text-slate-600" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{item.name}</div>
              <div className="text-xs text-slate-500">{renderMeta(item)}</div>
            </div>
            <button type="button" onClick={() => onRemove(item.id)} className="text-rose-500 p-2"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}
