import { useCallback, useEffect, useState } from 'react';
import { Coins, Loader2, Plus, Trash2 } from 'lucide-react';
import type { Project } from '../../../store/appStore';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import { formatRupiah } from '../../../utils/projectUi';
import {
  buildProjectDividendPreview,
  recordDividendPayouts,
  saveProjectDividendConfig,
  suggestDefaultParties,
} from '../../../services/financeV2/projectDividendService';
import type { DividendConfig, DividendPreviewLine } from '../../../lib/projects/dividend';
import { showToast } from '../../../store/uiStore';

type Props = {
  project: Project;
  normalized: NormalizedProjectView;
  orgId: string;
  userId: string;
  canManage?: boolean;
  onRefresh: () => void | Promise<void>;
};

export default function TabV2Deviden({
  project, normalized, orgId, userId, canManage = true, onRefresh,
}: Props) {
  const [config, setConfig] = useState<DividendConfig>({ parties: [], payouts: [] });
  const [lines, setLines] = useState<DividendPreviewLine[]>([]);
  const [pool, setPool] = useState(0);
  const [ownerPiutang, setOwnerPiutang] = useState(0);
  const [pctTotal, setPctTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);

  const received = normalized.totalPemasukan;
  const spent = normalized.totalRealisasi;
  const contractValue = normalized.project.contractValue;

  const reload = useCallback(async (next?: DividendConfig) => {
    if (!orgId) return;
    setLoading(true);
    try {
      const preview = await buildProjectDividendPreview({
        orgId,
        projectId: project.id,
        received,
        spent,
        contractValue,
        config: next,
      });
      setConfig(preview.config);
      setLines(preview.lines);
      setPool(preview.pool);
      setOwnerPiutang(preview.ownerPiutang);
      setPctTotal(preview.pctTotal);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat deviden', 'error');
    } finally {
      setLoading(false);
    }
  }, [orgId, project.id, received, spent, contractValue]);

  useEffect(() => { void reload(); }, [reload]);

  const persist = async (next: DividendConfig) => {
    setSaving(true);
    try {
      const saved = await saveProjectDividendConfig(project.id, next);
      await reload(saved);
      showToast('Pengaturan deviden disimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateParty = (id: string, patch: Partial<DividendConfig['parties'][number]>) => {
    setConfig(c => ({
      ...c,
      parties: c.parties.map(p => p.id === id ? { ...p, ...patch } : p),
    }));
  };

  const handlePay = async () => {
    if (!canManage) return;
    setPaying(true);
    try {
      await persist(config);
      await recordDividendPayouts({
        orgId,
        projectId: project.id,
        userId,
        received,
        spent,
        contractValue,
      });
      showToast('Deviden dibayarkan. Kas proyek berkurang.', 'success');
      await onRefresh();
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membayar deviden', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-5 h-5 text-amber-600" />
          <h3 className="font-black text-slate-900">Deviden Proyek</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Bagi sisa kas proyek ke pihak yang terlibat, tanpa masuk Kas Bisnis.
          Piutang akun owner dipulihkan ke kolam dulu, lalu dipotong dari jatah owner.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Stat label="Kolam deviden" value={formatRupiah(pool)} />
          <Stat label="Piutang owner (dipulihkan)" value={formatRupiah(ownerPiutang)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800">Pihak & persentase</h4>
          <span className={`text-xs font-bold ${Math.abs(pctTotal - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
            Total {pctTotal}%
          </span>
        </div>
        {config.parties.map(party => (
          <div key={party.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 p-3">
            <input
              value={party.name}
              onChange={e => updateParty(party.id, { name: e.target.value })}
              className="flex-1 min-w-[8rem] px-3 py-2 rounded-lg border text-sm"
              placeholder="Nama pihak"
            />
            <input
              type="number"
              value={party.sharePct}
              onChange={e => updateParty(party.id, { sharePct: Number(e.target.value) || 0 })}
              className="w-20 px-3 py-2 rounded-lg border text-sm"
            />
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <input
                type="checkbox"
                checked={party.isOwner}
                onChange={e => updateParty(party.id, { isOwner: e.target.checked })}
              />
              Owner
            </label>
            {canManage && (
              <button
                type="button"
                onClick={() => setConfig(c => ({ ...c, parties: c.parties.filter(p => p.id !== party.id) }))}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                aria-label="Hapus pihak"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConfig(c => ({
                ...c,
                parties: [...c.parties, { id: `party-${Date.now()}`, name: '', sharePct: 0, isOwner: false }],
              }))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah pihak
            </button>
            <button
              type="button"
              onClick={() => persist(config)}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Menyimpan…' : 'Simpan pengaturan'}
            </button>
            {config.parties.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  const names = [
                    ...new Set([
                      ...normalized.piutangItems.map(i => i.partyName || i.name),
                      ...normalized.hutangItems.map(i => i.partyName || i.name),
                    ]),
                  ].filter(Boolean);
                  void persist(suggestDefaultParties(names.length ? names : ['Owner']));
                }}
                className="px-3 py-2 rounded-xl border text-xs font-bold"
              >
                Isi dari akun hutang/piutang
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
        <h4 className="font-bold text-slate-800">Preview bagi hasil</h4>
        {lines.length === 0 ? (
          <p className="text-sm text-slate-500">Atur pihak dulu untuk melihat pembagian.</p>
        ) : lines.map(line => (
          <div key={line.party.id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between font-bold">
              <span>{line.party.name} ({line.party.sharePct}%)</span>
              <span>{formatRupiah(line.shareAmount)}</span>
            </div>
            {line.offsetPiutang > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Offset piutang owner {formatRupiah(line.offsetPiutang)}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Kas dibayar: {formatRupiah(line.cashDue)}
              {line.alreadyPaid > 0 ? ` · sudah ${formatRupiah(line.alreadyPaid)}` : ''}
              {line.remainingCash > 0 ? ` · sisa ${formatRupiah(line.remainingCash)}` : ''}
            </p>
          </div>
        ))}
        {canManage && lines.some(l => l.remainingCash > 0 || (l.offsetPiutang > 0 && l.alreadyPaid === 0)) && (
          <button
            type="button"
            disabled={paying || Math.abs(pctTotal - 100) > 0.1}
            onClick={() => void handlePay()}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50"
          >
            {paying ? 'Memproses…' : 'Bayar deviden (kas proyek berkurang)'}
          </button>
        )}
      </div>

      {config.payouts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-3">Riwayat pembayaran</h4>
          <div className="divide-y divide-slate-50">
            {config.payouts.map(p => (
              <div key={p.id} className="py-2 flex justify-between text-sm">
                <div>
                  <p className="font-semibold">{p.partyName}</p>
                  <p className="text-xs text-slate-500">{p.date}{p.note ? ` · ${p.note}` : ''}</p>
                </div>
                <p className="font-bold">{formatRupiah(p.cashPaid)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-amber-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-amber-700">{label}</p>
      <p className="font-black text-slate-900">{value}</p>
    </div>
  );
}
