import { useState, useEffect } from 'react';
import { Loader2, FlaskConical } from 'lucide-react';
import {
  loadMigrationFlags,
  setMigrationFlags,
  FLAG_KEYS,
} from '../../lib/migrationFlags';
import type { MigrationFlags } from '../../types/rpp';
import { showToast } from '../../store/uiStore';

const FLAG_LABELS: Record<keyof MigrationFlags, { title: string; desc: string }> = {
  database_master: {
    title: 'Database Master',
    desc: 'Halaman /app/database untuk CRUD material, pekerja, template.',
  },
  create_project_smart: {
    title: 'Create Project Cerdas',
    desc: 'Wizard step 3: draft RAP dari template job.',
  },
  finance_dashboard_v2: {
    title: 'Neraca Diagnosa V2',
    desc: 'Badge balance + modal diagnosa di Finance V2 dashboard.',
  },
  project_view_v2: {
    title: 'Project View V2',
    desc: 'Tampilan 6-tab parallel dengan Command Center.',
  },
};

type Props = {
  userId: string;
};

export default function MigrationDeveloperPanel({ userId }: Props) {
  const [flags, setFlags] = useState<MigrationFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setFlags(await loadMigrationFlags(userId));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat flags', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [userId]);

  const toggle = async (key: keyof MigrationFlags) => {
    if (!flags) return;
    setSaving(true);
    try {
      const next = await setMigrationFlags(userId, { [key]: !flags[key] });
      setFlags(next);
      showToast(`${FLAG_LABELS[key].title} ${next[key] ? 'aktif' : 'nonaktif'}`, 'success');
      window.dispatchEvent(new CustomEvent('monefyi:migration-flags-changed', { detail: next }));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !flags) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat feature flags...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-violet-600" />
        <h3 className="font-bold text-slate-800">Sandbox Migration Flags</h3>
      </div>
      <p className="text-sm text-slate-500">
        Toggle fitur migrasi sandbox → production. Hanya owner. Matikan flag untuk rollback instan.
      </p>
      <div className="space-y-2">
        {FLAG_KEYS.map(key => (
          <label
            key={key}
            className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={Boolean(flags?.[key])}
              disabled={saving}
              onChange={() => toggle(key)}
              className="mt-1 rounded border-slate-300 text-emerald-600"
            />
            <div>
              <div className="font-semibold text-sm text-slate-800">{FLAG_LABELS[key].title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{FLAG_LABELS[key].desc}</div>
              <code className="text-[10px] text-slate-400">{key}</code>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
