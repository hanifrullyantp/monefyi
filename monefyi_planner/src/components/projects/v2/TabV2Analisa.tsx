import { useEffect, useState } from 'react';
import {
  Loader2, CheckCircle2, AlertTriangle, AlertOctagon, Info, Wallet, Activity, Calendar,
} from 'lucide-react';
import { analyzeProject, type AnalyzeResult } from '../../../services/analyzeService';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import { formatRupiah } from '../../../utils/projectUi';

type Props = {
  projectId: string;
  normalized: NormalizedProjectView;
};

export default function TabV2Analisa({ projectId, normalized }: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState('');
  const p = normalized.project;
  const rapPct = p.rap.totalRAP > 0 ? (p.rap.realisasi / p.rap.totalRAP) * 100 : 0;
  const isCashDeficit = p.saldo < 0;
  const isOverBudget = p.rap.totalRAP > 0 && p.rap.realisasi > p.rap.totalRAP;
  const isNearBudget = !isOverBudget && p.rap.totalRAP > 0 && rapPct >= 85;
  const dev = p.progress.deviation;
  const isBehindSchedule = p.progress.actual < 100 && dev < -5;

  const computedScore = (() => {
    let score = 85;
    if (isCashDeficit) score -= 25;
    if (isOverBudget) score -= Math.min(25, Math.round(rapPct - 100));
    else if (isNearBudget) score -= 8;
    if (isBehindSchedule) score -= Math.min(25, Math.round(Math.abs(dev) * 0.6));
    else if (dev >= 0) score += 5;
    return Math.max(15, Math.min(100, score));
  })();

  const healthScore = result?.evm
    ? Math.min(100, Math.max(10, Math.round(((result.evm.cpi + result.evm.spi) / 2) * 100)))
    : computedScore;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await analyzeProject(projectId);
        if (!cancelled) setResult(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal analisa');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const scoreColor = healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : '#EF4444';
  const dash = (healthScore / 100) * 314;

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="bg-white rounded-2xl border p-6 text-center shadow-sm">
        <div className="text-xs font-bold uppercase text-slate-400 mb-4">Health Score Project</div>
        <div className="relative inline-flex items-center justify-center mb-4">
          <svg width="120" height="120" viewBox="0 0 120 120" className="rotate-[-90deg]">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="10"
              strokeLinecap="round" strokeDasharray={`${dash} 314`} />
          </svg>
          <div className="absolute text-center">
            <div className="text-3xl font-black text-slate-900">{healthScore}</div>
            <div className="text-[10px] text-slate-400">/ 100</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {isCashDeficit ? (
            <Badge icon={AlertOctagon} color="rose" label="Keuangan: Defisit Kas" />
          ) : isOverBudget ? (
            <Badge icon={AlertOctagon} color="rose" label="Keuangan: Over Budget" />
          ) : isNearBudget ? (
            <Badge icon={AlertTriangle} color="amber" label="Keuangan: Mendekati Batas RAP" />
          ) : (
            <Badge icon={CheckCircle2} color="emerald" label="Keuangan: Sehat" />
          )}

          {p.progress.actual >= 100 ? (
            <Badge icon={CheckCircle2} color="emerald" label="Progress: Selesai 100%" />
          ) : isBehindSchedule ? (
            <Badge icon={AlertTriangle} color="amber" label={`Progress: Terlambat (${dev}%)`} />
          ) : dev > 5 ? (
            <Badge icon={CheckCircle2} color="emerald" label={`Progress: Lebih Cepat (+${dev}%)`} />
          ) : (
            <Badge icon={CheckCircle2} color="emerald" label="Progress: Sesuai Jadwal" />
          )}

          {rapPct > 100 && <Badge icon={AlertOctagon} color="rose" label="RAP: Over Budget" />}
        </div>
      </div>

      <Section title="Analisa Keuangan" icon={Wallet}>
        {isCashDeficit ? (
          <AlertCard
            variant="danger"
            icon={AlertOctagon}
            title="Defisit Kas Operasional Proyek"
            desc={`Pengeluaran (${formatRupiah(p.rap.realisasi)}) melebihi dana masuk (${formatRupiah(normalized.totalPemasukan)}) sebesar ${formatRupiah(Math.abs(p.saldo))}. Segera ajukan penagihan termin ke klien.`}
          />
        ) : p.saldo === 0 && normalized.totalPemasukan === 0 ? (
          <AlertCard
            variant="info"
            icon={Info}
            title="Belum Ada Dana Masuk"
            desc="Proyek belum mencatat penerimaan DP atau termin dari klien."
          />
        ) : (
          <AlertCard
            variant="success"
            icon={CheckCircle2}
            title="Cashflow Proyek Positif"
            desc={`Saldo kas proyek ${formatRupiah(p.saldo)} tersedia dan sehat untuk operasional lapangan.`}
          />
        )}
        {rapPct > 100 ? (
          <AlertCard
            variant="danger"
            icon={AlertOctagon}
            title={`Realisasi Melebihi RAP +${(rapPct - 100).toFixed(0)}%`}
            desc={`Total realisasi ${formatRupiah(p.rap.realisasi)} telah melampaui plafon RAP ${formatRupiah(p.rap.totalRAP)}.`}
          />
        ) : isNearBudget ? (
          <AlertCard
            variant="warning"
            icon={AlertTriangle}
            title={`Serapan Anggaran RAP Mencapai ${rapPct.toFixed(0)}%`}
            desc={`Realisasi ${formatRupiah(p.rap.realisasi)} dari total RAP ${formatRupiah(p.rap.totalRAP)}. Kendalikan sisa belanja.`}
          />
        ) : null}
        {normalized.hutangItems.length > 0 && (
          <AlertCard
            variant="danger"
            icon={AlertOctagon}
            title="Kewajiban / Hutang Proyek Aktif"
            desc={`${normalized.hutangItems[0].name} sebesar ${formatRupiah(normalized.hutangItems[0].amount)}`}
          />
        )}
      </Section>

      <Section title="Analisa Progress" icon={Activity}>
        {p.progress.actual >= 100 ? (
          <AlertCard
            variant="success"
            icon={CheckCircle2}
            title="Pekerjaan Fisik Selesai 100%"
            desc="Seluruh bobot pekerjaan telah selesai. Pastikan berita acara serah terima (BAST) dan pelunasan termin selesai."
          />
        ) : isBehindSchedule ? (
          <AlertCard
            variant="warning"
            icon={AlertTriangle}
            title={`Deviasi Jadwal ${dev}% (Realisasi ${p.progress.actual}% vs Rencana ${p.progress.plan}%)`}
            desc="Beberapa item pekerjaan berada di bawah target jadwal rencana. Pertimbangkan lembur atau penambahan tukang."
          />
        ) : (
          <AlertCard
            variant="success"
            icon={CheckCircle2}
            title={`Progres Sesuai Target (Realisasi ${p.progress.actual}% vs Rencana ${p.progress.plan}%)`}
            desc="Eksekusi pekerjaan lapangan berjalan on-track terhadap jadwal proyek."
          />
        )}
        <AlertCard
          variant="info"
          icon={CheckCircle2}
          title={`${normalized.checkedCount}/${normalized.totalWorkItems} Pos RAP Memiliki Realisasi`}
          desc="Jumlah item anggaran RAP yang sudah memiliki catatan pengeluaran aktual."
        />
      </Section>

      {result?.recommendations?.map((rec, i) => (
        <AlertCard key={i} variant="info" icon={Info} title={rec.title} desc={rec.message} />
      ))}

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800 px-5 py-4 border-b">
          <Calendar className="w-5 h-5 text-slate-500" /> Proyeksi Akhir Project
        </div>
        <div className="p-5 grid sm:grid-cols-3 gap-4 text-center text-sm">
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500">Est. Selesai</div>
            <div className="font-black text-slate-900 mt-1">{p.endDate}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500">Est. Laba</div>
            <div className="font-black text-emerald-600 mt-1">{formatRupiah(p.rap.estLaba)}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-500">Sisa Kontrak</div>
            <div className="font-black text-slate-900 mt-1">{formatRupiah(normalized.sisaKontrak)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-bold text-slate-800 mb-3">
        <Icon className="w-5 h-5 text-slate-500" /> {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Badge({ icon: Icon, color, label }: { icon: typeof CheckCircle2; color: string; label: string }) {
  const cls = color === 'emerald' ? 'bg-emerald-50 text-emerald-700'
    : color === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

function AlertCard({ variant, icon: Icon, title, desc }: {
  variant: 'success' | 'warning' | 'danger' | 'info';
  icon: typeof CheckCircle2;
  title: string;
  desc: string;
}) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    warning: 'bg-amber-50 border-amber-100 text-amber-800',
    danger: 'bg-rose-50 border-rose-100 text-rose-800',
    info: 'bg-blue-50 border-blue-100 text-blue-800',
  };
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${styles[variant]}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <div className="font-bold text-sm">{title}</div>
        <p className="text-xs mt-0.5 opacity-90">{desc}</p>
      </div>
    </div>
  );
}
