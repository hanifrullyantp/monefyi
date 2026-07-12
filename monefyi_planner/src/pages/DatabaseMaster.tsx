import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Package, Users, LayoutTemplate, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { showToast } from '../store/uiStore';
import { loadRppMaster } from '../services/rpp/masterLoader';
import {
  createMaterial, deleteMaterial, type MaterialInput,
} from '../services/rpp/materialService';
import {
  createWorker, deleteWorker, type WorkerInput,
} from '../services/rpp/workerService';
import { upsertJobTemplates } from '../services/rpp/templateService';
import type { JobTemplate, RppMaterial, RppWorker } from '../types/rpp';
import { formatRupiah } from '../utils/projectUi';
import MaterialAutosuggest from '../components/migration/MaterialAutosuggest';

type Tab = 'materials' | 'workers' | 'templates';

export default function DatabaseMaster() {
  const { tenant } = useAppStore();
  const orgId = tenant?.id || '';
  const [tab, setTab] = useState<Tab>('materials');
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<RppMaterial[]>([]);
  const [workers, setWorkers] = useState<RppWorker[]>([]);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [matForm, setMatForm] = useState<MaterialInput>({ name: '', category: 'Umum', unit: 'Pcs', price: 0 });
  const [workerForm, setWorkerForm] = useState<WorkerInput>({ name: '', level: 'Terampil', rate: 0 });
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const master = await loadRppMaster(orgId);
      setMaterials(master.materials);
      setWorkers(master.workers);
      setTemplates(master.templates);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat database', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void reload(); }, [reload]);

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

  const saveTemplates = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await upsertJobTemplates(orgId, templates);
      showToast('Template disimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal simpan template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'materials', label: 'Material', icon: Package },
    { id: 'workers', label: 'Pekerja', icon: Users },
    { id: 'templates', label: 'Template Job', icon: LayoutTemplate },
  ];

  if (!orgId) {
    return <div className="p-8 text-center text-slate-500">Organisasi belum dipilih.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-black text-slate-900">Database Master</h1>
          <p className="text-sm text-slate-500">Material, pekerja, dan template RAP per organisasi</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${
              tab === t.id ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'border-slate-200 text-slate-600'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : (
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          {tab === 'materials' && (
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
              <button type="button" onClick={addMaterial} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-60">
                <Plus className="w-4 h-4" /> Tambah Material
              </button>
              <div className="divide-y">
                {materials.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.category} · {m.unit} · {formatRupiah(m.price)}</div>
                    </div>
                    <button type="button" onClick={async () => { await deleteMaterial(orgId, m.id); await reload(); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'workers' && (
            <>
              <div className="grid sm:grid-cols-3 gap-2">
                <input value={workerForm.name} onChange={e => setWorkerForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama pekerja" className="px-3 py-2 rounded-xl border text-sm" />
                <input value={workerForm.level} onChange={e => setWorkerForm(f => ({ ...f, level: e.target.value }))} placeholder="Level" className="px-3 py-2 rounded-xl border text-sm" />
                <input type="number" value={workerForm.rate || ''} onChange={e => setWorkerForm(f => ({ ...f, rate: Number(e.target.value) }))} placeholder="Rate/hari" className="px-3 py-2 rounded-xl border text-sm" />
              </div>
              <button type="button" onClick={addWorker} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">
                <Plus className="w-4 h-4" /> Tambah Pekerja
              </button>
              <div className="divide-y">
                {workers.map(w => (
                  <div key={w.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-slate-500">{w.level} · {formatRupiah(w.rate)}/hari</div>
                    </div>
                    <button type="button" onClick={async () => { await deleteWorker(orgId, w.id); await reload(); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'templates' && (
            <>
              <p className="text-sm text-slate-500">{templates.length} template job tersedia untuk wizard create project.</p>
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="p-3 border rounded-xl text-sm">
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.category} · {t.baseUnit} · {t.materials.length} material · {t.workers.length} pekerja</div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={saveTemplates} disabled={saving} className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold">
                <Save className="w-4 h-4" /> Simpan Template ke DB
              </button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
